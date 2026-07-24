"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";

export interface RankingEntry {
  uid: string;
  position: number | null;
  totalPoints: number;
  accuracy: number;
  totalPredictions: number;
  correctPredictions: number;
  updatedAt: string | null;
  // Dados do perfil — populados separadamente ou via desnormalização
  name?: string;
  initials?: string;
  photoURL?: string | null;
  city?: string;
}

interface UseRankingResult {
  entries: RankingEntry[];
  loading: boolean;
  error: string | null;
}

/**
 * Ouve `userScores` em tempo real, ordenado por pontos (desc).
 * @param maxEntries Máximo de entradas (default 50)
 */
export function useRanking(maxEntries = 50): UseRankingResult {
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "userScores"),
      orderBy("totalPoints", "desc"),
      limit(maxEntries)
    );

    let unsubscribe: Unsubscribe;

    unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d, idx) => {
          const raw = d.data();
          return {
            uid: d.id,
            position: raw.position ?? idx + 1,
            totalPoints: raw.totalPoints ?? 0,
            accuracy: raw.accuracy ?? 0,
            totalPredictions: raw.totalPredictions ?? 0,
            correctPredictions: raw.correctPredictions ?? 0,
            updatedAt: raw.updatedAt ?? null,
            name: raw.name ?? undefined,
            initials: raw.initials ?? undefined,
            photoURL: raw.photoURL ?? null,
            city: raw.city ?? undefined,
          } as RankingEntry;
        });
        setEntries(data);
        setLoading(false);
      },
      (err) => {
        console.error("[useRanking]", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [maxEntries]);

  return { entries, loading, error };
}
