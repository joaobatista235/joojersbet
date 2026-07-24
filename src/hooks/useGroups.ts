"use client";

import { useEffect, useState } from "react";
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
import type { Group } from "@/lib/groups";

interface UseGroupsResult {
  groups: Group[];
  loading: boolean;
}

/**
 * Ouve em tempo real todos os grupos dos quais o usuário é membro.
 */
export function useGroups(): UseGroupsResult {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "groups"),
      where("members", "array-contains", user.uid)
    );

    let unsubscribe: Unsubscribe;
    unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => {
          const raw = d.data();
          return {
            id: d.id,
            name: raw.name,
            inviteCode: raw.inviteCode,
            ownerId: raw.ownerId,
            members: raw.members ?? [],
            createdAt: tsToISO(raw.createdAt),
          } as Group;
        });
        setGroups(data);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  return { groups, loading };
}
