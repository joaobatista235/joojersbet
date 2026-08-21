"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection, query, where, getDocs, doc,
  addDoc, updateDoc, serverTimestamp,
} from "firebase/firestore";

export interface Cs2Prediction {
  id: string;
  userId: string;
  matchId: string;
  predTeamId: number;
  predTeam1Score: number;
  predTeam2Score: number;
  locked: boolean;
  createdAt: string;
  pointsEarned?: number;
}

export function useCs2Predictions() {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<Cs2Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [byMatch, setByMatch] = useState<Map<string, Cs2Prediction>>(new Map());

  useEffect(() => {
    if (!user || !db) { setLoading(false); return; }

    const q = query(collection(db, "cs2Predictions"), where("userId", "==", user.uid));
    getDocs(q).then((snap) => {
      const preds = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Cs2Prediction));
      setPredictions(preds);
      const map = new Map<string, Cs2Prediction>();
      preds.forEach((p) => map.set(p.matchId, p));
      setByMatch(map);
      setLoading(false);
    });
  }, [user]);

  async function savePrediction(matchId: string, predTeamId: number, predTeam1Score: number, predTeam2Score: number) {
    if (!user || !db) return;

    const existing = byMatch.get(matchId);

    if (existing) {
      const ref = doc(db, "cs2Predictions", existing.id);
      await updateDoc(ref, { predTeamId, predTeam1Score, predTeam2Score, updatedAt: serverTimestamp() });
      const updated = { ...existing, predTeamId, predTeam1Score, predTeam2Score };
      setPredictions((prev) => prev.map((p) => (p.id === existing.id ? updated : p)));
      setByMatch((prev) => { const m = new Map(prev); m.set(matchId, updated); return m; });
    } else {
      const ref = await addDoc(collection(db, "cs2Predictions"), {
        userId: user.uid,
        matchId,
        predTeamId,
        predTeam1Score,
        predTeam2Score,
        locked: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      const newPred: Cs2Prediction = {
        id: ref.id,
        userId: user.uid,
        matchId,
        predTeamId,
        predTeam1Score,
        predTeam2Score,
        locked: false,
        createdAt: new Date().toISOString(),
      };
      setPredictions((prev) => [...prev, newPred]);
      setByMatch((prev) => { const m = new Map(prev); m.set(matchId, newPred); return m; });
    }
  }

  return { predictions, loading, byMatch, savePrediction };
}
