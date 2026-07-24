"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Trophy, AlertCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import type { Match } from "@/lib/api-football/types";
import { useAuth } from "@/contexts/AuthContext";

interface EnrichedPrediction {
  userId: string;
  homeGoals: number;
  awayGoals: number;
  name: string;
  photoURL: string | null;
  initials: string;
  points?: number; // if we want to show points later
}

interface AllPredictionsModalProps {
  match: Match;
  onClose: () => void;
}

export function AllPredictionsModal({ match, onClose }: AllPredictionsModalProps) {
  const [predictions, setPredictions] = useState<EnrichedPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    async function loadPredictions() {
      if (!db) return;
      try {
        const q = query(
          collection(db, "predictions"),
          where("matchId", "==", match.id)
        );
        const snap = await getDocs(q);
        
        const predsData = snap.docs.map((d) => d.data());

        const enriched = await Promise.all(
          predsData.map(async (p) => {
            if (!db) return null;
            const userRef = doc(db, "userScores", p.userId);
            const userSnap = await getDoc(userRef);
            const userData = userSnap.exists() ? userSnap.data() : null;

            return {
              userId: p.userId,
              homeGoals: p.homeGoals,
              awayGoals: p.awayGoals,
              name: userData?.name || "Jogador Oculto",
              photoURL: userData?.photoURL || null,
              initials: userData?.initials || "?",
            };
          })
        );

        const validEnriched = enriched.filter((item): item is NonNullable<typeof item> => item !== null);

        // Colocar o próprio usuário no topo
        validEnriched.sort((a, b) => {
          if (a.userId === user?.uid) return -1;
          if (b.userId === user?.uid) return 1;
          return 0;
        });

        setPredictions(validEnriched);
      } catch (err) {
        console.error("Erro ao carregar palpites da galera", err);
      } finally {
        setLoading(false);
      }
    }

    loadPredictions();
  }, [match.id, user?.uid]);

  const isLocked = new Date(match.startTime) <= new Date() || match.status !== "UPCOMING";

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 50,
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          zIndex: 51,
          pointerEvents: "none",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          style={{
            backgroundColor: "var(--bg-elevated)",
            borderRadius: 24,
            padding: "24px",
            width: "100%",
            maxWidth: 480,
            maxHeight: "85vh",
            display: "flex",
            flexDirection: "column",
            border: "1px solid var(--border-default)",
            pointerEvents: "auto",
            boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
                Palpites da Galera
              </h2>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                {match.homeTeam} × {match.awayTeam}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-muted)",
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={16} />
            </button>
          </div>

          {!isLocked && (
            <div style={{ padding: "12px 16px", backgroundColor: "rgba(249, 115, 22, 0.1)", borderRadius: 12, display: "flex", gap: 10, alignItems: "center", marginBottom: 20, color: "var(--orange-400)", border: "1px solid rgba(249, 115, 22, 0.2)" }}>
              <AlertCircle size={18} />
              <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.4 }}>
                O jogo ainda não começou. Outros jogadores podem alterar seus palpites.
              </div>
            </div>
          )}

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1, paddingRight: 8 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 14 }}>
                Carregando palpites...
              </div>
            ) : predictions.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 14 }}>
                Nenhum palpite registrado para este jogo.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {predictions.map((p) => {
                  const isMe = p.userId === user?.uid;
                  return (
                    <div
                      key={p.userId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: isMe ? "var(--orange-glow)" : "var(--bg-surface)",
                        border: isMe ? "1px solid var(--orange-500)" : "1px solid var(--border-subtle)",
                      }}
                    >
                      {/* Avatar */}
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          backgroundColor: p.photoURL ? "transparent" : "var(--orange-500)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 700,
                          color: "white",
                          overflow: "hidden",
                        }}
                      >
                        {p.photoURL ? (
                          <img src={p.photoURL} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          p.initials
                        )}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                          {p.name} {isMe && <span style={{ fontSize: 11, fontWeight: 500, color: "var(--orange-400)", marginLeft: 6 }}>(Você)</span>}
                        </div>
                      </div>

                      {/* Score */}
                      <div
                        style={{
                          backgroundColor: "var(--bg-elevated)",
                          padding: "6px 12px",
                          borderRadius: 8,
                          border: "1px solid var(--border-default)",
                          fontSize: 16,
                          fontWeight: 800,
                          color: "var(--text-primary)",
                          letterSpacing: 2,
                        }}
                      >
                        {p.homeGoals} <span style={{ color: "var(--text-muted)", fontSize: 13, fontWeight: 600 }}>×</span> {p.awayGoals}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
}
