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
  [key: string]: any;
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
 * Ouve `userScores/{uid}`, `cs2UserScores/{uid}` e `ufcUserScores/{uid}` em tempo real.
 */
export function useUserScore(): UseUserScoreResult {
  const { user } = useAuth();
  const [score, setScore] = useState<UserScore>(DEFAULT_SCORE);
  const [cs2Score, setCs2Score] = useState<any>(null);
  const [ufcScore, setUfcScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const refFb = doc(db, "userScores", user.uid);
    const refCs2 = doc(db, "cs2UserScores", user.uid);
    const refUfc = doc(db, "ufcUserScores", user.uid);

    const unsubFb = onSnapshot(
      refFb,
      (snap) => {
        if (snap.exists()) {
          setScore({ ...DEFAULT_SCORE, ...(snap.data() as Partial<UserScore>) });
        } else {
          setScore(DEFAULT_SCORE);
        }
        setLoading(false);
      },
      (err) => {
        console.error("[useUserScore] FB", err);
        setError(err.message);
        setLoading(false);
      }
    );

    const unsubCs2 = onSnapshot(refCs2, (snap) => {
      if (snap.exists()) setCs2Score(snap.data());
    });

    const unsubUfc = onSnapshot(refUfc, (snap) => {
      if (snap.exists()) setUfcScore(snap.data());
    });

    return () => {
      unsubFb();
      unsubCs2();
      unsubUfc();
    };
  }, [user]);

  // Merge the scores into the structure expected by the profile page
  const mergedScore = {
    ...score,
    cs2: cs2Score ? { geral: cs2Score } : undefined,
    ufc: ufcScore ? { geral: ufcScore } : undefined,
  };

  return { score: mergedScore, loading, error };
}
