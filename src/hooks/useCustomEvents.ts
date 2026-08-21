"use client";
import { useEffect, useState, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, Unsubscribe } from "firebase/firestore";

export interface CustomEvent {
  id: string;
  title: string;
  description: string;
  options: string[];
  deadline: string | null;
  status: "open" | "closed" | "resolved";
  resolvedOption: string | null;
  createdAt: string;
}

export function useCustomEvents(statusFilter?: "open" | "resolved" | "closed") {
  const [events, setEvents] = useState<CustomEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) { setLoading(false); return; }
    let unsubscribe: Unsubscribe;

    const q = statusFilter
      ? query(collection(db, "customEvents"), where("status", "==", statusFilter))
      : query(collection(db, "customEvents"));

    unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CustomEvent));
      data.sort((a, b) => {
        const getMs = (v: any) => v?.toMillis ? v.toMillis() : new Date(v || 0).getTime();
        return getMs(b.createdAt) - getMs(a.createdAt);
      });
      setEvents(data);
      setLoading(false);
    }, () => setLoading(false));

    return () => { if (unsubscribe) unsubscribe(); };
  }, [statusFilter]);

  return { events, loading };
}
