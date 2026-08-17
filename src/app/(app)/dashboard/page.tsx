"use client";
import { X } from "lucide-react";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Medal, Target, Clock3, ChevronRight, Wifi } from "lucide-react";
import Link from "next/link";
import { StatCard } from "@/components/StatCard";
import { LiveMatchCard } from "@/components/LiveMatchCard";
import { UpcomingMatchRow } from "@/components/UpcomingMatchRow";
import { FeedEvent } from "@/components/FeedEvent";
import { RankingRow } from "@/components/RankingRow";
import { PredictionModal } from "@/components/PredictionModal";
import { useMatches } from "@/hooks/useMatches";
import { useUserScore } from "@/hooks/useUserScore";
import { usePredictions } from "@/hooks/usePredictions";
import { useRanking } from "@/hooks/useRanking";
import { useFeed } from "@/hooks/useFeed";
import { useAuth } from "@/contexts/AuthContext";
import type { Match } from "@/lib/api-football/types";

/* ─── Mock data (Ranking usa Firestore) ─── */

const rankingEntries = [
  { position: 1, name: "Carla R.", initials: "CR", avatarColor: "#8b5cf6", points: 412 },
  { position: 2, name: "Lucas M.", initials: "LM", avatarColor: "#3b82f6", points: 389 },
  { position: 3, name: "Pedro A.", initials: "PA", avatarColor: "#06b6d4", points: 371 },
  { position: 12, name: "João B.", initials: "JB", avatarColor: "#f97316", points: 347, isMe: true },
  { position: 13, name: "Mari F.", initials: "MF", avatarColor: "#ec4899", points: 341 },
];

/* ─── Skeleton ──────────────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div
      style={{
        borderRadius: 12,
        backgroundColor: "var(--bg-elevated)",
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    >
      <div
        style={{
          height: 12,
          borderRadius: 6,
          backgroundColor: "var(--border-default)",
          width: "60%",
        }}
      />
      <div
        style={{
          height: 20,
          borderRadius: 6,
          backgroundColor: "var(--border-default)",
          width: "40%",
        }}
      />
          </div>
  );
}


function EmptyState({ label }: { label: string }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "32px 16px",
        color: "var(--text-muted)",
        fontSize: 13,
      }}
    >
      {label}
    </div>
  );
}

/* ─── Adaptar Match do Firestore para o formato esperado por LiveMatchCard ─── */

function toLiveCardProps(match: Match) {
  return {
    id: match.id,
    homeTeam: match.homeTeam,
    homeLogo: match.homeLogo,
    awayTeam: match.awayTeam,
    awayLogo: match.awayLogo,
    homeScore: match.homeScore ?? 0,
    awayScore: match.awayScore ?? 0,
    minute: match.minute ?? 0,
    competition: match.competition,
    group: match.round,
    userPrediction: undefined,
    pointsEarned: undefined,
  };
}

function toUpcomingRowProps(match: Match) {
  const time = new Date(match.startTime).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  return {
    id: match.id,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    time,
    competition: match.competition,
    group: match.round,
    predicted: false,
  };
}

/* ─── Section Header ────────────────────────────────────────── */
function SectionHeader({
  title,
  linkLabel,
  linkHref,
  badge,
}: {
  title: string;
  linkLabel?: string;
  linkHref?: string;
  badge?: React.ReactNode;
    onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
      <div className="flex items-center gap-3">
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
          {title}
        </h2>
        {badge}
      </div>
      {linkLabel && linkHref ? (
        <Link
          href={linkHref}
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--orange-500)",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          {linkLabel}
          <ChevronRight size={13} />
        </Link>
      ) : linkLabel ? (
        <button
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--orange-500)",
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          {linkLabel}
          <ChevronRight size={13} />
        </button>
      ) : null}
    </div>
  );
}

