import type { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { syncCs2Matches } from "@/lib/cs2-sync";
import { calculateCs2Score } from "@/lib/cs2-scoring";
import { ensureActiveSeason } from "@/lib/seasons";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const maxDuration = 60;

const EXPECTED_SECRET = process.env.SYNC_SECRET ?? "dev";

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

function getSecret(request: NextRequest): string {
  return request.headers.get("x-sync-secret") ?? request.nextUrl.searchParams.get("secret") ?? "";
}

async function handleCs2Sync() {
  if (!adminDb) return Response.json({ error: "Firestore não configurado" }, { status: 500 });

  try {
    const [syncedCount, seasonId] = await Promise.all([
      syncCs2Matches(),
      ensureActiveSeason(),
    ]);

    const matchesSnap = await adminDb.collection("cs2Matches").limit(500).get();
    const unprocessed = matchesSnap.docs
      .filter((d) => !d.data().scoredAt)
      .map((d) => ({ id: d.id, ...d.data() } as RawCs2Match))
      .filter((m) => m.status === "FINISHED" && m.winnerId !== null);

    if (unprocessed.length === 0) {
      return Response.json({ ok: true, processed: 0, syncedMatches: syncedCount, message: "Nada a processar" });
    }

    let totalProcessed = 0;
    const affectedUsers = new Set<string>();

    for (const match of unprocessed) {
      const predsSnap = await adminDb
        .collection("cs2Predictions")
        .where("matchId", "==", match.id)
        .get();

      const matchRef = adminDb.collection("cs2Matches").doc(match.id);

      if (predsSnap.empty) {
        await matchRef.update({ scoredAt: FieldValue.serverTimestamp() });
        totalProcessed++;
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
              message: `acertou o resultado de ${match.team1} × ${match.team2} no CS2 — vencedor: ${winnerName}`,
              createdAt: FieldValue.serverTimestamp(),
            });
          }
        }

        batch.update(adminDb.collection("cs2Predictions").doc(pred.id), { locked: true });
        affectedUsers.add(pred.userId);
      }

      batch.update(matchRef, { scoredAt: FieldValue.serverTimestamp() });
      await batch.commit();
      totalProcessed++;
    }

    for (const uid of affectedUsers) {
      const allResultsSnap = await adminDb
        .collection("cs2PredictionResults")
        .where("userId", "==", uid)
        .get();

      let totalPoints = 0;
      let totalPredictions = 0;
      let correctPredictions = 0;

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

    if (affectedUsers.size > 0) {
      const scoresSnap = await adminDb.collection("cs2UserScores").orderBy("totalPoints", "desc").limit(500).get();
      const rankBatch = adminDb.batch();
      scoresSnap.docs.forEach((d, idx) => rankBatch.update(d.ref, { position: idx + 1 }));
      await rankBatch.commit();
    }

    return Response.json({ ok: true, processed: totalProcessed, usersUpdated: affectedUsers.size, syncedMatches: syncedCount });
  } catch (err) {
    console.error("[sync/cs2] Error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (getSecret(request) !== EXPECTED_SECRET) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return handleCs2Sync();
}

export async function GET(request: NextRequest) {
  if (getSecret(request) !== EXPECTED_SECRET) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return handleCs2Sync();
}
