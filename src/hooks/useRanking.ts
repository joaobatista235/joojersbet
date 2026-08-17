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
  getDoc,
  doc,
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
export function useRanking(
  maxEntries = 50,
  category?: string,
  leagueId?: string | number
): UseRankingResult {
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    setLoading(true);

    let orderByField = "totalPoints";
    if (category) {
      if (leagueId && leagueId !== "geral") {
        orderByField = `${category}.leagues.${leagueId}.totalPoints`;
      } else {
        orderByField = `${category}.geral.totalPoints`;
      }
    }

    const q = query(
      collection(db, "userScores"),
      orderBy(orderByField, "desc"),
      limit(maxEntries)
    );

    let unsubscribe: Unsubscribe;

    unsubscribe = onSnapshot(
      q,
      (snap) => {
        const basicEntries = snap.docs.map((d, idx) => {
          const raw = d.data();
          
          let pts = raw.totalPoints ?? 0;
          let acc = raw.accuracy ?? 0;
          let tot = raw.totalPredictions ?? 0;
          let cor = raw.correctPredictions ?? 0;

          if (category) {
            const catData = raw[category];
            if (catData) {
              const target = leagueId && leagueId !== "geral" 
                ? catData.leagues?.[leagueId] 
                : catData.geral;
                
              if (target) {
                pts = target.totalPoints ?? 0;
                acc = target.accuracy ?? 0;
                tot = target.totalPredictions ?? 0;
                cor = target.correctPredictions ?? 0;
              } else {
                pts = 0; acc = 0; tot = 0; cor = 0;
              }
            } else {
              pts = 0; acc = 0; tot = 0; cor = 0;
            }
          }

          return {
            uid: d.id,
            position: idx + 1,
            totalPoints: pts,
            accuracy: acc,
            totalPredictions: tot,
            correctPredictions: cor,
            updatedAt: raw.updatedAt ?? null,
            name: raw.name ?? undefined,
            initials: raw.initials ?? undefined,
            photoURL: raw.photoURL ?? null,
            city: raw.city ?? undefined,
          } as RankingEntry;
        });

        Promise.all(basicEntries.map(async (e) => {
          if (!e.name || !e.photoURL) {
            try {
              const userDoc = await getDoc(doc(db!, "users", e.uid));
              if (userDoc.exists()) {
                const uData = userDoc.data();
                return { ...e, name: uData.name, initials: uData.initials, photoURL: uData.photoURL, city: uData.city };
              }
            } catch(err){}
          }
          return e;
        })).then(enriched => {
          setEntries(enriched);
          setLoading(false);
        });
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
  }, [maxEntries, category, leagueId]);

  return { entries, loading, error };
}
