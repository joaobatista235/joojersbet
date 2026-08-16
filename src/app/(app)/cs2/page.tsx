"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cs2AllPredictionsModal } from "@/components/Cs2AllPredictionsModal";
import { Activity, Calendar, CheckCircle2, Gamepad2 } from "lucide-react";
import { useCs2Matches } from "@/hooks/useCs2Matches";
import { useCs2Predictions } from "@/hooks/useCs2Predictions";
import type { Cs2Match } from "@/lib/pandascore/types";

type Tab = "upcoming" | "live" | "finished";

function TeamLogo({ src, name, size = 40 }: { src?: string | null; name: string; size?: number }) {
  if (!src) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 8, backgroundColor: "var(--bg-elevated)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.35, fontWeight: 700, color: "var(--text-muted)",
        border: "1px solid var(--border-subtle)", flexShrink: 0,
      }}>
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <img src={src} alt={name} style={{ width: size, height: size, objectFit: "contain", borderRadius: 8, flexShrink: 0 }}
      onError={(e) => { e.currentTarget.style.display = "none"; }}
    />
  );
}

function MapScoreInput({ value, onChange, max }: { value: number; onChange: (v: number) => void; max: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button onClick={() => onChange(Math.max(0, value - 1))} style={{
        width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border-default)",
        background: "var(--bg-elevated)", color: "var(--text-primary)", fontSize: 16, cursor: "pointer",
      }}>−</button>
      <span style={{ width: 24, textAlign: "center", fontWeight: 700, color: "var(--text-primary)" }}>{value}</span>
      <button onClick={() => onChange(Math.min(max, value + 1))} style={{
        width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border-default)",
        background: "var(--bg-elevated)", color: "var(--text-primary)", fontSize: 16, cursor: "pointer",
      }}>+</button>
    </div>
  );
}

