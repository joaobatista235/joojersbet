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
import { Cs2AllPredictionsModal } from "@/components/Cs2AllPredictionsModal";
import { UfcAllPredictionsModal } from "@/components/UfcAllPredictionsModal";
import type { Match } from "@/lib/api-football/types";
import type { Cs2Match } from "@/lib/pandascore/types";
import type { UfcFight } from "@/lib/api-mma/types";
import { useState, useMemo } from "react";
import { AnimatePresence } from "framer-motion";

export default function PerfilPage() {
  const { user } = useAuth();
  const { score } = useUserScore();

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedMatchForAll, setSelectedMatchForAll] = useState<Match | null>(null);
  const [selectedCs2MatchForAll, setSelectedCs2MatchForAll] = useState<Cs2Match | null>(null);
  const [selectedUfcFightForAll, setSelectedUfcFightForAll] = useState<UfcFight | null>(null);

  const [category, setCategory] = useState<string>("futebol");
  const [leagueId, setLeagueId] = useState<string>("geral");

  const { matches: upcoming } = useMatches("UPCOMING", 100);
  const { matches: live } = useMatches("LIVE", 50);
  const { matches: finished } = useMatches("FINISHED", 100);
  const { byMatch } = usePredictions();

  const { matches: cs2Upcoming } = useCs2Matches("UPCOMING", 50);
  const { matches: cs2Live } = useCs2Matches("LIVE", 20);
  const { matches: cs2Finished } = useCs2Matches("FINISHED", 50);
  const { byMatch: byCs2Match } = useCs2Predictions();

  const { fights: ufcUpcoming } = useUfcFights("UPCOMING", 50);
  const { fights: ufcLive } = useUfcFights("LIVE", 20);
  const { fights: ufcFinished } = useUfcFights("FINISHED", 50);
  const { byFight } = useUfcPredictions();

  const myMatches = useMemo(() => {
    return [...live, ...upcoming, ...finished].filter((m) => byMatch.has(m.id));
  }, [live, upcoming, finished, byMatch]);

  const myCs2Matches = useMemo(() => {
    return [...cs2Live, ...cs2Upcoming, ...cs2Finished].filter((m) => byCs2Match.has(m.id));
  }, [cs2Live, cs2Upcoming, cs2Finished, byCs2Match]);

  const myUfcFights = useMemo(() => {
    return [...ufcLive, ...ufcUpcoming, ...ufcFinished].filter((f) => byFight.has(f.id));
  }, [ufcLive, ufcUpcoming, ufcFinished, byFight]);

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

      {/* Meus Palpites - Filtrado pela tab ativa */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
          Meus Palpites (Próximos e Ao Vivo)
        </h2>

        {/* Sub-tabs de futebol (ligas) */}
        {category === "futebol" && (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12, marginBottom: 0 }}>
            {[
              { id: "geral", label: "Todas as Ligas" },
              { id: "39", label: "Premier League" },
              { id: "71", label: "Brasileiroão" },
              { id: "135", label: "Serie A" },
              { id: "140", label: "La Liga" }
            ].map(l => (
              <button key={l.id} onClick={() => setLeagueId(l.id)} style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                backgroundColor: leagueId === l.id ? "var(--orange-500)" : "var(--bg-elevated)",
                color: leagueId === l.id ? "white" : "var(--text-muted)",
                border: leagueId === l.id ? "1px solid var(--orange-500)" : "1px solid var(--border-subtle)",
                cursor: "pointer", transition: "all 0.15s",
              }}>{l.label}</button>
            ))}
          </div>
        )}

        {/* Sub-tabs de CS2 (torneios presentes nos palpites) */}
        {category === "cs2" && (() => {
          const cs2Tournaments = Array.from(new Set(myCs2Matches.map(m => m.tournament).filter(Boolean)));
          return cs2Tournaments.length > 1 ? (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12, marginBottom: 0 }}>
              {["Todos", ...cs2Tournaments].map(t => (
                <button key={t} onClick={() => setLeagueId(t === "Todos" ? "geral" : t)} style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                  backgroundColor: (t === "Todos" ? leagueId === "geral" : leagueId === t) ? "var(--orange-500)" : "var(--bg-elevated)",
                  color: (t === "Todos" ? leagueId === "geral" : leagueId === t) ? "white" : "var(--text-muted)",
                  border: (t === "Todos" ? leagueId === "geral" : leagueId === t) ? "1px solid var(--orange-500)" : "1px solid var(--border-subtle)",
                  cursor: "pointer", transition: "all 0.15s",
                }}>{t}</button>
              ))}
            </div>
          ) : null;
        })()}

        {/* Sub-tabs de UFC (categorias de peso presentes nos palpites) */}
        {category === "ufc" && (() => {
          const classes = Array.from(new Set(myUfcFights.map(f => f.weightClass).filter(Boolean)));
          return classes.length > 1 ? (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12, marginBottom: 0 }}>
              {["Todas", ...classes].map(c => (
                <button key={c} onClick={() => setLeagueId(c === "Todas" ? "geral" : c)} style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                  backgroundColor: (c === "Todas" ? leagueId === "geral" : leagueId === c) ? "var(--orange-500)" : "var(--bg-elevated)",
                  color: (c === "Todas" ? leagueId === "geral" : leagueId === c) ? "white" : "var(--text-muted)",
                  border: (c === "Todas" ? leagueId === "geral" : leagueId === c) ? "1px solid var(--orange-500)" : "1px solid var(--border-subtle)",
                  cursor: "pointer", transition: "all 0.15s",
                }}>{c}</button>
              ))}
            </div>
          ) : null;
        })()}

        <div className="card" style={{ padding: 16, marginTop: 12 }}>
          {/* ─ FUTEBOL ─ */}
          {category === "futebol" && (() => {
            const filtered = myMatches.filter(m =>
              leagueId === "geral" || String(m.leagueId) === leagueId
            );
            return filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 14 }}>
                Nenhum palpite nessa liga.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {filtered.map((m, i) => {
                  const date = new Date(m.startTime);
                  const time = `${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} às ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
                  const pred = byMatch.get(m.id) ?? null;
                  return (
                    <div key={m.id} onClick={() => setSelectedMatchForAll(m)} style={{ padding: "14px 0", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {m.homeLogo && <img src={`/api/image-proxy?url=${encodeURIComponent(m.homeLogo)}`} alt={m.homeTeam} style={{ width: 16, height: 16, objectFit: "contain" }} />}
                            {m.homeTeam}
                          </div>
                          <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>vs</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {m.awayLogo && <img src={`/api/image-proxy?url=${encodeURIComponent(m.awayLogo)}`} alt={m.awayTeam} style={{ width: 16, height: 16, objectFit: "contain" }} />}
                            {m.awayTeam}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
                          <span>{m.competition} • {m.status === "LIVE" ? "🔴 Ao Vivo" : time}</span>
                          {m.status === "FINISHED" && m.homeScore !== null && m.awayScore !== null && (
                            <span style={{ fontWeight: 700, color: "var(--text-primary)", background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: 4 }}>
                              Resultado: {m.homeScore} × {m.awayScore}
                            </span>
                          )}
                          {m.status === "FINISHED" && pred?.pointsEarned !== undefined && pred.pointsEarned > 0 && (
                            <span style={{ fontWeight: 700, color: "#22c55e", background: "rgba(34,197,94,0.1)", padding: "2px 6px", borderRadius: 4 }}>
                              +{pred.pointsEarned} pts
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--orange-400)", letterSpacing: 1 }}>
                          {pred?.homeGoals ?? "-"} <span style={{ color: "var(--text-muted)", fontSize: 12 }}>-</span> {pred?.awayGoals ?? "-"}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
                          {pred && pred.homeGoals > pred.awayGoals ? m.homeTeam : pred && pred.awayGoals > pred.homeGoals ? m.awayTeam : (pred && pred.homeGoals === pred.awayGoals ? "Empate" : "")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* ─ CS2 ─ */}
          {category === "cs2" && (() => {
            const filtered = myCs2Matches.filter(m =>
              leagueId === "geral" || m.tournament === leagueId
            );
            return filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 14 }}>
                Nenhum palpite de CS2 ativo.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {filtered.map((m) => {
                  const pred = byCs2Match.get(m.id);
                  return (
                    <div key={m.id} onClick={() => setSelectedCs2MatchForAll(m)} style={{ padding: "14px 0", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {m.team1Logo && <img src={m.team1Logo} alt={m.team1} style={{ width: 16, height: 16, objectFit: "contain" }} />}
                            {m.team1}
                          </div>
                          <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>vs</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {m.team2Logo && <img src={m.team2Logo} alt={m.team2} style={{ width: 16, height: 16, objectFit: "contain" }} />}
                            {m.team2}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
                          <span>{m.tournament} • {m.status === "LIVE" ? "🔴 Ao Vivo" : new Date(m.startTime).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " às " + new Date(m.startTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                          {m.status === "FINISHED" && m.team1Score !== null && m.team2Score !== null && (
                            <span style={{ fontWeight: 700, color: "var(--text-primary)", background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: 4 }}>
                              Resultado: {m.team1Score} × {m.team2Score}
                            </span>
                          )}
                          {m.status === "FINISHED" && pred?.pointsEarned !== undefined && pred.pointsEarned > 0 && (
                            <span style={{ fontWeight: 700, color: "#22c55e", background: "rgba(34,197,94,0.1)", padding: "2px 6px", borderRadius: 4 }}>
                              +{pred.pointsEarned} pts
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--orange-400)", letterSpacing: 1 }}>
                          {pred?.predTeam1Score ?? "-"} <span style={{ color: "var(--text-muted)", fontSize: 12 }}>-</span> {pred?.predTeam2Score ?? "-"}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
                          {pred && (pred.predTeam1Score ?? 0) > (pred.predTeam2Score ?? 0) ? m.team1 : pred && (pred.predTeam2Score ?? 0) > (pred.predTeam1Score ?? 0) ? m.team2 : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* ─ UFC ─ */}
          {category === "ufc" && (() => {
            const filtered = myUfcFights.filter(f =>
              leagueId === "geral" || f.weightClass === leagueId
            );
            return filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 14 }}>
                Nenhum palpite de UFC ativo.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {filtered.map((f) => {
                  const pred = byFight.get(f.id);
                  const pickedFighter = pred?.predFighterId === f.fighter1Id ? f.fighter1 : f.fighter2;
                  const date = new Date(f.startTime);
                  const formattedDate = `${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} às ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
                  const realWinner = f.winnerId === f.fighter1Id ? f.fighter1 : f.winnerId === f.fighter2Id ? f.fighter2 : null;
                  return (
                    <div key={f.id} onClick={() => setSelectedUfcFightForAll(f)} style={{ padding: "14px 0", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {f.fighter1Photo && <img src={f.fighter1Photo} alt={f.fighter1} style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }} />}
                            {f.fighter1}
                          </div>
                          <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>vs</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {f.fighter2Photo && <img src={f.fighter2Photo} alt={f.fighter2} style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }} />}
                            {f.fighter2}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
                          <span>{f.weightClass} • {f.status === "LIVE" ? "🔴 Ao Vivo" : formattedDate}</span>
                          {f.status === "FINISHED" && realWinner && (
                            <span style={{ fontWeight: 700, color: "var(--text-primary)", background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: 4 }}>
                              Vencedor: {realWinner} {f.method && `(${f.method})`}
                            </span>
                          )}
                          {f.status === "FINISHED" && pred?.pointsEarned !== undefined && pred.pointsEarned > 0 && (
                            <span style={{ fontWeight: 700, color: "#22c55e", background: "rgba(34,197,94,0.1)", padding: "2px 6px", borderRadius: 4 }}>
                              +{pred.pointsEarned} pts
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--orange-400)" }}>{pickedFighter}</div>
                        {pred?.predMethod && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{pred.predMethod}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
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

      <AnimatePresence>
        {selectedCs2MatchForAll && (
          <Cs2AllPredictionsModal
            key={`all-cs2-${selectedCs2MatchForAll.id}`}
            match={selectedCs2MatchForAll}
            onClose={() => setSelectedCs2MatchForAll(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedUfcFightForAll && (
          <UfcAllPredictionsModal
            key={`all-ufc-${selectedUfcFightForAll.id}`}
            match={selectedUfcFightForAll}
            onClose={() => setSelectedUfcFightForAll(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
