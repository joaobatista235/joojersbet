"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import type { Match } from "@/lib/api-football/types";

interface UseMatchesResult {
  matches: Match[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook que ouve partidas do Firestore em tempo real.
 * @param status - Filtro de status: "LIVE" | "UPCOMING" | "FINISHED"
 * @param maxResults - Quantidade máxima de partidas (default 20)
 */
export function useMatches(
  status: Match["status"],
  maxResults = 20
): UseMatchesResult {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    let unsubscribe: Unsubscribe;

    try {
      let q;
      if (status === "FINISHED") {
        q = query(collection(db, "matches"), where("status", "==", status));
      } else {
        q = query(
          collection(db, "matches"),
          where("status", "==", status),
          orderBy("startTime", "asc"),
          limit(maxResults)
        );
      }

      unsubscribe = onSnapshot(
        q,
        (snap) => {
          let data = snap.docs.map(
            (d) => ({ id: d.id, ...d.data() } as Match)
          );
          
          const ALLOWED = new Set([
            71, 72, 39, 140, 135, 61, 94, 307, 253,
            1, 4, 9, 13, 11, 2, 3, 73, 45, 143, 137, 66, 96
          ]);
          data = data.filter((m) => m.leagueId && ALLOWED.has(m.leagueId));

          if (status === "FINISHED") {
            data.sort((a, b) => b.startTime.localeCompare(a.startTime));
            data = data.slice(0, maxResults);
          }

          setMatches(data);
          setLoading(false);
        },
        (err) => {
          console.error("[useMatches] Firestore error:", err);
          setError(err.message);
          setLoading(false);
        }
      );
    } catch (err) {
      setError(String(err));
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [status, maxResults]);

  return { matches, loading, error };
}
