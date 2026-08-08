import type { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { syncUfcFights } from "@/lib/ufc-sync";
import { calculateUfcScore } from "@/lib/ufc-scoring";
import { ensureActiveSeason } from "@/lib/seasons";
import { FieldValue } from "firebase-admin/firestore";
import type { UfcMethod } from "@/lib/api-mma/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const EXPECTED_SECRET = process.env.SYNC_SECRET ?? "dev";

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

interface RawUfcPrediction {
  id: string;
  userId: string;
  fightId: string;
  predFighterId: number;
  predMethod: UfcMethod | null;
}

function getSecret(request: NextRequest): string {
  return request.headers.get("x-sync-secret") ?? request.nextUrl.searchParams.get("secret") ?? "";
}

async function handleUfcSync() {
  if (!adminDb) return Response.json({ error: "Firestore não configurado" }, { status: 500 });

  try {
    const [syncedCount, seasonId] = await Promise.all([
      syncUfcFights(),
      ensureActiveSeason(),
    ]);

    const fightsSnap = await adminDb.collection("ufcFights").limit(500).get();
    const unprocessed = fightsSnap.docs
      .filter((d) => !d.data().scoredAt)
      .map((d) => ({ id: d.id, ...d.data() } as RawUfcFight))
      .filter((f) => f.status === "FINISHED" && f.winnerId !== null);

    if (unprocessed.length === 0) {
      return Response.json({ ok: true, processed: 0, syncedMatches: syncedCount, message: "Nada a processar" });
    }

    let totalProcessed = 0;
    const affectedUsers = new Set<string>();

    for (const fight of unprocessed) {
      const predsSnap = await adminDb
        .collection("ufcPredictions")
        .where("fightId", "==", fight.id)
        .get();

      const fightRef = adminDb.collection("ufcFights").doc(fight.id);

      if (predsSnap.empty) {
        await fightRef.update({ scoredAt: FieldValue.serverTimestamp() });
        totalProcessed++;
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
                ? `acertou o vencedor E o método de ${fight.fighter1} × ${fight.fighter2} — ${winnerName} por ${fight.method}`
                : `acertou o vencedor de ${fight.fighter1} × ${fight.fighter2} — ${winnerName}`,
              createdAt: FieldValue.serverTimestamp(),
            });
          }
        }

        batch.update(adminDb.collection("ufcPredictions").doc(pred.id), { locked: true });
        affectedUsers.add(pred.userId);
      }

      batch.update(fightRef, { scoredAt: FieldValue.serverTimestamp() });
      await batch.commit();
      totalProcessed++;
    }

    for (const uid of affectedUsers) {
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

    if (affectedUsers.size > 0) {
      const scoresSnap = await adminDb.collection("ufcUserScores").orderBy("totalPoints", "desc").limit(500).get();
      const rankBatch = adminDb.batch();
      scoresSnap.docs.forEach((d, idx) => rankBatch.update(d.ref, { position: idx + 1 }));
      await rankBatch.commit();
    }

    return Response.json({ ok: true, processed: totalProcessed, usersUpdated: affectedUsers.size, syncedMatches: syncedCount });
  } catch (err) {
    console.error("[sync/ufc] Error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (getSecret(request) !== EXPECTED_SECRET) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return handleUfcSync();
}

export async function GET(request: NextRequest) {
  if (getSecret(request) !== EXPECTED_SECRET) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return handleUfcSync();
}
