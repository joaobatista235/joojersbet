"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Target, Trophy, Medal, Award, TrendingUp } from "lucide-react";
import { useRanking, type RankingEntry } from "@/hooks/useRanking";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc } from "firebase/firestore";

function useSimpleRanking(collectionName: string, maxEntries = 50) {
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) { setLoading(false); return; }
    const q = query(collection(db, collectionName), orderBy("totalPoints", "desc"), limit(maxEntries));
    const unsub = onSnapshot(q, async (snap) => {
      const basicEntries = snap.docs.map((d, idx) => {
        const raw = d.data();
        return {
          uid: d.id, position: idx + 1,
          totalPoints: raw.totalPoints ?? 0, accuracy: raw.accuracy ?? 0,
          totalPredictions: raw.totalPredictions ?? 0, correctPredictions: raw.correctPredictions ?? 0,
          updatedAt: raw.updatedAt ?? null, name: raw.name, initials: raw.initials, photoURL: raw.photoURL ?? null, city: raw.city,
        } as RankingEntry;
      });
      
      const enriched = await Promise.all(basicEntries.map(async (e) => {
        if (!e.name) {
          try {
            const userDoc = await getDoc(doc(db!, "users", e.uid));
            if (userDoc.exists()) {
              const uData = userDoc.data();
              return { ...e, name: uData.name, initials: uData.initials, photoURL: uData.photoURL, city: uData.city };
            }
          } catch(err){}
        }
        return e;
      }));
      setEntries(enriched);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [collectionName, maxEntries]);

  return { entries, loading };
}

/* ─── Helpers ──────────────────────────────────────────────── */

