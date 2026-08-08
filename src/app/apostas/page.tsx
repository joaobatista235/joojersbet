"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Shuffle, CheckCircle2, Clock, Trophy } from "lucide-react";
import { useCustomEvents } from "@/hooks/useCustomEvents";
import { useCustomPredictions } from "@/hooks/useCustomPredictions";
import type { CustomEvent } from "@/hooks/useCustomEvents";

function EventCard({ event }: { event: CustomEvent }) {
  const { byEvent, savePrediction } = useCustomPredictions();
  const existing = byEvent.get(event.id);
  const isLocked = existing?.locked ?? false;
  const isOpen = event.status === "open";

  const [selected, setSelected] = useState<string | null>(existing?.chosenOption ?? null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const canPredict = isOpen && !isLocked;
  const deadline = event.deadline ? new Date(event.deadline) : null;
  const isPastDeadline = deadline ? deadline < new Date() : false;

  async function handleSave() {
    if (!selected || saving) return;
    setSaving(true);
    try {
      await savePrediction(event.id, selected);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const statusColor = event.status === "open" ? "var(--orange-400)" : event.status === "resolved" ? "#22c55e" : "var(--text-muted)";
  const statusLabel = event.status === "open" ? "Aberto" : event.status === "resolved" ? "Encerrado" : "Fechado";

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{event.title}</h3>
          {event.description && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{event.description}</p>}
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, padding: "3px 8px", borderRadius: 6, border: `1px solid ${statusColor}`, opacity: 0.9, whiteSpace: "nowrap" }}>{statusLabel}</span>
      </div>

      {deadline && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: isPastDeadline ? "#ef4444" : "var(--text-muted)" }}>
          <Clock size={13} />
          {isPastDeadline ? "Prazo encerrado" : `Prazo: ${deadline.toLocaleString("pt-BR")}`}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {event.options.map((option) => {
          const isSelected = selected === option;
          const isResolved = event.resolvedOption === option;
          const isPrediction = existing?.chosenOption === option;
          return (
            <button key={option} onClick={() => canPredict && !isPastDeadline && setSelected(option)}
              style={{
                padding: "12px 16px", borderRadius: 10, textAlign: "left",
                border: `1px solid ${isResolved ? "#22c55e" : isSelected ? "var(--orange-500)" : "var(--border-subtle)"}`,
                background: isResolved ? "rgba(34,197,94,0.08)" : isSelected ? "var(--orange-glow)" : "var(--bg-elevated)",
                cursor: canPredict && !isPastDeadline ? "pointer" : "default",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                transition: "all 0.15s",
              }}>
              <span style={{ fontSize: 14, fontWeight: isSelected ? 700 : 500, color: isResolved ? "#22c55e" : isSelected ? "var(--orange-400)" : "var(--text-primary)" }}>
                {option}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {isPrediction && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--orange-400)", padding: "2px 6px", borderRadius: 4, backgroundColor: "var(--orange-glow)" }}>Seu palpite</span>}
                {isResolved && <Trophy size={14} color="#22c55e" />}
              </div>
            </button>
          );
        })}
      </div>

      {canPredict && !isPastDeadline && (
        <button onClick={handleSave} disabled={!selected || saving} style={{
          padding: "11px 0", borderRadius: 10, border: "none", cursor: selected ? "pointer" : "not-allowed",
          background: saved ? "#22c55e" : "var(--orange-500)", color: "white",
          fontWeight: 700, fontSize: 13, opacity: selected ? 1 : 0.5, transition: "all 0.15s",
        }}>
          {saved ? "✓ Palpite salvo!" : saving ? "Salvando..." : existing ? "Atualizar palpite" : "Confirmar palpite"}
        </button>
      )}

      {existing && (isLocked || !isOpen) && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
          <CheckCircle2 size={14} color="var(--orange-500)" />
          Seu palpite: <strong style={{ color: "var(--text-primary)" }}>{existing.chosenOption}</strong>
          {event.resolvedOption && (
            existing.chosenOption === event.resolvedOption
              ? <span style={{ color: "#22c55e", fontWeight: 700 }}>+15 pts ✓</span>
              : <span style={{ color: "#ef4444" }}>0 pts ✗</span>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function ApostasPage() {
  const { events: openEvents, loading: openLoading } = useCustomEvents("open");
  const { events: resolvedEvents, loading: resolvedLoading } = useCustomEvents("resolved");
  const [tab, setTab] = useState<"open" | "resolved">("open");

  const events = tab === "open" ? openEvents : resolvedEvents;
  const loading = tab === "open" ? openLoading : resolvedLoading;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-base)", padding: "36px 28px 48px" }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Shuffle size={22} color="var(--orange-500)" />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>Apostas</h1>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Apostas especiais criadas pelos administradores. Acerte e ganhe 15 pontos.</p>
      </motion.div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {(["open", "resolved"] as const).map((key) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: "9px 16px", borderRadius: 10,
            border: `1px solid ${tab === key ? "var(--orange-500)" : "var(--border-subtle)"}`,
            background: tab === key ? "var(--orange-glow)" : "transparent",
            color: tab === key ? "var(--orange-400)" : "var(--text-muted)",
            fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all 0.15s",
          }}>
            {key === "open" ? "Abertas" : "Encerradas"}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[1, 2].map((i) => <div key={i} style={{ height: 200, backgroundColor: "var(--bg-surface)", borderRadius: 16, border: "1px solid var(--border-subtle)" }} />)}
        </div>
      ) : events.length === 0 ? (
        <div style={{ padding: "64px 24px", textAlign: "center", backgroundColor: "var(--bg-surface)", borderRadius: 16, border: "1px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>🎲</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
            {tab === "open" ? "Nenhuma aposta aberta no momento" : "Nenhuma aposta encerrada ainda"}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 640 }}>
          {events.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      )}
    </div>
  );
}
