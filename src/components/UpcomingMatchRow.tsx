"use client";

import { motion } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import type { Prediction } from "@/lib/predictions";

interface UpcomingMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string | null;
  awayLogo?: string | null;
  time: string; // Will act as full date string or just time
  competition: string;
  group: string;
  status?: string;
  homeScore?: number | null;
  awayScore?: number | null;
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
  isProfile = false,
}: {
  match: UpcomingMatch;
  delay?: number;
  isProfile?: boolean;
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
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {match.homeLogo && <img src={`/api/image-proxy?url=${encodeURIComponent(match.homeLogo)}`} alt={match.homeTeam} style={{ width: 16, height: 16, objectFit: "contain" }} />}
            {match.homeTeam}
          </div>
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>×</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {match.awayLogo && <img src={`/api/image-proxy?url=${encodeURIComponent(match.awayLogo)}`} alt={match.awayTeam} style={{ width: 16, height: 16, objectFit: "contain" }} />}
            {match.awayTeam}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
          <span>{match.competition} · {match.group}</span>
          {match.status === "FINISHED" && match.homeScore !== undefined && match.awayScore !== undefined && (
            <span style={{ fontWeight: 700, color: "var(--text-primary)", background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: 4 }}>
              Resultado: {match.homeScore} × {match.awayScore}
            </span>
          )}
          {match.status === "FINISHED" && match.prediction?.pointsEarned !== undefined && match.prediction.pointsEarned > 0 && (
            <span style={{ fontWeight: 700, color: "#22c55e", background: "rgba(34,197,94,0.1)", padding: "2px 6px", borderRadius: 4 }}>
              +{match.prediction.pointsEarned} pts
            </span>
          )}
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
      {!isProfile && (
        <div style={{ flexShrink: 0 }}>
          {isLocked ? (
            /* Bloqueado — jogo já começou */
            <button className="btn-done" style={{ cursor: "default" }}>
              <Check size={12} />
              Fechado
            </button>
          ) : hasPrediction ? (
            /* Tem palpite e não pode editar mais */
            <button
              className="btn-done"
              style={{ padding: "6px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 4, cursor: "default", opacity: 0.8 }}
            >
              <Check size={12} />
              Palpitado
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
      )}
    </motion.div>
  );
}