function getInitials(name?: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

const AVATAR_COLORS = [
  "#f97316", "#3b82f6", "#8b5cf6", "#06b6d4",
  "#ec4899", "#22c55e", "#eab308", "#ef4444",
];

function avatarColor(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/* ─── Avatar ────────────────────────────────────────────────── */

function Avatar({
  entry,
  size = 44,
  fontSize = 14,
}: {
  entry: RankingEntry;
  size?: number;
  fontSize?: number;
}) {
  const color = avatarColor(entry.uid);
  const initials = entry.initials ?? getInitials(entry.name);

  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: "50%",
        backgroundColor: entry.photoURL ? "transparent" : color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize,
        fontWeight: 700,
        color: "white",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {entry.photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={entry.photoURL}
          alt={entry.name ?? "avatar"}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

/* ─── Pódio (top 3) ─────────────────────────────────────────── */

const PODIUM_CONFIG = [
  {
    rank: 2,
    icon: <Medal size={18} color="#94a3b8" />,
    ringColor: "#94a3b8",
    glowColor: "rgba(148,163,184,0.2)",
    height: 100,
    avatarSize: 56,
    order: 0,
  },
  {
    rank: 1,
    icon: <Trophy size={20} color="#f59e0b" />,
    ringColor: "#f59e0b",
    glowColor: "rgba(245,158,11,0.2)",
    height: 130,
    avatarSize: 68,
    order: 1,
  },
  {
    rank: 3,
    icon: <Award size={16} color="#cd7c44" />,
    ringColor: "#cd7c44",
    glowColor: "rgba(205,124,68,0.2)",
    height: 80,
    avatarSize: 52,
    order: 2,
  },
];

function Podium({ entries }: { entries: RankingEntry[] }) {
  if (entries.length < 3) return null;

  // Re-ordenar para exibição visual: 2º | 1º | 3º
  const displayOrder = [entries[1], entries[0], entries[2]];

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
        gap: 16,
        marginBottom: 36,
        paddingTop: 8,
      }}
    >
      {PODIUM_CONFIG.map((cfg, i) => {
        const entry = displayOrder[i];
        if (!entry) return null;
        return (
          <motion.div
            key={entry.uid}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 * (i + 1) }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            {/* Icon */}
            <div>{cfg.icon}</div>

            {/* Avatar com anel */}
            <div
              style={{
                padding: 3,
                borderRadius: "50%",
                border: `2px solid ${cfg.ringColor}`,
                boxShadow: `0 0 20px ${cfg.glowColor}`,
              }}
            >
              <Avatar entry={entry} size={cfg.avatarSize} fontSize={cfg.avatarSize * 0.3} />
            </div>

            {/* Nome */}
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                textAlign: "center",
                maxWidth: 80,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {entry.name ?? "Jogador"}
            </div>

            {/* Points */}
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: cfg.ringColor,
              }}
            >
              {entry.totalPoints}
              <span style={{ fontSize: 10, fontWeight: 500, color: "var(--text-muted)", marginLeft: 3 }}>
                pts
              </span>
            </div>

            {/* Base do pódio */}
            <div
              style={{
                width: 80,
                height: cfg.height,
                backgroundColor: "var(--bg-elevated)",
                border: `1px solid var(--border-default)`,
                borderBottom: `3px solid ${cfg.ringColor}`,
                borderRadius: "8px 8px 0 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                fontWeight: 900,
                color: cfg.ringColor,
                opacity: 0.8,
              }}
            >
              {cfg.rank}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── Linha de ranking ──────────────────────────────────────── */

function RankRow({
  entry,
  isMe,
  delay,
}: {
  entry: RankingEntry;
  isMe: boolean;
  delay: number;
}) {
  const pos = entry.position ?? "—";

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "13px 20px",
        borderRadius: 10,
        backgroundColor: isMe ? "var(--orange-glow)" : "transparent",
        border: isMe ? "1px solid rgba(249,115,22,0.25)" : "1px solid transparent",
        transition: "background-color 0.12s ease",
      }}
      onMouseEnter={(e) => {
        if (!isMe)
          (e.currentTarget as HTMLElement).style.backgroundColor =
            "var(--bg-elevated)";
      }}
      onMouseLeave={(e) => {
        if (!isMe)
          (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
      }}
    >
      {/* Posição */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: isMe ? "var(--orange-400)" : "var(--text-muted)",
          minWidth: 28,
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        {typeof pos === "number" && pos <= 3 ? (
          pos === 1 ? "🥇" : pos === 2 ? "🥈" : "🥉"
        ) : (
          `#${pos}`
        )}
      </div>

      {/* Avatar */}
      <Avatar entry={entry} size={36} fontSize={12} />

      {/* Nome + cidade */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: isMe ? 700 : 500,
            color: isMe ? "var(--orange-400)" : "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {entry.name ?? "Jogador"}
          {isMe && (
            <span
              style={{
                marginLeft: 8,
                fontSize: 10,
                fontWeight: 600,
                color: "var(--orange-500)",
                backgroundColor: "var(--orange-glow)",
                borderRadius: 4,
                padding: "2px 6px",
                border: "1px solid rgba(249,115,22,0.3)",
              }}
            >
              você
            </span>
          )}
        </div>
        {entry.city && (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {entry.city}
          </div>
        )}
      </div>

      {/* Stats */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 2,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: isMe ? "var(--orange-400)" : "var(--text-primary)",
          }}
        >
          {entry.totalPoints}
          <span style={{ fontSize: 10, fontWeight: 500, color: "var(--text-muted)", marginLeft: 2 }}>
            pts
          </span>
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          <Target size={10} />
          {entry.accuracy}%
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Skeleton ────────────────────────────────────────────── */

function SkeletonRow() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "13px 20px",
      }}
    >
      <div
        style={{
          width: 28,
          height: 14,
          borderRadius: 6,
          backgroundColor: "var(--bg-elevated)",
        }}
      />
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          backgroundColor: "var(--bg-elevated)",
        }}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div
          style={{
            width: "45%",
            height: 12,
            borderRadius: 6,
            backgroundColor: "var(--bg-elevated)",
          }}
        />
        <div
          style={{
            width: "30%",
            height: 10,
            borderRadius: 6,
            backgroundColor: "var(--bg-elevated)",
          }}
        />
      </div>
      <div
        style={{
          width: 50,
          height: 20,
          borderRadius: 6,
          backgroundColor: "var(--bg-elevated)",
        }}
      />
    </div>
  );
}

/* ─── Stat Summary Card ─────────────────────────────────────── */

