"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, onSnapshot, Unsubscribe } from "firebase/firestore";
import type { Cs2Match, Cs2MatchStatus } from "@/lib/pandascore/types";

interface UseCs2MatchesResult {
  matches: Cs2Match[];
  loading: boolean;
  error: string | null;
}

export function useCs2Matches(status: Cs2MatchStatus, maxResults = 20): UseCs2MatchesResult {
  const [matches, setMatches] = useState<Cs2Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) { setLoading(false); return; }

    setLoading(true);
    let unsubscribe: Unsubscribe;

    try {
      const q = query(
        collection(db, "cs2Matches"),
        where("status", "==", status),
        limit(maxResults)
      );

      unsubscribe = onSnapshot(q, (snap) => {
        let data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Cs2Match));

        if (status === "UPCOMING") {
          const cutoff = Date.now() - 3 * 60 * 60 * 1000;
          data = data.filter((m) => new Date(m.startTime).getTime() > cutoff);
        }

        data.sort((a, b) => {
          const tA = new Date(a.startTime).getTime();
          const tB = new Date(b.startTime).getTime();
          return status === "FINISHED" ? tB - tA : tA - tB;
        });

        // Sort no lado do cliente
        data.sort((a, b) => {
          const tA = new Date(a.startTime).getTime();
          const tB = new Date(b.startTime).getTime();
          return status === "FINISHED" ? tB - tA : tA - tB;
        });
        setMatches(data);
        setLoading(false);
      }, (err) => {
        setError(err.message);
        setLoading(false);
      });
    } catch (err) {
      setError(String(err));
      setLoading(false);
    }

    return () => { if (unsubscribe) unsubscribe(); };
  }, [status, maxResults]);

  return { matches, loading, error };
}
