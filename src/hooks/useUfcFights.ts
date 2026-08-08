"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, onSnapshot, Unsubscribe } from "firebase/firestore";
import type { UfcFight, UfcFightStatus } from "@/lib/api-mma/types";

export function useUfcFights(status: UfcFightStatus, maxResults = 30) {
  const [fights, setFights] = useState<UfcFight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) { setLoading(false); return; }
    setLoading(true);
    let unsubscribe: Unsubscribe;
    try {
      const q = query(
        collection(db, "ufcFights"),
        where("status", "==", status),
        orderBy("startTime", status === "FINISHED" ? "desc" : "asc"),
        limit(maxResults)
      );
      unsubscribe = onSnapshot(q, (snap) => {
        let data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as UfcFight));
        if (status === "UPCOMING") {
          const cutoff = Date.now() - 3 * 60 * 60 * 1000;
          data = data.filter((f) => new Date(f.startTime).getTime() > cutoff);
        }
        setFights(data);
        setLoading(false);
      }, (err) => { setError(err.message); setLoading(false); });
    } catch (err) { setError(String(err)); setLoading(false); }
    return () => { if (unsubscribe) unsubscribe(); };
  }, [status, maxResults]);

  return { fights, loading, error };
}