/* ─── Main Dashboard Page ───────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();
  const { score, loading: scoreLoading } = useUserScore();
  const { matches: liveMatches, loading: liveLoading } = useMatches("LIVE", 10);
  const { matches: upcomingMatches, loading: upcomingLoading } = useMatches("UPCOMING", 5);
  const { byMatch } = usePredictions();
  const { entries: rankingEntries, loading: rankLoading } = useRanking(5);
  const { events: feedEvents, loading: feedLoading } = useFeed(5);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showFeedModal, setShowFeedModal] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-base)",
        padding: "36px 28px 48px",
      }}
    >
      {/* ── Stat Cards ── */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4"
        style={{ gap: 20, marginBottom: 28 }}
      >
        <StatCard
          label="Minha pontuação"
          value={scoreLoading ? "..." : String(score.totalPoints)}
          subtextHighlight={scoreLoading ? undefined : score.totalPoints > 0 ? "pontos acumulados" : "sem pontos ainda"}
          highlight="orange"
          icon={<Star size={14} />}
          delay={0}
        />
        <StatCard
          label="Minha posição"
          value={scoreLoading ? "..." : score.position ? `#${score.position}` : "—"}
          subtext={scoreLoading ? undefined : "no ranking global"}
          icon={<Medal size={14} />}
          delay={0.05}
        />
        <StatCard
          label="Taxa de acerto"
          value={scoreLoading ? "..." : `${score.accuracy}%`}
          subtext={
            scoreLoading
              ? undefined
              : `${score.correctPredictions} de ${score.totalPredictions} palpites`
          }
          icon={<Target size={14} />}
          delay={0.1}
        />
        <StatCard
          label="Palpites pendentes"
          value={scoreLoading ? "..." : String(score.pendingPredictions)}
          subtextSuffix="jogos hoje sem palpite"
          icon={<Clock3 size={14} />}
          highlight={score.pendingPredictions > 0 ? "orange" : undefined}
          delay={0.15}
        />
      </div>

      {/* ── Middle Row: Ao Vivo + Próximos Jogos ── */}
      <div
        className="grid grid-cols-1 lg:grid-cols-2"
        style={{ gap: 24, marginBottom: 24 }}
      >
        {/* Ao vivo agora */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="card"
        >
          <SectionHeader
            title="Ao vivo agora"
            badge={
              <div
                className="flex items-center gap-2"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 20,
                  backgroundColor: liveMatches.length > 0
                    ? "var(--color-live-glow)"
                    : "var(--bg-elevated)",
                  color: liveMatches.length > 0
                    ? "var(--color-live)"
                    : "var(--text-muted)",
                  border: liveMatches.length > 0
                    ? "1px solid rgba(239,68,68,0.3)"
                    : "1px solid var(--border-subtle)",
                }}
              >
                {liveMatches.length > 0 && (
                  <div className="live-dot" style={{ width: 6, height: 6 }} />
                )}
                {liveLoading ? "..." : `${liveMatches.length} jogos`}
              </div>
            }
          />
          {liveLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : liveMatches.length === 0 ? (
            <EmptyState label="Nenhuma partida ao vivo no momento" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {liveMatches.map((match, i) => (
                <LiveMatchCard
                  key={match.id}
                  match={toLiveCardProps(match)}
                  delay={0.25 + i * 0.08}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Próximos jogos */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
          className="card"
        >
          <SectionHeader title="Próximos jogos" linkLabel="ver todos" linkHref="/futebol" />
          {upcomingLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : upcomingMatches.length === 0 ? (
            <EmptyState label="Sem jogos programados para hoje" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {upcomingMatches.map((match, i) => (
                <UpcomingMatchRow
                  key={match.id}
                  match={{
                    ...toUpcomingRowProps(match),
                    prediction: byMatch.get(match.id) ?? null,
                    onPredict: () => setSelectedMatch(match),
                  }}
                  delay={0.3 + i * 0.07}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Bottom Row: Feed Social + Ranking ── */}
      <div
        className="grid grid-cols-1 lg:grid-cols-2"
        style={{ gap: 24 }}
      >
        {/* Feed social */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.3 }}
          className="card"
        >
          <SectionHeader title="Feed social" linkLabel="ver tudo" onAction={() => setShowFeedModal(true)} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {feedLoading ? (
              <div style={{ padding: "24px", textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
                Carregando...
              </div>
            ) : feedEvents.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
                Nenhum evento recente
              </div>
            ) : (
              feedEvents.map((item, i) => {
                // Cálculo bem simples de tempo relativo
                const diffMs = Date.now() - new Date(item.createdAt).getTime();
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMins / 60);
                let timeAgo = "agora mesmo";
                if (diffMins > 0 && diffMins < 60) timeAgo = `há ${diffMins} min`;
                else if (diffHours >= 1) timeAgo = `há ${diffHours}h`;

                return (
                  <FeedEvent 
                    key={item.id} 
                    item={{...item, timeAgo}} 
                    delay={0.35 + i * 0.06} 
                  />
                );
              })
            )}
          </div>
        </motion.div>

        {/* Ranking global */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.35 }}
          className="card"
        >
          <SectionHeader title="Ranking global" linkLabel="ver completo" linkHref="/rankings" />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {rankLoading ? (
              <div style={{ padding: "24px", textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
                Carregando...
              </div>
            ) : rankingEntries.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
                Nenhum jogador pontuou ainda
              </div>
            ) : (
              rankingEntries.map((entry, i) => (
                <RankingRow
                  key={entry.uid}
                  entry={{
                    position: entry.position ?? i + 1,
                    name: entry.name ?? "Jogador",
                    initials: entry.initials ?? "?",
                    avatarColor: "#f97316",
                    points: entry.totalPoints,
                    isMe: entry.uid === user?.uid,
                  }}
                  delay={0.4 + i * 0.06}
                />
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Indicador de dados ao vivo ── */}
      {!liveLoading && !upcomingLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            justifyContent: "center",
            marginTop: 32,
            fontSize: 11,
            color: "var(--text-muted)",
          }}
        >
          <Wifi size={11} />
          Dados em tempo real via Firestore
        </motion.div>
      )}

      {/* ── Modal de palpite ── */}
      <AnimatePresence>
        {selectedMatch && (
          <PredictionModal
            key={selectedMatch.id}
            match={selectedMatch}
            existingPrediction={byMatch.get(selectedMatch.id) ?? null}
            onClose={() => setSelectedMatch(null)}
          />
        )}
      </AnimatePresence>

      {/* Modal de Feed Social */}
      <AnimatePresence>
        {showFeedModal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowFeedModal(false)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ position: "relative", width: "100%", maxWidth: 500, maxHeight: "80vh", background: "var(--bg-base)", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Feed Social</h3>
                <button onClick={() => setShowFeedModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><X size={20} /></button>
              </div>
              <div style={{ padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
                {feedEvents.map((item, i) => {
                  const diffMs = Date.now() - new Date(item.createdAt).getTime();
                  const diffMins = Math.floor(diffMs / 60000);
                  const diffHours = Math.floor(diffMins / 60);
                  let timeAgo = "agora mesmo";
                  if (diffMins > 0 && diffMins < 60) timeAgo = `há ${diffMins} min`;
                  else if (diffHours >= 1) timeAgo = `há ${diffHours}h`;
                  return <FeedEvent key={item.id} item={{...item, timeAgo}} delay={0} />;
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}