import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { tsToISO, clamp } from "@/lib/utils";

export interface Prediction {
  id: string;
  userId: string;
  matchId: string;
  homeGoals: number;
  awayGoals: number;
  createdAt: string;
  updatedAt: string;
  locked: boolean; // true quando o jogo já começou e não pode mais editar
  pointsEarned?: number;
}

export type PredictionInput = {
  matchId: string;
  homeGoals: number;
  awayGoals: number;
};

export async function createPrediction(
  userId: string,
  input: PredictionInput
): Promise<Prediction> {
  if (!db) throw new Error("Firestore não configurado");

  const payload = {
    userId,
    matchId: input.matchId,
    homeGoals: clamp(input.homeGoals, 0, 20),
    awayGoals: clamp(input.awayGoals, 0, 20),
    locked: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, "predictions"), payload);

  return {
    id: ref.id,
    userId,
    matchId: input.matchId,
    homeGoals: payload.homeGoals,
    awayGoals: payload.awayGoals,
    locked: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
export async function updatePrediction(
  predictionId: string,
  homeGoals: number,
  awayGoals: number
): Promise<void> {
  if (!db) throw new Error("Firestore não configurado");

  const ref = doc(db, "predictions", predictionId);
  await updateDoc(ref, {
    homeGoals: clamp(homeGoals, 0, 20),
    awayGoals: clamp(awayGoals, 0, 20),
    updatedAt: serverTimestamp(),
  });
}
export async function fetchUserPredictions(userId: string): Promise<Prediction[]> {
  if (!db) return [];

  const q = query(
    collection(db, "predictions"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      userId: data.userId,
      matchId: data.matchId,
      homeGoals: data.homeGoals,
      awayGoals: data.awayGoals,
      locked: data.locked ?? false,
      pointsEarned: data.pointsEarned,
      createdAt: tsToISO(data.createdAt),
      updatedAt: tsToISO(data.updatedAt),
    };
  });
}
