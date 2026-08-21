import type { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { syncMatchesFromApi } from "@/lib/matches-sync";
import { syncUfcFights } from "@/lib/ufc-sync";
import { syncCs2Matches } from "@/lib/cs2-sync";
import { calculateCs2Score } from "@/lib/cs2-scoring";
import { processMatchScoring, rebuildUserScore, rebuildRanking, ensureActiveSeason } from "@/lib/scoring-engine";
import { calculateUfcScore } from "@/lib/ufc-scoring";
import { FieldValue } from "firebase-admin/firestore";
import type { UfcMethod } from "@/lib/api-mma/types";

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

interface RawUfcFight {
  id: string;
  fighter1: string;
  fighter2: string;
  fighter1Id: number;
  fighter2Id: number;
  winnerId: number | null;
  method: UfcMethod | null;
  status: string;
  eventName: string;
  scoredAt?: unknown;
}

interface RawCs2Match {
  id: string;
  team1: string;
  team2: string;
  team1Id: number;
  team2Id: number;
  team1Score: number | null;
  team2Score: number | null;
  winnerId: number | null;
  status: string;
  scoredAt?: unknown;
}

interface RawCs2Prediction {
  id: string;
  userId: string;
  matchId: string;
  predTeamId: number;
  predTeam1Score: number;
  predTeam2Score: number;
}

interface RawUfcPrediction {
  id: string;
  userId: string;
  fightId: string;
  predFighterId: number;
  predMethod: UfcMethod | null;
}

function getSecret(request: NextRequest): string {
  return (
    request.headers.get("x-sync-secret") ??
    request.nextUrl.searchParams.get("secret") ??
    ""
  );
}

async function handleProcess() {
  if (!adminDb) {
    return Response.json({ error: "Firestore nao configurado" }, { status: 500 });
  }

  try {
    // ===========================================================
    // 1. Sync + score de futebol e UFC em paralelo
    // ===========================================================
    const [syncedCount, ufcSyncedCount, cs2SyncedCount, seasonId] = await Promise.all([
      syncMatchesFromApi(),
      syncUfcFights(),
      syncCs2Matches(),
      ensureActiveSeason(),
    ]);
    console.log(`[score/process] Synced ${syncedCount} football matches, ${ufcSyncedCount} UFC fights, ${cs2SyncedCount} CS2 matches, season: ${seasonId}`);

    // ===========================================================
    // 2. Processar pontuacao de FUTEBOL
    // ===========================================================
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

    console.log(`[score/process] Football unprocessed: ${unprocessed.length}`);

    let totalProcessed = 0;
    const affectedUsers = new Set<string>();

    for (const match of unprocessed) {
      const hasFinalScore =
        match.homeScore !== null &&
        match.awayScore !== null &&
        match.homeScore !== undefined &&
        match.awayScore !== undefined;
      if (!hasFinalScore) continue;

      const result = await processMatchScoring(adminDb, {
        id: match.id,
        homeScore: match.homeScore as number,
        awayScore: match.awayScore as number,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        leagueId: match.leagueId,
        category: "futebol",
      }, seasonId);

      if (result.processed) {
        totalProcessed++;
        result.affectedUserIds.forEach((uid) => affectedUsers.add(uid));
      }
    }

    for (const uid of affectedUsers) {
      await rebuildUserScore(adminDb, uid);
    }
    if (affectedUsers.size > 0) {
      await rebuildRanking(adminDb);
    }

    // ===========================================================
    // 3. Processar pontuacao de UFC
    // ===========================================================
    const fightsSnap = await adminDb.collection("ufcFights").limit(500).get();
    const unprocessedFights = fightsSnap.docs
      .filter((d) => !d.data().scoredAt)
      .map((d) => ({ id: d.id, ...d.data() } as RawUfcFight))
      .filter((f) => f.status === "FINISHED" && f.winnerId !== null);

    console.log(`[score/process] UFC unprocessed: ${unprocessedFights.length}`);

    let ufcProcessed = 0;
    const ufcAffectedUsers = new Set<string>();

    for (const fight of unprocessedFights) {
      const predsSnap = await adminDb
        .collection("ufcPredictions")
        .where("fightId", "==", fight.id)
        .get();

      const fightRef = adminDb.collection("ufcFights").doc(fight.id);

      if (predsSnap.empty) {
        await fightRef.update({ scoredAt: FieldValue.serverTimestamp() });
        ufcProcessed++;
        continue;
      }

      const preds = predsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as RawUfcPrediction));
      const batch = adminDb.batch();

      for (const pred of preds) {
        const scoring = calculateUfcScore({
          predFighterId: pred.predFighterId,
          predMethod: pred.predMethod,
          realWinnerId: fight.winnerId,
          realMethod: fight.method,
        });

        const resultId = `${fight.id}_${pred.userId}`;
        batch.set(adminDb.collection("ufcPredictionResults").doc(resultId), {
          predictionId: pred.id,
          userId: pred.userId,
          fightId: fight.id,
          seasonId,
          category: "ufc",
          fighter1: fight.fighter1,
          fighter2: fight.fighter2,
          eventName: fight.eventName,
          winnerId: fight.winnerId,
          method: fight.method,
          predFighterId: pred.predFighterId,
          predMethod: pred.predMethod,
          correctWinner: scoring.correctWinner,
          correctMethod: scoring.correctMethod,
          pointsEarned: scoring.pointsEarned,
          processedAt: FieldValue.serverTimestamp(),
        });

        if (scoring.pointsEarned > 0) {
          const userSnap = await adminDb.collection("users").doc(pred.userId).get();
          if (userSnap.exists) {
            const u = userSnap.data()!;
            const winnerName = fight.winnerId === fight.fighter1Id ? fight.fighter1 : fight.fighter2;
            const feedId = `ufc_${fight.id}_${pred.userId}_score`;
            batch.set(adminDb.collection("feedEvents").doc(feedId), {
              userId: pred.userId,
              user: u.name || "Jogador",
              initials: u.initials || "?",
              photoURL: u.photoURL || null,
              message: scoring.correctMethod
                ? `acertou o vencedor E o metodo de ${fight.fighter1} vs ${fight.fighter2} — ${winnerName} por ${fight.method}`
                : `acertou o vencedor de ${fight.fighter1} vs ${fight.fighter2} — ${winnerName}`,
              createdAt: FieldValue.serverTimestamp(),
            });
          }
        }

        batch.update(adminDb.collection("ufcPredictions").doc(pred.id), { locked: true, pointsEarned: scoring.pointsEarned });
        ufcAffectedUsers.add(pred.userId);
      }

      batch.update(fightRef, { scoredAt: FieldValue.serverTimestamp() });
      await batch.commit();
      ufcProcessed++;
    }

    // Atualizar scores e ranking UFC
    for (const uid of ufcAffectedUsers) {
      const allSnap = await adminDb.collection("ufcPredictionResults").where("userId", "==", uid).get();
      let totalPoints = 0, totalPredictions = 0, correctPredictions = 0;
      for (const r of allSnap.docs) {
        const d = r.data();
        totalPoints += d.pointsEarned ?? 0;
        totalPredictions++;
        if (d.correctWinner) correctPredictions++;
      }
      const accuracy = totalPredictions > 0 ? Math.round((correctPredictions / totalPredictions) * 100) : 0;
      await adminDb.collection("ufcUserScores").doc(uid).set(
        { totalPoints, totalPredictions, correctPredictions, accuracy, position: null, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    }

    if (ufcAffectedUsers.size > 0) {
      const scoresSnap = await adminDb.collection("ufcUserScores").orderBy("totalPoints", "desc").limit(500).get();
      const rankBatch = adminDb.batch();
      scoresSnap.docs.forEach((d, idx) => rankBatch.update(d.ref, { position: idx + 1 }));
      await rankBatch.commit();
    }
    // ===========================================================
    // 4. Processar pontuacao de CS2
    // ===========================================================
    const cs2MatchesSnap = await adminDb.collection("cs2Matches").limit(500).get();
    const unprocessedCs2 = cs2MatchesSnap.docs
      .filter((d) => !d.data().scoredAt)
      .map((d) => ({ id: d.id, ...d.data() } as RawCs2Match))
      .filter((m) => m.status === "FINISHED" && m.winnerId !== null);

    console.log(`[score/process] CS2 unprocessed: ${unprocessedCs2.length}`);

    let cs2Processed = 0;
    const cs2AffectedUsers = new Set<string>();

    for (const match of unprocessedCs2) {
      const predsSnap = await adminDb
        .collection("cs2Predictions")
        .where("matchId", "==", match.id)
        .get();

      const matchRef = adminDb.collection("cs2Matches").doc(match.id);

      if (predsSnap.empty) {
        await matchRef.update({ scoredAt: FieldValue.serverTimestamp() });
        cs2Processed++;
        continue;
      }

      const preds = predsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as RawCs2Prediction));
      const batch = adminDb.batch();

      for (const pred of preds) {
        const scoring = calculateCs2Score({
          predTeamId: pred.predTeamId,
          predTeam1Score: pred.predTeam1Score,
          predTeam2Score: pred.predTeam2Score,
          realWinnerId: match.winnerId,
          realTeam1Score: match.team1Score,
          realTeam2Score: match.team2Score,
          team1Id: match.team1Id,
          team2Id: match.team2Id,
        });

        const resultId = `${match.id}_${pred.userId}`;
        batch.set(adminDb.collection("cs2PredictionResults").doc(resultId), {
          predictionId: pred.id,
          userId: pred.userId,
          matchId: match.id,
          seasonId,
          category: "cs2",
          team1: match.team1,
          team2: match.team2,
          team1Score: match.team1Score,
          team2Score: match.team2Score,
          predTeamId: pred.predTeamId,
          predTeam1Score: pred.predTeam1Score,
          predTeam2Score: pred.predTeam2Score,
          correctWinner: scoring.correctWinner,
          exactMapScore: scoring.exactMapScore,
          correctMapDiff: scoring.correctMapDiff,
          pointsEarned: scoring.pointsEarned,
          processedAt: FieldValue.serverTimestamp(),
        });

        if (scoring.pointsEarned > 0) {
          const userSnap = await adminDb.collection("users").doc(pred.userId).get();
          if (userSnap.exists) {
            const u = userSnap.data()!;
            const winnerName = match.winnerId === match.team1Id ? match.team1 : match.team2;
            const feedId = `cs2_${match.id}_${pred.userId}_score`;
            batch.set(adminDb.collection("feedEvents").doc(feedId), {
              userId: pred.userId,
              user: u.name || "Jogador",
              initials: u.initials || "?",
              photoURL: u.photoURL || null,
              message: `acertou o resultado de ${match.team1} vs ${match.team2} no CS2 - vencedor: ${winnerName}`,
              createdAt: FieldValue.serverTimestamp(),
            });
          }
        }

        batch.update(adminDb.collection("cs2Predictions").doc(pred.id), { locked: true, pointsEarned: scoring.pointsEarned });
        cs2AffectedUsers.add(pred.userId);
      }

      batch.update(matchRef, { scoredAt: FieldValue.serverTimestamp() });
      await batch.commit();
      cs2Processed++;
    }

    for (const uid of cs2AffectedUsers) {
      const allResultsSnap = await adminDb.collection("cs2PredictionResults").where("userId", "==", uid).get();
      let totalPoints = 0, totalPredictions = 0, correctPredictions = 0;
      for (const r of allResultsSnap.docs) {
        const d = r.data();
        totalPoints += d.pointsEarned ?? 0;
        totalPredictions += 1;
        if (d.correctWinner) correctPredictions += 1;
      }
      const accuracy = totalPredictions > 0 ? Math.round((correctPredictions / totalPredictions) * 100) : 0;
      await adminDb.collection("cs2UserScores").doc(uid).set(
        { totalPoints, totalPredictions, correctPredictions, accuracy, position: null, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    }

    if (cs2AffectedUsers.size > 0) {
      const scoresSnap = await adminDb.collection("cs2UserScores").orderBy("totalPoints", "desc").limit(500).get();
      const rankBatch = adminDb.batch();
      scoresSnap.docs.forEach((d, idx) => rankBatch.update(d.ref, { position: idx + 1 }));
      await rankBatch.commit();
    }


    console.log(`[score/process] Done — Football: ${totalProcessed} matches, ${affectedUsers.size} users | UFC: ${ufcProcessed} fights, ${ufcAffectedUsers.size} users | CS2: ${cs2Processed} matches, ${cs2AffectedUsers.size} users`);

    return Response.json({
      ok: true,
      football: { processed: totalProcessed, usersUpdated: affectedUsers.size, syncedMatches: syncedCount },
      ufc: { processed: ufcProcessed, usersUpdated: ufcAffectedUsers.size, syncedFights: ufcSyncedCount },
      cs2: { processed: cs2Processed, usersUpdated: cs2AffectedUsers.size, syncedMatches: cs2SyncedCount },
    });
  } catch (err) {
    console.error("[score/process] Error:", err);
    return Response.json({ error: "Erro ao processar", detail: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (getSecret(request) !== EXPECTED_SECRET) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return handleProcess();
}

export async function GET(request: NextRequest) {
  if (getSecret(request) !== EXPECTED_SECRET) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return handleProcess();
}
