import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { tsToISO } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export interface FeedEventData {
  id: string;
  userId: string;
  user: string; // nome do usuário
  initials: string;
  avatarColor: string;
  photoURL?: string | null;
  message: string;
  createdAt: string; // ISO string
}

export function useFeed(maxEvents = 10) {
  const { user: authUser } = useAuth();
  const [events, setEvents] = useState<FeedEventData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !authUser) {
      if (!authUser) setLoading(false);
      return;
    }

    const q = query(
      collection(db, "feedEvents"),
      orderBy("createdAt", "desc"),
      limit(maxEvents)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const newEvents = snap.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId,
            user: data.user || "Usuário",
            initials: data.initials || "?",
            avatarColor: data.avatarColor || "#f97316",
            photoURL: data.photoURL || null,
            message: data.message,
            createdAt: tsToISO(data.createdAt),
          } as FeedEventData;
        });

        setEvents(newEvents);
        setLoading(false);
      },
      (err) => {
        if (!err.message.includes("Missing or insufficient permissions")) {
          console.error("[useFeed] Firestore error:", err);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [maxEvents, authUser]);

  return { events, loading };
}
