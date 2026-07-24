// ─── POST /api/score/process ──────────────────────────────────────────────────
// Processa partidas FINISHED que ainda não tiveram pontuação calculada.
// Para cada predição da partida, calcula pontos e grava em:
//   predictionResults/{matchId}_{userId}
// Depois recalcula e atualiza userScores/{uid} para cada usuário afetado.
//
// Chamado pelo cron Vercel a cada 15 min e manualmente em dev:
//   curl -X POST http://localhost:3000/api/score/process \
//        -H "x-sync-secret: dev"

import type { NextRequest } from "next/server";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  writeBatch,
  getDoc,
  serverTimestamp,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { calculateScore } from "@/lib/scoring";

export const runtime = "nodejs";

const EXPECTED_SECRET = process.env.SYNC_SECRET ?? "dev";

interface RawMatch {
  id: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  homeTeam: string;
  awayTeam: string;
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

  if (!db) {
    return Response.json(
      { error: "Firestore não configurado" },
      { status: 500 }
    );
  }

  try {
    // 1. Buscar partidas FINISHED ainda não processadas
    const matchesQ = query(
      collection(db, "matches"),
      where("status", "==", "FINISHED"),
      where("scoredAt", "==", null),
      limit(50)
    );

    // Firestore não permite where("scoredAt", "==", null) diretamente com outros filtros
    // em todos os planos — usamos getDocs e filtramos em memória como fallback seguro
    const allFinishedQ = query(
      collection(db, "matches"),
      where("status", "==", "FINISHED"),
      limit(100)
    );
    const finishedSnap = await getDocs(allFinishedQ);
    const unprocessed = finishedSnap.docs
      .filter((d) => !d.data().scoredAt)
      .map((d) => ({ id: d.id, ...d.data() } as RawMatch));

    if (unprocessed.length === 0) {
      return Response.json({ ok: true, processed: 0, message: "Nada a processar" });
    }

    // 2. Para cada partida, buscar predições e calcular pontos
    let totalProcessed = 0;
    const affectedUsers = new Map<string, UserAccumulator>();

    for (const match of unprocessed) {
      if (match.homeScore === null || match.awayScore === null) continue;

      // Buscar todas as predições para essa partida
      const predsQ = query(
        collection(db, "predictions"),
        where("matchId", "==", match.id)
      );
      const predsSnap = await getDocs(predsQ);
      if (predsSnap.empty) {
        // Marcar como processada mesmo sem predições
        await updateDoc(doc(db, "matches", match.id), {
          scoredAt: serverTimestamp(),
        });
        continue;
      }

      const preds = predsSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as RawPrediction)
      );

      // Batch para predictionResults
      const batch = writeBatch(db);

      for (const pred of preds) {
        const scoring = calculateScore({
          predHome: pred.homeGoals,
          predAway: pred.awayGoals,
          realHome: match.homeScore,
          realAway: match.awayScore,
        });

        // Gravar resultado (upsert)
        const resultId = `${match.id}_${pred.userId}`;
        const resultRef = doc(db, "predictionResults", resultId);
        batch.set(resultRef, {
          predictionId: pred.id,
          userId: pred.userId,
          matchId: match.id,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          homeGoals: pred.homeGoals,
          awayGoals: pred.awayGoals,
          exactScore: scoring.exactScore,
          correctGoalDiff: scoring.correctGoalDiff,
          correctWinner: scoring.correctWinner,
          pointsEarned: scoring.pointsEarned,
          processedAt: serverTimestamp(),
        });

        // ─── Lógica do Feed Social ───
        if (scoring.pointsEarned > 0) {
          // Precisamos do perfil do usuário para o Feed
          const userSnap = await getDoc(doc(db, "users", pred.userId));
          if (userSnap.exists()) {
            const userData = userSnap.data();
            let message = "";
            if (scoring.exactScore) {
              message = `acertou o placar exato de ${match.homeTeam} × ${match.awayTeam} — ${match.homeScore}×${match.awayScore}`;
            } else if (scoring.correctGoalDiff) {
              message = `acertou o saldo de gols de ${match.homeTeam} × ${match.awayTeam}`;
            } else {
              message = `acertou o vencedor de ${match.homeTeam} × ${match.awayTeam}`;
            }

            const feedId = `${match.id}_${pred.userId}_score`;
            batch.set(doc(db, "feedEvents", feedId), {
              userId: pred.userId,
              user: userData.name || "Jogador",
              initials: userData.initials || "?",
              avatarColor: userData.avatarColor || "#f97316",
              message,
              createdAt: serverTimestamp(),
            });
          }
        }

        // Bloquear predição
        const predRef = doc(db, "predictions", pred.id);
        batch.update(predRef, { locked: true });

        // Acumular por usuário
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

      // Marcar partida como processada
      batch.update(doc(db, "matches", match.id), {
        scoredAt: serverTimestamp(),
      });

      await batch.commit();
      totalProcessed++;
    }

    // 3. Recalcular userScores para usuários afetados
    // Lê TODOS os resultados do usuário e soma (garante idempotência)
    for (const [uid, _acc] of affectedUsers) {
      const allResultsQ = query(
        collection(db, "predictionResults"),
        where("userId", "==", uid)
      );
      const allResultsSnap = await getDocs(allResultsQ);

      let totalPoints = 0;
      let totalPredictions = 0;
      let correctPredictions = 0;

      for (const r of allResultsSnap.docs) {
        const d = r.data();
        totalPoints += d.pointsEarned ?? 0;
        totalPredictions += 1;
        if (d.correctWinner) correctPredictions += 1;
      }

      const accuracy =
        totalPredictions > 0
          ? Math.round((correctPredictions / totalPredictions) * 100)
          : 0;

      const scoreRef = doc(db, "userScores", uid);
      await setDoc(
        scoreRef,
        {
          totalPoints,
          totalPredictions,
          correctPredictions,
          accuracy,
          position: null, // será recalculado em passo separado
          pendingPredictions: 0,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    // 4. Recalcular posições (rank) para todos os usuários com score
    const scoresQ = query(
      collection(db, "userScores"),
      orderBy("totalPoints", "desc"),
      limit(500)
    );
    const scoresSnap = await getDocs(scoresQ);

    const rankBatch = writeBatch(db);
    scoresSnap.docs.forEach((d, idx) => {
      rankBatch.update(d.ref, { position: idx + 1 });
    });
    await rankBatch.commit();

    return Response.json({
      ok: true,
      processed: totalProcessed,
      usersUpdated: affectedUsers.size,
    });
  } catch (err) {
    console.error("[score/process]", err);
    return Response.json(
      { error: "Erro ao processar pontuação", detail: String(err) },
      { status: 500 }
    );
  }
}
