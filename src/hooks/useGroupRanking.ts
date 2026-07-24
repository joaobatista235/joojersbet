"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  doc,
  collection,
  onSnapshot,
  getDocs,
  documentId,
  query,
  where,
  Unsubscribe,
} from "firebase/firestore";
import { tsToISO } from "@/lib/utils";
import type { RankingEntry } from "@/hooks/useRanking";

interface UseGroupRankingResult {
  groupName: string;
  inviteCode: string;
  ownerId: string;
  entries: RankingEntry[];
  loading: boolean;
  error: string | null;
}

/**
 * Ouve o grupo em tempo real e recalcula o ranking dos membros.
 */
export function useGroupRanking(groupId: string): UseGroupRankingResult {
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db || !groupId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Listener no documento do grupo
    const groupRef = doc(db, "groups", groupId);
    let unsubscribe: Unsubscribe;

    unsubscribe = onSnapshot(
      groupRef,
      async (groupSnap) => {
        if (!groupSnap.exists()) {
          setError("Grupo não encontrado.");
          setLoading(false);
          return;
        }

        const groupData = groupSnap.data();
        setGroupName(groupData.name ?? "");
        setInviteCode(groupData.inviteCode ?? "");
        setOwnerId(groupData.ownerId ?? "");

        const memberUids: string[] = groupData.members ?? [];
        if (memberUids.length === 0) {
          setEntries([]);
          setLoading(false);
          return;
        }

        try {
          // Buscar scores dos membros (suporta até 30 via "in")
          const chunks: string[][] = [];
          for (let i = 0; i < memberUids.length; i += 30) {
            chunks.push(memberUids.slice(i, i + 30));
          }

          const scoreResults: RankingEntry[] = [];

          for (const chunk of chunks) {
            const scoresQ = query(
              collection(db!, "userScores"),
              where(documentId(), "in", chunk)
            );
            const scoresSnap = await getDocs(scoresQ);

            for (const d of scoresSnap.docs) {
              const raw = d.data();
              scoreResults.push({
                uid: d.id,
                position: null,
                totalPoints: raw.totalPoints ?? 0,
                accuracy: raw.accuracy ?? 0,
                totalPredictions: raw.totalPredictions ?? 0,
                correctPredictions: raw.correctPredictions ?? 0,
                updatedAt: tsToISO(raw.updatedAt),
                name: raw.name,
                initials: raw.initials,
                photoURL: raw.photoURL ?? null,
                city: raw.city,
              });
            }
          }

          // Membros sem score ainda
          const withScore = new Set(scoreResults.map((e) => e.uid));
          for (const uid of memberUids) {
            if (!withScore.has(uid)) {
              scoreResults.push({
                uid,
                position: null,
                totalPoints: 0,
                accuracy: 0,
                totalPredictions: 0,
                correctPredictions: 0,
                updatedAt: null,
              });
            }
          }

          // Ordenar por pontos e atribuir posição
          scoreResults.sort((a, b) => b.totalPoints - a.totalPoints);
          scoreResults.forEach((e, i) => {
            e.position = i + 1;
          });

          setEntries(scoreResults);
          setLoading(false);
        } catch (err) {
          console.error("[useGroupRanking]", err);
          setError(String(err));
          setLoading(false);
        }
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [groupId]);

  return { groupName, inviteCode, ownerId, entries, loading, error };
}
