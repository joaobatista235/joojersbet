"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Activity } from "lucide-react";
import { useMatches } from "@/hooks/useMatches";

function TeamLogo({
  src,
  alt,
  name,
  size = 48,
}: {
  src?: string | null;
  alt: string;
  name: string;
  size?: number;
}) {
  const [imageSrc, setImageSrc] = useState(src ?? "");
  const [hasError, setHasError] = useState(!src);

  useEffect(() => {
    setImageSrc(src ?? "");
    setHasError(!src);
  }, [src]);

  const fallbackSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "Time")}&background=random&color=fff&size=${size * 2}`;

  if (!imageSrc || hasError) {
    return (
      <img
        src={fallbackSrc}
        alt={alt}
        loading="lazy"
        style={{ width: size, height: size, objectFit: "cover", borderRadius: "50%" }}
      />
    );
  }
    const displaySrc = imageSrc.includes("media.api-sports.io")
      ? `/api/image-proxy?url=${encodeURIComponent(imageSrc)}`
      : imageSrc;

    return (
      <img
        src={displaySrc}
        alt={alt}
        loading="lazy"
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        style={{ width: size, height: size, objectFit: "contain", borderRadius: "50%" }}
      />
    );
}

export default function AoVivoPage() {
  const { matches, loading } = useMatches("LIVE");

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-base)",
        padding: "36px 28px 48px",
      }}
    >
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ marginBottom: 28 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div
            style={{
              width: 12,
              height: 12,
              backgroundColor: "var(--color-danger)",
              borderRadius: "50%",
              boxShadow: "0 0 12px var(--color-danger)",
              animation: "pulse-red 1.5s infinite ease-in-out",
            }}
          />
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.5px",
            }}
          >
            Central Ao Vivo
          </h1>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 22 }}>
          Placares e estatísticas atualizadas em tempo real.
        </p>
      </motion.div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: 140,
                backgroundColor: "var(--bg-surface)",
                borderRadius: 16,
                border: "1px solid var(--border-subtle)",
              }}
            />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{
            padding: "64px 24px",
            textAlign: "center",
            backgroundColor: "var(--bg-surface)",
            borderRadius: 16,
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>🏟️</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
            Nenhuma partida ao vivo no momento
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Volte mais tarde ou confira os próximos jogos.
          </div>
        </motion.div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {matches.map((match, i) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="card"
              style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}
            >
              {/* Status Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                  <img
                    src={match.competitionLogo && match.competitionLogo.includes("media.api-sports.io")
                      ? `/api/image-proxy?url=${encodeURIComponent(match.competitionLogo)}`
                      : match.competitionLogo}
                    alt={match.competition}
                    loading="lazy"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                    style={{ width: 14, height: 14, objectFit: "contain" }}
                  />
                  {match.competition}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-danger)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Activity size={12} />
                  {match.minute}&apos;
                </div>
              </div>

              {/* Scoreboard */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                {/* Home */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1 }}>
                  <TeamLogo src={match.homeLogo} alt={match.homeTeam} name={match.homeTeam} size={48} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", textAlign: "center" }}>
                    {match.homeTeam}
                  </div>
                </div>

                {/* Score */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 16px" }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)" }}>
                    {match.homeScore}
                  </div>
                  <div style={{ fontSize: 16, color: "var(--text-muted)" }}>-</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)" }}>
                    {match.awayScore}
                  </div>
                </div>

                {/* Away */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1 }}>
                  <TeamLogo src={match.awayLogo} alt={match.awayTeam} name={match.awayTeam} size={48} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", textAlign: "center" }}>
                    {match.awayTeam}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
