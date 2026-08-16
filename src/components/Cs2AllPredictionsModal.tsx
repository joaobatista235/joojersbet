import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import type { Cs2Match } from "@/lib/api-pandascore/types";
import { useAuth } from "@/contexts/AuthContext";

interface EnrichedPrediction {
  userId: string;
  predTeam1Score: number;
  predTeam2Score: number;
  predTeamId: number;
  name: string;
  photoURL: string | null;
  initials: string;
}

export function Cs2AllPredictionsModal({ match, onClose }: { match: Cs2Match; onClose: () => void }) {
  const [predictions, setPredictions] = useState<EnrichedPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    async function load() {
      if (!db) return;
      try {
        const q = query(collection(db, "predictions"), where("matchId", "==", match.id));
        const snap = await getDocs(q);
        const predsData = snap.docs.map((d) => d.data());

        const enriched = await Promise.all(
          predsData.map(async (p) => {
            const userSnap = await getDoc(doc(db, "userScores", p.userId));
            const userData = userSnap.exists() ? userSnap.data() : null;
            return {
              userId: p.userId,
              predTeam1Score: p.predTeam1Score,
              predTeam2Score: p.predTeam2Score,
              predTeamId: p.predTeamId,
              name: userData?.name || "Jogador Oculto",
              photoURL: userData?.photoURL || null,
              initials: userData?.initials || "?",
            };
          })
        );
        enriched.sort((a, b) => (a.userId === user?.uid ? -1 : b.userId === user?.uid ? 1 : 0));
        setPredictions(enriched);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [match.id, user?.uid]);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
        style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)", zIndex: 50 }} />
      <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 51, pointerEvents: "none" }}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
          style={{ backgroundColor: "var(--bg-elevated)", borderRadius: 24, padding: "24px", width: "100%", maxWidth: 480, maxHeight: "85vh", display: "flex", flexDirection: "column", border: "1px solid var(--border-default)", pointerEvents: "auto", boxShadow: "0 24px 48px rgba(0,0,0,0.4)" }}>
          
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>Palpites da Galera</h2>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{match.team1} x {match.team2}</div>
            </div>
            <button onClick={onClose} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={16} /></button>
          </div>

          <div style={{ overflowY: "auto", flex: 1, paddingRight: 8 }}>
            {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 14 }}>Carregando...</div> : predictions.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 14 }}>Nenhum palpite registrado.</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {predictions.map((p) => {
                  const isMe = p.userId === user?.uid;
                  return (
                    <div key={p.userId} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, backgroundColor: isMe ? "var(--orange-glow)" : "var(--bg-surface)", border: isMe ? "1px solid var(--orange-500)" : "1px solid var(--border-subtle)" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: p.photoURL ? "transparent" : "var(--orange-500)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "white", overflow: "hidden" }}>
                        {p.photoURL ? <img src={p.photoURL} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : p.initials}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                          {p.name} {isMe && <span style={{ fontSize: 11, fontWeight: 500, color: "var(--orange-400)", marginLeft: 6 }}>(Você)</span>}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Vencedor: {p.predTeamId === match.team1Id ? match.team1 : match.team2}</div>
                      </div>
                      <div style={{ backgroundColor: "var(--bg-elevated)", padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border-default)", fontSize: 16, fontWeight: 800, color: "var(--text-primary)", letterSpacing: 2 }}>
                        {p.predTeam1Score} <span style={{ color: "var(--text-muted)", fontSize: 13, fontWeight: 600 }}>-</span> {p.predTeam2Score}
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