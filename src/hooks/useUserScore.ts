"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

export interface UserScore {
  totalPoints: number;
  position: number | null;
  accuracy: number;      // 0–100 (%)
  totalPredictions: number;
  correctPredictions: number;
  pendingPredictions: number;
  updatedAt: string | null;
}

const DEFAULT_SCORE: UserScore = {
  totalPoints: 0,
  position: null,
  accuracy: 0,
  totalPredictions: 0,
  correctPredictions: 0,
  pendingPredictions: 0,
  updatedAt: null,
};

interface UseUserScoreResult {
  score: UserScore;
  loading: boolean;
  error: string | null;
}

/**
 * Ouve `userScores/{uid}` em tempo real.
 * Retorna zeros enquanto o documento não existe.
 */
export function useUserScore(): UseUserScoreResult {
  const { user } = useAuth();
  const [score, setScore] = useState<UserScore>(DEFAULT_SCORE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const ref = doc(db, "userScores", user.uid);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setScore({ ...DEFAULT_SCORE, ...(snap.data() as Partial<UserScore>) });
        } else {
          setScore(DEFAULT_SCORE);
        }
        setLoading(false);
      },
      (err) => {
        console.error("[useUserScore]", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  return { score, loading, error };
}