function Cs2MatchCard({ match }: { match: Cs2Match }) {
  const { byMatch, savePrediction } = useCs2Predictions();
  const existing = byMatch.get(match.id);
  const isLocked = existing?.locked ?? false;
  const isFinished = match.status === "FINISHED";

  const maxMaps = Math.ceil(match.bestOf / 2);

  // Winner is derived from scores - no separate selector needed
  const [score1, setScore1] = useState(existing?.predTeam1Score ?? 0);
  const [score2, setScore2] = useState(existing?.predTeam2Score ?? 0);
  const [saving, setSaving] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasPredicted = !!existing;
  const canPredict = !hasPredicted && !isLocked && !isFinished;

  async function handleSave() {
    const selectedTeamId = score1 > score2 ? match.team1Id : score1 < score2 ? match.team2Id : null;
    if (!selectedTeamId || saving) return;
    setSaving(true);
    try {
      await savePrediction(match.id, selectedTeamId, score1, score2);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const statusColor = match.status === "LIVE" ? "var(--color-danger)" : match.status === "FINISHED" ? "var(--text-muted)" : "var(--orange-400)";
  const statusLabel = match.status === "LIVE" ? "AO VIVO" : match.status === "FINISHED" ? "ENCERRADO" : new Date(match.startTime).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>
          {match.tournament} · {match.serie} · BO{match.bestOf}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: statusColor, display: "flex", alignItems: "center", gap: 4 }}>
          {match.status === "LIVE" && <Activity size={10} />}
          {statusLabel}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <TeamLogo src={match.team1Logo} name={match.team1} size={48} />
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", textAlign: "center", minHeight: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>{match.team1}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          {isFinished || match.status === "LIVE" ? (
            <div style={{ fontSize: 28, fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-1px" }}>
              {match.team1Score ?? 0} <span style={{ color: "var(--text-muted)", fontSize: 18 }}>×</span> {match.team2Score ?? 0}
            </div>
          ) : (
            <div style={{ fontSize: 14, color: "var(--text-muted)" }}>vs</div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <TeamLogo src={match.team2Logo} name={match.team2} size={48} />
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", textAlign: "center", minHeight: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>{match.team2}</div>
        </div>
      </div>

      {canPredict && (
        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textAlign: "center" }}>Seu Palpite</div>

          {score1 !== score2 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8,
              background: "var(--orange-glow)", border: "1px solid var(--orange-500)" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--orange-400)" }}>
                Vencedor: {score1 > score2 ? match.team1 : match.team2}
              </span>
            </div>
          )}
          {score1 === score2 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8,
              background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>
                Defina o placar de mapas para indicar o vencedor
              </span>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)" }}>{match.team1}</span>
              <MapScoreInput value={score1} onChange={(v) => { setScore1(v); }} max={match.bestOf} />
            </div>
            <span style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 700 }}>×</span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)" }}>{match.team2}</span>
              <MapScoreInput value={score2} onChange={(v) => { setScore2(v); }} max={match.bestOf} />
            </div>
          </div>

          <button onClick={handleSave} disabled={score1 === score2 || saving}
            style={{
              padding: "10px 0", borderRadius: 10, border: "none", cursor: score1 !== score2 ? "pointer" : "not-allowed",
              background: saved ? "var(--color-success, #22c55e)" : "var(--orange-500)",
              color: "white", fontWeight: 700, fontSize: 13, opacity: score1 !== score2 ? 1 : 0.5, transition: "all 0.15s",
            }}>
            {saved ? "✓ Palpite salvo!" : saving ? "Salvando..." : hasPredicted ? "Atualizar palpite" : "Confirmar palpite"}
          </button>
        </div>
      )}

      {hasPredicted && (isLocked || isFinished) && (
        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={14} color="var(--orange-500)" />
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Palpite: {existing.predTeamId === match.team1Id ? match.team1 : match.team2} · {existing.predTeam1Score}×{existing.predTeam2Score}
          </span>
          <button onClick={() => setShowAll(true)} style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "var(--orange-500)", background: "var(--orange-glow)", border: "none", padding: "4px 8px", borderRadius: 6, cursor: "pointer" }}>Ver todos</button>
        </div>
      )}

      <AnimatePresence>
        {showAll && <Cs2AllPredictionsModal match={match} onClose={() => setShowAll(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Cs2Page() {
  const [tab, setTab] = useState<Tab>("upcoming");
  const { matches: upcoming, loading: upLoading } = useCs2Matches("UPCOMING", 50);
  const { matches: live, loading: liveLoading } = useCs2Matches("LIVE", 20);
  const { matches: finished, loading: finishedLoading } = useCs2Matches("FINISHED", 30);

  const matches = tab === "upcoming" ? upcoming : tab === "live" ? live : finished;
  const loading = tab === "upcoming" ? upLoading : tab === "live" ? liveLoading : finishedLoading;

  const tabs = [
    { key: "upcoming" as Tab, label: "Próximos", icon: Calendar, count: upcoming.length },
    { key: "live" as Tab, label: "Ao Vivo", icon: Activity, count: live.length },
    { key: "finished" as Tab, label: "Encerrados", icon: CheckCircle2, count: finished.length },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-base)", padding: "36px 28px 48px" }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Gamepad2 size={22} color="var(--orange-500)" />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>Counter-Strike 2</h1>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Palpites para os melhores torneios de CS2 — Majors, BLAST, IEM e ESL.</p>
      </motion.div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10,
            border: `1px solid ${tab === key ? "var(--orange-500)" : "var(--border-subtle)"}`,
            background: tab === key ? "var(--orange-glow)" : "transparent",
            color: tab === key ? "var(--orange-400)" : "var(--text-muted)",
            fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all 0.15s",
          }}>
            <Icon size={14} />
            {label}
            {count > 0 && (
              <span style={{
                backgroundColor: tab === key ? "var(--orange-500)" : "var(--bg-elevated)",
                color: tab === key ? "white" : "var(--text-muted)",
                borderRadius: 20, padding: "1px 7px", fontSize: 11, fontWeight: 700,
              }}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {[1, 2, 3].map((i) => <div key={i} style={{ height: 200, backgroundColor: "var(--bg-surface)", borderRadius: 16, border: "1px solid var(--border-subtle)" }} />)}
        </div>
      ) : matches.length === 0 ? (
        <div style={{ padding: "64px 24px", textAlign: "center", backgroundColor: "var(--bg-surface)", borderRadius: 16, border: "1px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>🎮</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
            {tab === "live" ? "Nenhuma partida ao vivo agora" : tab === "upcoming" ? "Nenhuma partida agendada" : "Nenhuma partida encerrada"}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {tab === "upcoming" && !process.env.NEXT_PUBLIC_HAS_PANDASCORE && "Configure a PANDASCORE_API_KEY para ativar o módulo CS2."}
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {matches.map((m) => <Cs2MatchCard key={m.id} match={m} />)}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
