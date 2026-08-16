"use client";

import { motion } from "framer-motion";
import { User, Mail, Trophy, Target } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserScore } from "@/hooks/useUserScore";
import { useMatches } from "@/hooks/useMatches";
import { usePredictions } from "@/hooks/usePredictions";
import { useCs2Matches } from "@/hooks/useCs2Matches";
import { useCs2Predictions } from "@/hooks/useCs2Predictions";
import { useUfcFights } from "@/hooks/useUfcFights";
import { useUfcPredictions } from "@/hooks/useUfcPredictions";
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

  const [category, setCategory] = useState<string>("futebol");
  const [leagueId, setLeagueId] = useState<string>("geral");

  const { matches: upcoming } = useMatches("UPCOMING", 100);
  const { matches: live } = useMatches("LIVE", 50);
  const { byMatch } = usePredictions();

  const { matches: cs2Upcoming } = useCs2Matches("UPCOMING", 50);
  const { matches: cs2Live } = useCs2Matches("LIVE", 20);
  const { byMatch: byCs2Match } = useCs2Predictions();

  const { fights: ufcUpcoming } = useUfcFights("UPCOMING", 50);
  const { fights: ufcLive } = useUfcFights("LIVE", 20);
  const { byFight } = useUfcPredictions();

  const myMatches = useMemo(() => {
    return [...live, ...upcoming].filter((m) => byMatch.has(m.id));
  }, [live, upcoming, byMatch]);

  const myCs2Matches = useMemo(() => {
    return [...cs2Live, ...cs2Upcoming].filter((m) => byCs2Match.has(m.id));
  }, [cs2Live, cs2Upcoming, byCs2Match]);

  const myUfcFights = useMemo(() => {
    return [...ufcLive, ...ufcUpcoming].filter((f) => byFight.has(f.id));
  }, [ufcLive, ufcUpcoming, byFight]);

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
        <div className="lg:col-span-2" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* ── Tabs ── */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                setCategory("futebol");
                setLeagueId("geral");
              }}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                backgroundColor: category === "futebol" ? "var(--orange-500)" : "var(--bg-elevated)",
                color: category === "futebol" ? "white" : "var(--text-primary)",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              Futebol
            </button>
            <button
              onClick={() => { setCategory("cs2"); setLeagueId("geral"); }}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                backgroundColor: category === "cs2" ? "var(--orange-500)" : "var(--bg-elevated)",
                color: category === "cs2" ? "white" : "var(--text-primary)",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              CS2
            </button>
            <button
              onClick={() => { setCategory("ufc"); setLeagueId("geral"); }}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                backgroundColor: category === "ufc" ? "var(--orange-500)" : "var(--bg-elevated)",
                color: category === "ufc" ? "white" : "var(--text-primary)",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              UFC
            </button>
          </div>

          {category === "futebol" && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
              {[
                { id: "geral", label: "Geral" },
                { id: "39", label: "Premier League" },
                { id: "71", label: "Brasileirão" },
                { id: "135", label: "Serie A" },
                { id: "140", label: "La Liga" }
              ].map(league => (
                <button
                  key={league.id}
                  onClick={() => setLeagueId(league.id)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    fontSize: 13,
                    backgroundColor: leagueId === league.id ? "var(--orange-glow)" : "transparent",
                    color: leagueId === league.id ? "var(--orange-500)" : "var(--text-secondary)",
                    border: leagueId === league.id ? "1px solid var(--orange-500)" : "1px solid var(--border-default)",
                    cursor: "pointer",
                    whiteSpace: "nowrap"
                  }}
                >
                  {league.label}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {(() => {
              let pts = score.totalPoints ?? 0;
              let acc = score.accuracy ?? 0;
              let cor = score.correctPredictions ?? 0;

              if (category) {
                const catData = score[category];
                if (catData) {
                  const target = leagueId && leagueId !== "geral" 
                    ? catData.leagues?.[leagueId] 
                    : catData.geral;
                    
                  if (target) {
                    pts = target.totalPoints ?? 0;
                    acc = target.accuracy ?? 0;
                    cor = target.correctPredictions ?? 0;
                  } else {
                    pts = 0; acc = 0; cor = 0;
                  }
                } else {
                  pts = 0; acc = 0; cor = 0;
                }
              }

              return [
                { icon: <Trophy size={20} />, label: "Pontos Totais", value: pts },
                { icon: <Target size={20} />, label: "Taxa de Acerto", value: `${acc}%` },
                { icon: <User size={20} />, label: "Palpites Certos", value: cor },
              ].map((stat, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="card" style={{ padding: 24 }}>
                  <div style={{ color: "var(--orange-400)", marginBottom: 12 }}>{stat.icon}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>{stat.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-1px" }}>
                    {stat.value}
                  </div>
                </motion.div>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Meus Palpites */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
          Meus Palpites (Próximos e Ao Vivo)
        </h2>
        <div className="card" style={{ padding: 16 }}>
          {myMatches.length === 0 && myCs2Matches.length === 0 && myUfcFights.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 14 }}>
              Você não possui palpites ativos no momento.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {myCs2Matches.map((m) => (
                  <div key={m.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{m.team1} vs {m.team2}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>CS2 • {m.tournament}</div>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--orange-400)", fontWeight: 700 }}>
                      {byCs2Match.get(m.id)?.predTeam1Score} - {byCs2Match.get(m.id)?.predTeam2Score}
                    </div>
                  </div>
                ))}
                {myUfcFights.map((f) => (
                  <div key={f.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{f.fighter1} vs {f.fighter2}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>UFC • {f.weightClass}</div>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--orange-400)", fontWeight: 700 }}>
                      {f.fighter1Id === byFight.get(f.id)?.predFighterId ? f.fighter1 : f.fighter2}
                    </div>
                  </div>
                ))}
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
