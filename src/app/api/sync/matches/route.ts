import type { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { calculateScore } from "@/lib/scoring";
import { syncMatchesFromApi } from "@/lib/matches-sync";

export const runtime = "nodejs";
export const maxDuration = 60;

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

function getSecret(request: NextRequest): string {
  return (
    request.headers.get("x-sync-secret") ??
    request.nextUrl.searchParams.get("secret") ??
    ""
  );
}

async function handleSync() {
  if (!adminDb) {
    return Response.json(
      { error: "Firestore não configurado" },
      { status: 500 }
    );
  }

  try {
    const syncedCount = await syncMatchesFromApi();
    console.log(`[sync] Synced ${syncedCount} matches from API`);

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

        return match.status === "FINISHED" || hasFinalScore;
      });

    console.log(`[sync] Unprocessed matches with scores: ${unprocessed.length}`);

    if (unprocessed.length === 0) {
      return Response.json({
        ok: true,
        processed: 0,
        syncedMatches: syncedCount,
        message: "Nada a processar",
      });
    }

    let totalProcessed = 0;
    const affectedUsers = new Set<string>();

    for (const match of unprocessed) {
      const hasFinalScore =
        match.homeScore !== null &&
        match.awayScore !== null &&
        match.homeScore !== undefined &&
        match.awayScore !== undefined;

      if (!hasFinalScore) continue;

      const matchRef = adminDb.collection("matches").doc(match.id);
      const realHome = match.homeScore as number;
      const realAway = match.awayScore as number;

      const predsSnap = await adminDb
        .collection("predictions")
        .where("matchId", "==", match.id)
        .get();

      if (predsSnap.empty) {
        await matchRef.update({
          status: "FINISHED",
          scoredAt: FieldValue.serverTimestamp(),
        });
        totalProcessed++;
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
              message = `acertou o placar exato de ${match.homeTeam} × ${match.awayTeam} — ${realHome}×${realAway}`;
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
              photoURL: userData.photoURL || null,
              message,
              createdAt: FieldValue.serverTimestamp(),
            });
          }
        }

        const predRef = adminDb.collection("predictions").doc(pred.id);
        batch.update(predRef, { locked: true });

        affectedUsers.add(pred.userId);
      }

      batch.update(matchRef, {
        status: "FINISHED",
        scoredAt: FieldValue.serverTimestamp(),
      });

      await batch.commit();
      totalProcessed++;
      console.log(`[sync] Processed match ${match.id}: ${match.homeTeam} ${realHome}x${realAway} ${match.awayTeam} (${preds.length} preds)`);
    }

    for (const uid of affectedUsers) {
      const allResultsSnap = await adminDb
        .collection("predictionResults")
        .where("userId", "==", uid)
        .get();

      let totalPoints = 0;
      let totalPredictions = 0;
      let correctPredictions = 0;
      const categories: Record<string, {
        geral: { totalPoints: number; totalPredictions: number; correctPredictions: number; accuracy: number };
        leagues: Record<string, { totalPoints: number; totalPredictions: number; correctPredictions: number; accuracy: number }>;
      }> = {};

      for (const r of allResultsSnap.docs) {
        const d = r.data();
        const pts = d.pointsEarned ?? 0;

        totalPoints += pts;
        totalPredictions += 1;
        if (d.correctWinner) correctPredictions += 1;

        const cat = d.category || "futebol";
        const league = String(d.leagueId || "others");

        if (!categories[cat]) {
          categories[cat] = {
            geral: { totalPoints: 0, totalPredictions: 0, correctPredictions: 0, accuracy: 0 },
            leagues: {},
          };
        }
        if (!categories[cat].leagues[league]) {
          categories[cat].leagues[league] = { totalPoints: 0, totalPredictions: 0, correctPredictions: 0, accuracy: 0 };
        }

        categories[cat].geral.totalPoints += pts;
        categories[cat].geral.totalPredictions += 1;
        if (d.correctWinner) categories[cat].geral.correctPredictions += 1;

        categories[cat].leagues[league].totalPoints += pts;
        categories[cat].leagues[league].totalPredictions += 1;
        if (d.correctWinner) categories[cat].leagues[league].correctPredictions += 1;
      }

      for (const cat in categories) {
        const g = categories[cat].geral;
        g.accuracy = g.totalPredictions > 0 ? Math.round((g.correctPredictions / g.totalPredictions) * 100) : 0;
        for (const l in categories[cat].leagues) {
          const lg = categories[cat].leagues[l];
          lg.accuracy = lg.totalPredictions > 0 ? Math.round((lg.correctPredictions / lg.totalPredictions) * 100) : 0;
        }
      }

      const accuracy = totalPredictions > 0 ? Math.round((correctPredictions / totalPredictions) * 100) : 0;

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

    console.log(`[sync] Done: ${totalProcessed} matches, ${affectedUsers.size} users updated`);

    return Response.json({
      ok: true,
      processed: totalProcessed,
      usersUpdated: affectedUsers.size,
      syncedMatches: syncedCount,
    });
  } catch (err) {
    console.error("[sync/matches] Error:", err);
    return Response.json(
      { error: "Erro ao processar", detail: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (getSecret(request) !== EXPECTED_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handleSync();
}

export async function GET(request: NextRequest) {
  if (getSecret(request) !== EXPECTED_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handleSync();
}