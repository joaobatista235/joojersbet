import type { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { calculateScore } from "@/lib/scoring";
import { syncMatchesFromApi } from "@/lib/matches-sync";

export const runtime = "nodejs";

const EXPECTED_SECRET = process.env.SYNC_SECRET ?? "dev";

interface RawMatch {
  id: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  homeTeam: string;
  awayTeam: string;
  leagueId?: number;
  scoredAt?: unknown;
}

interface RawPrediction {
  id: string;
  userId: string;
  matchId: string;
  homeGoals: number;
  awayGoals: number;
}

interface UserAccumulator {
  totalPoints: number;
  totalPredictions: number;
  correctPredictions: number;
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-sync-secret") ?? "";
  if (secret !== EXPECTED_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!adminDb) {
    return Response.json(
      { error: "Firestore não configurado" },
      { status: 500 }
    );
  }

  try {
    const syncedCount = await syncMatchesFromApi();

    const matchesSnap = await adminDb.collection("matches").limit(1000).get();

    const unprocessed = matchesSnap.docs
      .filter((d) => !d.data().scoredAt)
      .map((d) => ({ id: d.id, ...d.data() } as RawMatch))
      .filter((match) => {
        const hasFinalScore =
          match.homeScore !== null &&
          match.awayScore !== null &&
          match.homeScore !== undefined &&
          match.awayScore !== undefined;

        const missingFinishedState =
          match.status !== "FINISHED" &&
          match.status !== "LIVE" &&
          match.status !== "UPCOMING" &&
          match.status !== "OTHER";

        return match.status === "FINISHED" || hasFinalScore || missingFinishedState;
      });

    if (unprocessed.length === 0) {
      return Response.json({ ok: true, processed: 0, message: "Nada a processar" });
    }

    let totalProcessed = 0;
    const affectedUsers = new Map<string, UserAccumulator>();

    for (const match of unprocessed) {
      const hasFinalScore =
        match.homeScore !== null &&
        match.awayScore !== null &&
        match.homeScore !== undefined &&
        match.awayScore !== undefined;

      if (!hasFinalScore) continue;

      const matchRef = adminDb.collection("matches").doc(match.id);
      const statusUpdate = match.status === "FINISHED" ? {} : { status: "FINISHED" };

      const realHome = match.homeScore as number;
      const realAway = match.awayScore as number;

      const predsSnap = await adminDb
        .collection("predictions")
        .where("matchId", "==", match.id)
        .get();

      if (predsSnap.empty) {
        await matchRef.update({
          ...statusUpdate,
          scoredAt: FieldValue.serverTimestamp(),
        });
        continue;
      }

      const preds = predsSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as RawPrediction)
      );

      const batch = adminDb.batch();

      for (const pred of preds) {
        const scoring = calculateScore({
          predHome: pred.homeGoals,
          predAway: pred.awayGoals,
          realHome,
          realAway,
        });

        const resultId = `${match.id}_${pred.userId}`;
        const resultRef = adminDb.collection("predictionResults").doc(resultId);
        batch.set(resultRef, {
          predictionId: pred.id,
          userId: pred.userId,
          matchId: match.id,
          category: "futebol",
          leagueId: match.leagueId ?? null,
          homeScore: realHome,
          awayScore: realAway,
          homeGoals: pred.homeGoals,
          awayGoals: pred.awayGoals,
          exactScore: scoring.exactScore,
          correctGoalDiff: scoring.correctGoalDiff,
          correctWinner: scoring.correctWinner,
          pointsEarned: scoring.pointsEarned,
          processedAt: FieldValue.serverTimestamp(),
        });

        if (scoring.pointsEarned > 0) {
          const userSnap = await adminDb.collection("users").doc(pred.userId).get();
          if (userSnap.exists) {
            const userData = userSnap.data()!;
            let message = "";
            if (scoring.exactScore) {
              message = `acertou o placar exato de ${match.homeTeam} × ${match.awayTeam} — ${match.homeScore}×${match.awayScore}`;
            } else if (scoring.correctGoalDiff) {
              message = `acertou o saldo de gols de ${match.homeTeam} × ${match.awayTeam}`;
            } else {
              message = `acertou o vencedor de ${match.homeTeam} × ${match.awayTeam}`;
            }

            const feedId = `${match.id}_${pred.userId}_score`;
            batch.set(adminDb.collection("feedEvents").doc(feedId), {
              userId: pred.userId,
              user: userData.name || "Jogador",
              initials: userData.initials || "?",
              avatarColor: userData.avatarColor || "#f97316",
              message,
              createdAt: FieldValue.serverTimestamp(),
            });
          }
        }

        const predRef = adminDb.collection("predictions").doc(pred.id);
        batch.update(predRef, { locked: true });

        const acc = affectedUsers.get(pred.userId) ?? {
          totalPoints: 0,
          totalPredictions: 0,
          correctPredictions: 0,
        };
        acc.totalPoints += scoring.pointsEarned;
        acc.totalPredictions += 1;
        if (scoring.correctWinner) acc.correctPredictions += 1;
        affectedUsers.set(pred.userId, acc);
      }

      batch.update(matchRef, {
        ...statusUpdate,
        scoredAt: FieldValue.serverTimestamp(),
      });

      await batch.commit();
      totalProcessed++;
    }

    for (const [uid] of affectedUsers) {
      const allResultsSnap = await adminDb
        .collection("predictionResults")
        .where("userId", "==", uid)
        .get();

      let totalPoints = 0;
      let totalPredictions = 0;
      let correctPredictions = 0;
      const categories: Record<string, { geral: { totalPoints: number; totalPredictions: number; correctPredictions: number; accuracy?: number }; leagues: Record<string, { totalPoints: number; totalPredictions: number; correctPredictions: number; accuracy?: number }> }> = {};

      for (const r of allResultsSnap.docs) {
        const d = r.data();
        const pts = d.pointsEarned ?? 0;
        const isCorrect = d.correctWinner ? 1 : 0;

        totalPoints += pts;
        totalPredictions += 1;
        if (d.correctWinner) correctPredictions += 1;

        const cat = d.category || "futebol";
        const league = d.leagueId || "others";

        if (!categories[cat]) categories[cat] = { geral: { totalPoints: 0, totalPredictions: 0, correctPredictions: 0 }, leagues: {} };
        if (!categories[cat].leagues[league]) categories[cat].leagues[league] = { totalPoints: 0, totalPredictions: 0, correctPredictions: 0 };

        categories[cat].geral.totalPoints += pts;
        categories[cat].geral.totalPredictions += 1;
        categories[cat].geral.correctPredictions += isCorrect;

        categories[cat].leagues[league].totalPoints += pts;
        categories[cat].leagues[league].totalPredictions += 1;
        categories[cat].leagues[league].correctPredictions += isCorrect;
      }

      for (const cat in categories) {
        categories[cat].geral.accuracy = categories[cat].geral.totalPredictions > 0
          ? Math.round((categories[cat].geral.correctPredictions / categories[cat].geral.totalPredictions) * 100) : 0;
        for (const l in categories[cat].leagues) {
          categories[cat].leagues[l].accuracy = categories[cat].leagues[l].totalPredictions > 0
            ? Math.round((categories[cat].leagues[l].correctPredictions / categories[cat].leagues[l].totalPredictions) * 100) : 0;
        }
      }

      const accuracy =
        totalPredictions > 0
          ? Math.round((correctPredictions / totalPredictions) * 100)
          : 0;

      const scoreRef = adminDb.collection("userScores").doc(uid);
      await scoreRef.set(
        {
          totalPoints,
          totalPredictions,
          correctPredictions,
          accuracy,
          ...categories,
          position: null,
          pendingPredictions: 0,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    const scoresSnap = await adminDb
      .collection("userScores")
      .orderBy("totalPoints", "desc")
      .limit(500)
      .get();

    const rankBatch = adminDb.batch();
    scoresSnap.docs.forEach((d, idx) => {
      rankBatch.update(d.ref, { position: idx + 1 });
    });
    await rankBatch.commit();

    return Response.json({
      ok: true,
      processed: totalProcessed,
      usersUpdated: affectedUsers.size,
      syncedMatches: syncedCount,
    });
  } catch (err) {
    console.error("[score/process]", err);
    return Response.json(
      { error: "Erro ao processar pontuação", detail: String(err) },
      { status: 500 }
    );
  }
}