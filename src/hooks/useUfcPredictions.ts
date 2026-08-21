"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, getDocs, doc, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import type { UfcMethod } from "@/lib/api-mma/types";

export interface UfcPrediction {
  id: string;
  userId: string;
  fightId: string;
  predFighterId: number;
  predMethod: UfcMethod | null;
  locked: boolean;
  createdAt: string;
  pointsEarned?: number;
}

export function useUfcPredictions() {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<UfcPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [byFight, setByFight] = useState<Map<string, UfcPrediction>>(new Map());

  useEffect(() => {
    if (!user || !db) { setLoading(false); return; }
    const q = query(collection(db, "ufcPredictions"), where("userId", "==", user.uid));
    getDocs(q).then((snap) => {
      const preds = snap.docs.map((d) => ({ id: d.id, ...d.data() } as UfcPrediction));
      setPredictions(preds);
      const map = new Map<string, UfcPrediction>();
      preds.forEach((p) => map.set(p.fightId, p));
      setByFight(map);
      setLoading(false);
    });
  }, [user]);

  async function savePrediction(fightId: string, predFighterId: number, predMethod: UfcMethod | null) {
    if (!user || !db) return;
    const existing = byFight.get(fightId);

    if (existing) {
      await updateDoc(doc(db, "ufcPredictions", existing.id), { predFighterId, predMethod, updatedAt: serverTimestamp() });
      const updated = { ...existing, predFighterId, predMethod };
      setPredictions((prev) => prev.map((p) => (p.id === existing.id ? updated : p)));
      setByFight((prev) => { const m = new Map(prev); m.set(fightId, updated); return m; });
    } else {
      const ref = await addDoc(collection(db, "ufcPredictions"), {
        userId: user.uid, fightId, predFighterId, predMethod,
        locked: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      const newPred: UfcPrediction = { id: ref.id, userId: user.uid, fightId, predFighterId, predMethod, locked: false, createdAt: new Date().toISOString() };
      setPredictions((prev) => [...prev, newPred]);
      setByFight((prev) => { const m = new Map(prev); m.set(fightId, newPred); return m; });
    }
  }

  return { predictions, loading, byFight, savePrediction };
}
