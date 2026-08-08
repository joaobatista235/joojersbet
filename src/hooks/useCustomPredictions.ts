"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, getDocs, doc, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";

export interface CustomPrediction {
  id: string;
  userId: string;
  eventId: string;
  chosenOption: string;
  locked: boolean;
  createdAt: string;
}

export function useCustomPredictions() {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<CustomPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [byEvent, setByEvent] = useState<Map<string, CustomPrediction>>(new Map());

  useEffect(() => {
    if (!user || !db) { setLoading(false); return; }
    getDocs(query(collection(db, "customPredictions"), where("userId", "==", user.uid))).then((snap) => {
      const preds = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CustomPrediction));
      setPredictions(preds);
      const map = new Map<string, CustomPrediction>();
      preds.forEach((p) => map.set(p.eventId, p));
      setByEvent(map);
      setLoading(false);
    });
  }, [user]);

  async function savePrediction(eventId: string, chosenOption: string) {
    if (!user || !db) return;
    const existing = byEvent.get(eventId);
    if (existing) {
      await updateDoc(doc(db, "customPredictions", existing.id), { chosenOption, updatedAt: serverTimestamp() });
      const updated = { ...existing, chosenOption };
      setPredictions((prev) => prev.map((p) => (p.id === existing.id ? updated : p)));
      setByEvent((prev) => { const m = new Map(prev); m.set(eventId, updated); return m; });
    } else {
      const ref = await addDoc(collection(db, "customPredictions"), {
        userId: user.uid, eventId, chosenOption, locked: false,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      const newPred: CustomPrediction = { id: ref.id, userId: user.uid, eventId, chosenOption, locked: false, createdAt: new Date().toISOString() };
      setPredictions((prev) => [...prev, newPred]);
      setByEvent((prev) => { const m = new Map(prev); m.set(eventId, newPred); return m; });
    }
  }

  return { predictions, loading, byEvent, savePrediction };
}
