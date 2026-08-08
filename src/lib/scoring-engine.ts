import { FieldValue, Firestore } from "firebase-admin/firestore";
import { calculateScore } from "@/lib/scoring";
import { ensureActiveSeason } from "@/lib/seasons";

export interface RawMatchForScoring {
  id: string;
  homeScore: number;
  awayScore: number;
  homeTeam: string;
  awayTeam: string;
  leagueId?: number;
  category?: string;
}

export interface RawPredictionForScoring {
  id: string;
  userId: string;
  matchId: string;
  homeGoals: number;
  awayGoals: number;
}

export async function processMatchScoring(
  db: Firestore,
  match: RawMatchForScoring,
  seasonId: string
): Promise<{ processed: boolean; affectedUserIds: string[] }> {
  const matchRef = db.collection("matches").doc(match.id);
  const predsSnap = await db
    .collection("predictions")
    .where("matchId", "==", match.id)
    .get();

  if (predsSnap.empty) {
    await matchRef.update({
      status: "FINISHED",
      scoredAt: FieldValue.serverTimestamp(),
    });
    return { processed: true, affectedUserIds: [] };
  }

  const preds = predsSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as RawPredictionForScoring)
  );
  const batch = db.batch();
  const affectedUserIds: string[] = [];

  for (const pred of preds) {
    const scoring = calculateScore({
      predHome: pred.homeGoals,
      predAway: pred.awayGoals,
      realHome: match.homeScore,
      realAway: match.awayScore,
    });

    const resultId = `${match.id}_${pred.userId}`;
    const resultRef = db.collection("predictionResults").doc(resultId);
    batch.set(resultRef, {
      predictionId: pred.id,
      userId: pred.userId,
      matchId: match.id,
      seasonId,
      category: match.category ?? "futebol",
      leagueId: match.leagueId ?? null,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      homeGoals: pred.homeGoals,
      awayGoals: pred.awayGoals,
      exactScore: scoring.exactScore,
      correctGoalDiff: scoring.correctGoalDiff,
      correctWinner: scoring.correctWinner,
      pointsEarned: scoring.pointsEarned,
      processedAt: FieldValue.serverTimestamp(),
    });

    if (scoring.pointsEarned > 0) {
      const userSnap = await db.collection("users").doc(pred.userId).get();
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
        batch.set(db.collection("feedEvents").doc(feedId), {
          userId: pred.userId,
          user: userData.name || "Jogador",
          initials: userData.initials || "?",
          photoURL: userData.photoURL || null,
          message,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    }

    batch.update(db.collection("predictions").doc(pred.id), { locked: true });
    affectedUserIds.push(pred.userId);
  }

  batch.update(matchRef, {
    status: "FINISHED",
    scoredAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
  return { processed: true, affectedUserIds };
}

export async function rebuildUserScore(db: Firestore, uid: string): Promise<void> {
  const allResultsSnap = await db
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

  await db.collection("userScores").doc(uid).set(
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

export async function rebuildRanking(db: Firestore): Promise<void> {
  const scoresSnap = await db
    .collection("userScores")
    .orderBy("totalPoints", "desc")
    .limit(500)
    .get();

  const rankBatch = db.batch();
  scoresSnap.docs.forEach((d, idx) => {
    rankBatch.update(d.ref, { position: idx + 1 });
  });
  await rankBatch.commit();
}

export { ensureActiveSeason };
