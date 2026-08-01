"use client";

import { motion } from "framer-motion";
import { Clock } from "lucide-react";

interface LiveMatch {
  id: string;
  homeTeam: string;
  homeLogo?: string;
  awayTeam: string;
  awayLogo?: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  competition: string;
  group: string;
  userPrediction?: string;
  pointsEarned?: number;
}


interface LiveMatchCardProps {
  match: LiveMatch;
  delay?: number;
}

export function LiveMatchCard({ match, delay = 0 }: LiveMatchCardProps) {
  const renderLogo = (src?: string, name?: string) => {
    if (!src) {
      return (
        <img
          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name || "Time")}&background=random&color=fff&size=48`}
          alt={name}
          style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }}
        />
      );
    }
    const displaySrc = src.includes("media.api-sports.io")
      ? `/api/image-proxy?url=${encodeURIComponent(src)}`
      : src;
    return (
      <img
        src={displaySrc}
        alt={name}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        style={{ width: 24, height: 24, objectFit: "contain" }}
        onError={(e) => {
          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "Time")}&background=random&color=fff&size=48`;
        }}
      />
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
      style={{
        backgroundColor: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 12,
        padding: "16px 18px",
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
        transition: "border-color 0.15s ease",
        cursor: "pointer",
      }}
      onHoverStart={(e) => {
        (e.target as HTMLElement).closest("[data-live-card]")?.setAttribute(
          "style",
          "border-color: var(--border-default)"
        );
      }}
    >
      {/* Teams + scores */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Home */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "24px 1fr 32px",
            gap: 8,
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          {renderLogo(match.homeLogo, match.homeTeam)}
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {match.homeTeam}
          </span>
          <span
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--text-primary)",
              textAlign: "right",
            }}
          >
            {match.homeScore}
          </span>
        </div>
        {/* Away */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "24px 1fr 32px",
            gap: 8,
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          {renderLogo(match.awayLogo, match.awayTeam)}
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {match.awayTeam}
          </span>
          <span
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--text-primary)",
              textAlign: "right",
            }}
          >
            {match.awayScore}
          </span>
        </div>
        {/* Competition */}
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {match.competition} · {match.group}
        </div>
      </div>

      {/* Right: minute + prediction */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 8,
          flexShrink: 0,
        }}
      >
        {/* Minute */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 13,
            fontWeight: 700,
            color: "var(--orange-400)",
          }}
        >
          <Clock size={12} />
          {match.minute}&apos;
        </div>

        {/* Prediction */}
        {match.userPrediction && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>
              Seu palpite:
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
              {match.userPrediction}
            </div>
            {match.pointsEarned !== undefined && (
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--orange-500)",
                  marginTop: 2,
                }}
              >
                +{match.pointsEarned} pts
              </div>
            )}
          </div>
        )}

        {!match.userPrediction && (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>aguardando</div>
        )}
      </div>
    </motion.div>
  );
}
