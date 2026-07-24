"use client";

import { motion } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import type { Prediction } from "@/lib/predictions";

interface UpcomingMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  time: string;
  competition: string;
  group: string;
  /** Palpite já feito (ou undefined/null se não tem) */
  prediction?: Prediction | null;
  /** Callback para abrir o modal de palpite */
  onPredict?: () => void;
  /** Callback para abrir modal de todos os palpites */
  onViewAllPredictions?: () => void;
}

export function UpcomingMatchRow({
  match,
  delay = 0,
}: {
  match: UpcomingMatch;
  delay?: number;
}) {
  const hasPrediction = Boolean(match.prediction);
  const isLocked = match.prediction?.locked ?? false;

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 0",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      {/* Teams */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {match.homeTeam} × {match.awayTeam}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {match.competition} · {match.group}
        </div>

        {/* Palpite existente */}
        {hasPrediction && match.prediction && (
          <div
            style={{
              marginTop: 5,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--orange-400)" }}>
              <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                Palpite:
              </span>
              {match.prediction.homeGoals} × {match.prediction.awayGoals}
            </div>
            {match.onViewAllPredictions && (
              <button
                onClick={match.onViewAllPredictions}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-default)",
                  padding: "2px 8px",
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4
                }}
              >
                👥 Galera
              </button>
            )}
          </div>
        )}
      </div>

      {/* Time */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-secondary)",
          flexShrink: 0,
          minWidth: 40,
          textAlign: "right",
        }}
      >
        {match.time}
      </div>

      {/* Action */}
      <div style={{ flexShrink: 0 }}>
        {isLocked ? (
          /* Bloqueado — jogo já começou */
          <button className="btn-done" style={{ cursor: "default" }}>
            <Check size={12} />
            Fechado
          </button>
        ) : hasPrediction ? (
          /* Tem palpite e ainda pode editar */
          <button
            className="btn-ghost"
            style={{ padding: "6px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
            onClick={match.onPredict}
          >
            Editar
            <ChevronRight size={12} />
          </button>
        ) : (
          /* Sem palpite */
          <button
            className="btn-orange"
            style={{ padding: "7px 16px", fontSize: 13 }}
            onClick={match.onPredict}
          >
            Palpitar
          </button>
        )}
      </div>
    </motion.div>
  );
}