function SummaryCard({
  icon,
  label,
  value,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="card"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "16px 20px",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          backgroundColor: "var(--orange-glow)",
          border: "1px solid rgba(249,115,22,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--orange-400)",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>
          {label}
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "var(--text-primary)",
            letterSpacing: "-0.5px",
          }}
        >
          {value}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function RankingsPage() {
  const { user } = useAuth();
  
  const [sport, setSport] = useState<"futebol" | "cs2" | "ufc">("futebol");
  const [category, setCategory] = useState<string>("futebol");
  const [leagueId, setLeagueId] = useState<string>("geral");

  const { entries: footballEntries, loading: footballLoading } = useRanking(50, category, leagueId);
  const { entries: cs2Entries, loading: cs2Loading } = useSimpleRanking("cs2UserScores", 50);
  const { entries: ufcEntries, loading: ufcLoading } = useSimpleRanking("ufcUserScores", 50);

  const entries = sport === "futebol" ? footballEntries : sport === "cs2" ? cs2Entries : ufcEntries;
  const loading = sport === "futebol" ? footballLoading : sport === "cs2" ? cs2Loading : ufcLoading;

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  // Encontrar posição do usuário atual
  const myEntry = user ? entries.find((e) => e.uid === user.uid) : null;

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
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ marginBottom: 28 }}
      >
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "var(--text-primary)",
            letterSpacing: "-0.5px",
            marginBottom: 6,
          }}
        >
          Rankings
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Ranking global atualizado em tempo real
        </p>
      </motion.div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["futebol", "cs2", "ufc"] as const).map((s) => (
          <button key={s} onClick={() => { setSport(s); setCategory(s); setLeagueId("geral"); }}
            style={{
              padding: "8px 16px", borderRadius: 8, fontWeight: 600, border: "none", cursor: "pointer",
              backgroundColor: sport === s ? "var(--orange-500)" : "var(--bg-elevated)",
              color: sport === s ? "white" : "var(--text-primary)",
            }}>
            {s === "futebol" ? "Futebol" : s === "cs2" ? "CS2" : "UFC"}
          </button>
        ))}
      </div>

      {category === "futebol" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 24, overflowX: "auto", paddingBottom: 8 }}>
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

      {/* ── Stat cards do usuário ── */}
      {myEntry && (
        <div
          className="grid grid-cols-2 lg:grid-cols-4"
          style={{ gap: 16, marginBottom: 32 }}
        >
          <SummaryCard
            icon={<Trophy size={18} />}
            label="Minha posição"
            value={myEntry.position ? `#${myEntry.position}` : "—"}
            delay={0}
          />
          <SummaryCard
            icon={<TrendingUp size={18} />}
            label="Meus pontos"
            value={myEntry.totalPoints}
            delay={0.05}
          />
          <SummaryCard
            icon={<Target size={18} />}
            label="Taxa de acerto"
            value={`${myEntry.accuracy}%`}
            delay={0.1}
          />
          <SummaryCard
            icon={<Medal size={18} />}
            label="Palpites certos"
            value={`${myEntry.correctPredictions}/${myEntry.totalPredictions}`}
            delay={0.15}
          />
        </div>
      )}

      {/* ── Pódio ── */}
      {!loading && top3.length >= 3 && <Podium entries={top3} />}

      {/* ── Lista completa ── */}
      <motion.div
        className="card"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        style={{ padding: 0, overflow: "hidden" }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Classificação geral
          </h2>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {entries.length} jogador{entries.length !== 1 ? "es" : ""}
          </span>
        </div>

        {/* Top 3 */}
        {loading ? (
          <div style={{ padding: "8px 0" }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 13,
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏆</div>
            Nenhum jogador pontuou ainda.
            <br />
            Faça seus palpites e apareça aqui!
          </div>
        ) : (
          <div style={{ padding: "8px 0" }}>
            {/* Top 3 na lista */}
            {top3.map((entry, i) => (
              <RankRow
                key={entry.uid}
                entry={entry}
                isMe={entry.uid === user?.uid}
                delay={0.05 * i}
              />
            ))}

            {/* Separador */}
            {rest.length > 0 && top3.length > 0 && (
              <div
                style={{
                  height: 1,
                  backgroundColor: "var(--border-subtle)",
                  margin: "4px 20px",
                }}
              />
            )}

            {/* Restante */}
            {rest.map((entry, i) => (
              <RankRow
                key={entry.uid}
                entry={entry}
                isMe={entry.uid === user?.uid}
                delay={0.05 * (i + 3)}
              />
            ))}

            {/* Minha posição fora do top 50 */}
            {user && !myEntry && !loading && (
              <>
                <div
                  style={{
                    padding: "6px 20px",
                    textAlign: "center",
                    fontSize: 11,
                    color: "var(--text-muted)",
                    letterSpacing: 4,
                  }}
                >
                  · · ·
                </div>
                <div
                  style={{
                    padding: "12px 20px",
                    fontSize: 13,
                    color: "var(--text-muted)",
                    textAlign: "center",
                  }}
                >
                  Você ainda não pontuou. Faça seus palpites!
                </div>
              </>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
