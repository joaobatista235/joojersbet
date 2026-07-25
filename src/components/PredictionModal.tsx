"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  createPrediction,
  type Prediction,
} from "@/lib/predictions";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Match } from "@/lib/api-football/types";

interface PredictionModalProps {
  match: Match | null;
  existingPrediction?: Prediction | null;
  onClose: () => void;
  onSaved?: (prediction: Prediction) => void;
}

function GoalInput({
  value,
  onChange,
  label,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--text-secondary)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: 110,
          textAlign: "center",
        }}
      >
        {label}
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={disabled || value === 0}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            color: "var(--text-primary)",
            fontSize: 20,
            fontWeight: 700,
            cursor: disabled || value === 0 ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: disabled || value === 0 ? 0.4 : 1,
            transition: "all 0.1s ease",
          }}
        >
          −
        </button>

        <motion.span
          key={value}
          initial={{ scale: 1.3, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.12 }}
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: "var(--text-primary)",
            minWidth: 56,
            textAlign: "center",
            lineHeight: 1,
          }}
        >
          {value}
        </motion.span>

        <button
          onClick={() => onChange(Math.min(20, value + 1))}
          disabled={disabled}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            backgroundColor: "var(--orange-500)",
            border: "none",
            color: "white",
            fontSize: 20,
            fontWeight: 700,
            cursor: disabled ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: disabled ? 0.4 : 1,
            transition: "all 0.1s ease",
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function PredictionModal({
  match,
  existingPrediction,
  onClose,
  onSaved,
}: PredictionModalProps) {
  const { user } = useAuth();
  const [homeGoals, setHomeGoals] = useState(0);
  const [awayGoals, setAwayGoals] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingPrediction) {
      setHomeGoals(existingPrediction.homeGoals);
      setAwayGoals(existingPrediction.awayGoals);
    } else {
      setHomeGoals(0);
      setAwayGoals(0);
    }
    setSaved(false);
    setError(null);
  }, [existingPrediction, match]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const isLocked =
    Boolean(existingPrediction) ||
    (match ? new Date(match.startTime) <= new Date() : false);

  const handleSave = useCallback(async () => {
    if (!user || !match || isLocked || saving) return;

    setSaving(true);
    setError(null);

    try {
      const result = await createPrediction(user.uid, {
        matchId: match.id,
        homeGoals,
        awayGoals,
      });

      if (db) {
        await addDoc(collection(db, "feedEvents"), {
          userId: user.uid,
          user: user.name || "Jogador",
          initials: user.initials || "?",
          avatarColor: "#f97316",
          photoURL: user.photoURL || null,
          message: `fez um palpite no jogo ${match.homeTeam} × ${match.awayTeam}`,
          createdAt: serverTimestamp(),
        });
      }

      setSaved(true);
      onSaved?.(result);

      setTimeout(() => onClose(), 900);
    } catch (err) {
      setError("Erro ao salvar palpite. Tente novamente.");
      console.error("[PredictionModal]", err);
    } finally {
      setSaving(false);
    }
  }, [user, match, isLocked, saving, homeGoals, awayGoals, onSaved, onClose]);

  if (!match) return null;

  const matchTime = new Date(match.startTime).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

  const matchDate = new Date(match.startTime).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Sao_Paulo",
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: 20,
            width: "100%",
            maxWidth: 420,
            overflow: "hidden",
            boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              padding: "20px 24px 16px",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: "var(--orange-glow)",
                border: "1px solid rgba(249,115,22,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Trophy size={18} color="var(--orange-500)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                {isLocked ? "Palpite encerrado" : "Fazer palpite"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                {match.competition} · {match.round} · {matchDate} às {matchTime}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                backgroundColor: "transparent",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* ── Scoreboard ── */}
          <div style={{ padding: "28px 24px 24px" }}>
            {/* Teams + inputs */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                gap: 16,
                alignItems: "center",
                marginBottom: 28,
              }}
            >
              <GoalInput
                label={match.homeTeam}
                value={homeGoals}
                onChange={setHomeGoals}
                disabled={isLocked}
              />

              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "var(--text-muted)",
                  paddingTop: 28,
                }}
              >
                ×
              </div>

              <GoalInput
                label={match.awayTeam}
                value={awayGoals}
                onChange={setAwayGoals}
                disabled={isLocked}
              />
            </div>

            {/* Pontuação informativa */}
            <div
              style={{
                backgroundColor: "var(--bg-elevated)",
                borderRadius: 10,
                padding: "12px 16px",
                marginBottom: 20,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>
                SISTEMA DE PONTUAÇÃO
              </div>
              {[
                ["Placar exato", "15 pts"],
                ["Vencedor + diferença de gols", "10 pts"],
                ["Vencedor certo", "5 pts"],
              ].map(([label, pts]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  <span>{label}</span>
                  <span style={{ fontWeight: 600, color: "var(--orange-400)" }}>{pts}</span>
                </div>
              ))}
            </div>

            {/* Aviso de bloqueio */}
            {isLocked && (
              <div
                style={{
                  backgroundColor: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 12,
                  color: "#f87171",
                  marginBottom: 20,
                  textAlign: "center",
                }}
              >
                ⛔ Palpites encerrados
              </div>
            )}

            {/* Erro */}
            {error && (
              <div
                style={{
                  backgroundColor: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 12,
                  color: "#f87171",
                  marginBottom: 16,
                  textAlign: "center",
                }}
              >
                {error}
              </div>
            )}

            {/* Botão de ação */}
            {!isLocked && (
              <button
                onClick={handleSave}
                disabled={saving || saved}
                style={{
                  width: "100%",
                  padding: "13px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: saving || saved ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.15s ease",
                  backgroundColor: saved
                    ? "rgba(34,197,94,0.15)"
                    : "var(--orange-500)",
                  color: saved ? "var(--color-success)" : "white",
                  border: saved
                    ? "1px solid rgba(34,197,94,0.3)"
                    : "none",
                }}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                    Salvando...
                  </>
                ) : saved ? (
                  <>
                    <Check size={16} />
                    Salvo!
                  </>
                ) : (
                  "Confirmar palpite"
                )}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
