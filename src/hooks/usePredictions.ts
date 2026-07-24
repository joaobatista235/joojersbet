"use client";

import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { tsToISO } from "@/lib/utils";
import type { Prediction } from "@/lib/predictions";

interface UsePredictionsResult {
  /** Map de matchId → Prediction para acesso O(1) */
  byMatch: Map<string, Prediction>;
  predictions: Prediction[];
  loading: boolean;
}

/**
 * Hook que ouve em tempo real todos os palpites do usuário logado.
 * Retorna um Map<matchId, Prediction> para lookup instantâneo.
 */
export function usePredictions(): UsePredictionsResult {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let unsubscribe: Unsubscribe;

    const q = query(
      collection(db, "predictions"),
      where("userId", "==", user.uid)
    );

    unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => {
          const raw = d.data();
          return {
            id: d.id,
            userId: raw.userId,
            matchId: raw.matchId,
            homeGoals: raw.homeGoals,
            awayGoals: raw.awayGoals,
            locked: raw.locked ?? false,
            createdAt: tsToISO(raw.createdAt),
            updatedAt: tsToISO(raw.updatedAt),
          } as Prediction;
        });
        setPredictions(data);
        setLoading(false);
      },
      (err) => {
        console.error("[usePredictions]", err);
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const byMatch = useMemo(() => new Map(predictions.map((p) => [p.matchId, p])), [predictions]);

  return { predictions, byMatch, loading };
}
