"use client";

import { motion } from "framer-motion";
import { User, Mail, Trophy, Target } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserScore } from "@/hooks/useUserScore";
import { useMatches } from "@/hooks/useMatches";
import { usePredictions } from "@/hooks/usePredictions";
import { UpcomingMatchRow } from "@/components/UpcomingMatchRow";
import { PredictionModal } from "@/components/PredictionModal";
import { AllPredictionsModal } from "@/components/AllPredictionsModal";
import type { Match } from "@/lib/api-football/types";
import { useState, useMemo } from "react";
import { AnimatePresence } from "framer-motion";

export default function PerfilPage() {
  const { user } = useAuth();
  const { score } = useUserScore();

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedMatchForAll, setSelectedMatchForAll] = useState<Match | null>(null);

  const { matches: upcoming } = useMatches("UPCOMING", 100);
  const { matches: live } = useMatches("LIVE", 50);
  const { byMatch } = usePredictions();

  const myMatches = useMemo(() => {
    return [...live, ...upcoming].filter((m) => byMatch.has(m.id));
  }, [live, upcoming, byMatch]);

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-base)", padding: "36px 28px 48px" }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
          Meu Perfil
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Suas informações e estatísticas gerais
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 24 }}>
        {/* Card Principal */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card lg:col-span-1" style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div
            style={{
              width: 80, height: 80, borderRadius: "50%",
              backgroundColor: user.photoURL ? "transparent" : "var(--orange-500)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, fontWeight: 700, color: "white", marginBottom: 16, overflow: "hidden"
            }}
          >
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              user.initials
            )}
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
            {user.name}
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)" }}>
            <Mail size={14} />
            {user.email}
          </div>
        </motion.div>

        {/* Estatísticas */}
        <div className="lg:col-span-2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {[
            { icon: <Trophy size={20} />, label: "Pontos Totais", value: score.totalPoints },
            { icon: <Target size={20} />, label: "Taxa de Acerto", value: `${score.accuracy}%` },
            { icon: <User size={20} />, label: "Palpites Certos", value: score.correctPredictions },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="card" style={{ padding: 24 }}>
              <div style={{ color: "var(--orange-400)", marginBottom: 12 }}>{stat.icon}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>{stat.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-1px" }}>
                {stat.value}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Meus Palpites */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
          Meus Palpites (Próximos e Ao Vivo)
        </h2>
        <div className="card" style={{ padding: 16 }}>
          {myMatches.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 14 }}>
              Você não possui palpites ativos no momento.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {myMatches.map((m, i) => {
                const time = new Date(m.startTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                return (
                  <UpcomingMatchRow
                    key={m.id}
                    match={{
                      id: m.id,
                      homeTeam: m.homeTeam,
                      awayTeam: m.awayTeam,
                      time,
                      competition: m.competition,
                      group: m.round,
                      prediction: byMatch.get(m.id) ?? null,
                      onPredict: () => setSelectedMatch(m),
                      onViewAllPredictions: () => setSelectedMatchForAll(m),
                    }}
                    delay={0.1 * i}
                  />
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Modal de palpite ── */}
      <AnimatePresence>
        {selectedMatch && (
          <PredictionModal
            key={`pred-${selectedMatch.id}`}
            match={selectedMatch}
            existingPrediction={byMatch.get(selectedMatch.id) ?? null}
            onClose={() => setSelectedMatch(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Modal de Todos os Palpites ── */}
      <AnimatePresence>
        {selectedMatchForAll && (
          <AllPredictionsModal
            key={`all-${selectedMatchForAll.id}`}
            match={selectedMatchForAll}
            onClose={() => setSelectedMatchForAll(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
