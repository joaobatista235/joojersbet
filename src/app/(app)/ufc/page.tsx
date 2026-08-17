"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UfcAllPredictionsModal } from "@/components/UfcAllPredictionsModal";
import { Activity, Calendar, CheckCircle2, Swords } from "lucide-react";
import { useUfcFights } from "@/hooks/useUfcFights";
import { useUfcPredictions } from "@/hooks/useUfcPredictions";
import type { UfcFight, UfcMethod } from "@/lib/api-mma/types";

type Tab = "upcoming" | "live" | "finished";

const UFC_METHODS: UfcMethod[] = ["KO/TKO", "Submission", "Decision", "Other"];

function FighterPhoto({ src, name, size = 72 }: { src?: string | null; name: string; size?: number }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%", background: "var(--bg-elevated)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.32, fontWeight: 800, color: "var(--text-muted)",
        border: "2px solid var(--border-subtle)", flexShrink: 0,
      }}>
        {name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
      </div>
    );
  }
  return (
    <img src={src} alt={name} onError={() => setError(true)} style={{
      width: size, height: size, borderRadius: "50%", objectFit: "cover",
      border: "2px solid var(--border-subtle)", flexShrink: 0,
    }} />
  );
}

function UfcFightCard({ fight, byFight, savePrediction, predsLoading }: { fight: UfcFight, byFight: Map<string, any>, savePrediction: any, predsLoading: boolean }) {
  const existing = byFight.get(fight.id);
  const isLocked = existing?.locked ?? false;
  const isFinished = fight.status === "FINISHED";
  const hasPredicted = !!existing;
  const canPredict = !hasPredicted && !isLocked && !isFinished;
  if (predsLoading) return <div className="card" style={{ padding: 20, height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>Carregando...</div>;

  const [selectedFighterId, setSelectedFighterId] = useState<number | null>(existing?.predFighterId ?? null);
  const [selectedMethod, setSelectedMethod] = useState<UfcMethod | null>(existing?.predMethod ?? null);
  const [saving, setSaving] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [saved, setSaved] = useState(false);

  const statusColor = fight.status === "LIVE" ? "#ef4444" : fight.status === "FINISHED" ? "var(--text-muted)" : "var(--orange-400)";
  const statusLabel = fight.status === "LIVE" ? "AO VIVO" : fight.status === "FINISHED" ? "ENCERRADO"
    : new Date(fight.startTime).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const winnerName = fight.winnerId
    ? (fight.winnerId === fight.fighter1Id ? fight.fighter1 : fight.fighter2)
    : null;

  async function handleSave() {
    if (!selectedFighterId || saving) return;
    setSaving(true);
    try {
      await savePrediction(fight.id, selectedFighterId, selectedMethod);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>{fight.weightClass}</span>
          {fight.isTitleFight && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, backgroundColor: "rgba(234,179,8,0.15)", color: "#eab308" }}>🏆 CINTURÃO</span>
          )}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: statusColor, display: "flex", alignItems: "center", gap: 4 }}>
          {fight.status === "LIVE" && <Activity size={10} />}
          {statusLabel}
        </div>
      </div>

      <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>{fight.eventName}</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <FighterPhoto src={fight.fighter1Photo} name={fight.fighter1} />
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", textAlign: "center" }}>{fight.fighter1}</div>
          {isFinished && fight.winnerId === fight.fighter1Id && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "#22c55e", backgroundColor: "rgba(34,197,94,0.1)", padding: "2px 8px", borderRadius: 10 }}>VENCEDOR</span>
          )}
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "var(--text-muted)" }}>VS</div>
          {isFinished && fight.method && (
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginTop: 4 }}>{fight.method}</div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <FighterPhoto src={fight.fighter2Photo} name={fight.fighter2} />
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", textAlign: "center" }}>{fight.fighter2}</div>
          {isFinished && fight.winnerId === fight.fighter2Id && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "#22c55e", backgroundColor: "rgba(34,197,94,0.1)", padding: "2px 8px", borderRadius: 10 }}>VENCEDOR</span>
          )}
        </div>
      </div>

      {canPredict && (
        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textAlign: "center" }}>Seu Palpite</div>

          <div style={{ display: "flex", gap: 8 }}>
            {[{ id: fight.fighter1Id, name: fight.fighter1, photo: fight.fighter1Photo },
              { id: fight.fighter2Id, name: fight.fighter2, photo: fight.fighter2Photo }].map((f) => (
              <button key={f.id} onClick={() => setSelectedFighterId(f.id)} style={{
                flex: 1, padding: "10px 8px", borderRadius: 10,
                border: `1px solid ${selectedFighterId === f.id ? "var(--orange-500)" : "var(--border-subtle)"}`,
                background: selectedFighterId === f.id ? "var(--orange-glow)" : "var(--bg-elevated)",
                cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transition: "all 0.15s",
              }}>
                <FighterPhoto src={f.photo} name={f.name} size={36} />
                <span style={{ fontSize: 11, fontWeight: 600, color: selectedFighterId === f.id ? "var(--orange-400)" : "var(--text-secondary)", textAlign: "center" }}>{f.name}</span>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>Método (bônus +5 pts):</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {UFC_METHODS.map((method) => (
                <button key={method} onClick={() => setSelectedMethod(selectedMethod === method ? null : method)} style={{
                  padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${selectedMethod === method ? "var(--orange-500)" : "var(--border-subtle)"}`,
                  background: selectedMethod === method ? "var(--orange-glow)" : "var(--bg-elevated)",
                  color: selectedMethod === method ? "var(--orange-400)" : "var(--text-muted)", transition: "all 0.15s",
                }}>{method}</button>
              ))}
            </div>
          </div>

          <button onClick={handleSave} disabled={!selectedFighterId || saving} style={{
            padding: "10px 0", borderRadius: 10, border: "none", cursor: selectedFighterId ? "pointer" : "not-allowed",
            background: saved ? "#22c55e" : "var(--orange-500)", color: "white",
            fontWeight: 700, fontSize: 13, opacity: selectedFighterId ? 1 : 0.5, transition: "all 0.15s",
          }}>
            {saved ? "✓ Palpite salvo!" : saving ? "Salvando..." : existing ? "Atualizar palpite" : "Confirmar palpite"}
          </button>
        </div>
      )}

      {existing && (
        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={14} color="var(--orange-500)" />
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Palpite: {existing.predFighterId === fight.fighter1Id ? fight.fighter1 : fight.fighter2}
            {existing.predMethod && ` por ${existing.predMethod}`}
          </span>
          <button onClick={() => setShowAll(true)} style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "var(--orange-500)", background: "var(--orange-glow)", border: "none", padding: "4px 8px", borderRadius: 6, cursor: "pointer" }}>Ver todos</button>
        </div>
      )}
      <AnimatePresence>
        {showAll && <UfcAllPredictionsModal match={fight} onClose={() => setShowAll(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}

export default function UfcPage() {
  const { byFight, savePrediction, loading: predsLoading } = useUfcPredictions();
  const [tab, setTab] = useState<Tab>("upcoming");
  const { fights: upcoming, loading: upLoading } = useUfcFights("UPCOMING", 50);
  const { fights: live, loading: liveLoading } = useUfcFights("LIVE", 20);
  const { fights: finished, loading: finishedLoading } = useUfcFights("FINISHED", 30);

  const fights = tab === "upcoming" ? upcoming : tab === "live" ? live : finished;
  const loading = tab === "upcoming" ? upLoading : tab === "live" ? liveLoading : finishedLoading;

  const tabs = [
    { key: "upcoming" as Tab, label: "Próximas", icon: Calendar, count: upcoming.length },
    { key: "live" as Tab, label: "Ao Vivo", icon: Activity, count: live.length },
    { key: "finished" as Tab, label: "Encerradas", icon: CheckCircle2, count: finished.length },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-base)", padding: "36px 28px 48px" }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Swords size={22} color="var(--orange-500)" />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>UFC</h1>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Palpites nas lutas do Ultimate Fighting Championship.</p>
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
          {[1, 2, 3].map((i) => <div key={i} style={{ height: 280, backgroundColor: "var(--bg-surface)", borderRadius: 16, border: "1px solid var(--border-subtle)" }} />)}
        </div>
      ) : fights.length === 0 ? (
        <div style={{ padding: "64px 24px", textAlign: "center", backgroundColor: "var(--bg-surface)", borderRadius: 16, border: "1px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>🥊</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
            {tab === "live" ? "Nenhuma luta ao vivo agora" : tab === "upcoming" ? "Nenhuma luta agendada" : "Nenhuma luta encerrada"}
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {fights.map((f) => <UfcFightCard key={f.id} fight={f} byFight={byFight} savePrediction={savePrediction} predsLoading={predsLoading} />)}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
