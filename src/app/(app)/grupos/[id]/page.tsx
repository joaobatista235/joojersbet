"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  Check,
  Users,
  Trophy,
  Target,
  LogOut,
  Crown,
} from "lucide-react";
import { useGroupRanking } from "@/hooks/useGroupRanking";
import { useAuth } from "@/contexts/AuthContext";
import { leaveGroup } from "@/lib/groups";
import type { RankingEntry } from "@/hooks/useRanking";

/* ─── Avatar ────────────────────────────────────────────────── */

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

function Avatar({ entry, size = 40 }: { entry: RankingEntry; size?: number }) {
  const color = avatarColor(entry.uid);
  const initials = entry.initials ?? (entry.name ? entry.name.slice(0, 2).toUpperCase() : "??");
  return (
    <div
      style={{
        width: size, height: size, minWidth: size,
        borderRadius: "50%",
        backgroundColor: entry.photoURL ? "transparent" : color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.3, fontWeight: 700, color: "white",
        overflow: "hidden", flexShrink: 0,
      }}
    >
      {entry.photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={entry.photoURL} alt={entry.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

/* ─── Member Row ─────────────────────────────────────────────── */

function MemberRow({
  entry,
  isMe,
  isOwner,
  delay,
}: {
  entry: RankingEntry;
  isMe: boolean;
  isOwner: boolean;
  delay: number;
}) {
  const medals = ["🥇", "🥈", "🥉"];
  const pos = entry.position ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay }}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 20px",
        borderRadius: 10,
        backgroundColor: isMe ? "var(--orange-glow)" : "transparent",
        border: isMe ? "1px solid rgba(249,115,22,0.25)" : "1px solid transparent",
        transition: "background-color 0.12s ease",
      }}
      onMouseEnter={(e) => {
        if (!isMe) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-elevated)";
      }}
      onMouseLeave={(e) => {
        if (!isMe) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
      }}
    >
      {/* Posição */}
      <div style={{ fontSize: 14, fontWeight: 700, minWidth: 28, textAlign: "center", flexShrink: 0 }}>
        {pos <= 3 ? medals[pos - 1] : `#${pos}`}
      </div>

      {/* Avatar */}
      <Avatar entry={entry} size={38} />

      {/* Nome */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: isMe ? 700 : 500,
              color: isMe ? "var(--orange-400)" : "var(--text-primary)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >
            {entry.name ?? "Jogador"}
          </span>
          {isOwner && (
            <Crown size={12} color="#f59e0b" />
          )}
          {isMe && (
            <span style={{
              fontSize: 10, fontWeight: 600, color: "var(--orange-500)",
              backgroundColor: "var(--orange-glow)", borderRadius: 4,
              padding: "2px 6px", border: "1px solid rgba(249,115,22,0.3)",
            }}>
              você
            </span>
          )}
        </div>
        {entry.city && (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{entry.city}</div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: isMe ? "var(--orange-400)" : "var(--text-primary)" }}>
          {entry.totalPoints}
          <span style={{ fontSize: 10, fontWeight: 500, color: "var(--text-muted)", marginLeft: 2 }}>pts</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
          <Target size={10} />
          {entry.accuracy}%
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Skeleton ────────────────────────────────────────────── */

function Skeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 0" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            height: 66, borderRadius: 10,
            backgroundColor: "var(--bg-elevated)",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const groupId = params.id as string;

  const [category, setCategory] = useState<string>("futebol");
  const [leagueId, setLeagueId] = useState<string>("geral");

  const { groupName, inviteCode, ownerId, entries, loading, error } =
    useGroupRanking(groupId, category, leagueId);

  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = async () => {
    if (!user) return;
    if (!confirm(`Sair do grupo "${groupName}"?`)) return;
    setLeaving(true);
    try {
      await leaveGroup(groupId, user.uid);
      router.push("/grupos");
    } catch {
      setLeaving(false);
    }
  };

  const myEntry = entries.find((e) => e.uid === user?.uid);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-base)",
        padding: "36px 28px 48px",
      }}
    >
      {/* ── Back + Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ marginBottom: 28 }}
      >
        <button
          onClick={() => router.push("/grupos")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 13, color: "var(--text-muted)",
            background: "none", border: "none", cursor: "pointer",
            marginBottom: 16, padding: 0, fontFamily: "Inter, sans-serif",
          }}
        >
          <ArrowLeft size={14} />
          Voltar aos grupos
        </button>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", marginBottom: 6 }}>
              {loading ? "Carregando..." : groupName}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                <Users size={13} />
                {entries.length} membro{entries.length !== 1 ? "s" : ""}
              </span>

              {/* Invite code */}
              {inviteCode && (
                <button
                  onClick={handleCopyCode}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    fontSize: 12, fontWeight: 700, letterSpacing: 2,
                    color: copied ? "var(--color-success)" : "var(--orange-400)",
                    background: "none", border: "none", cursor: "pointer",
                    padding: 0, fontFamily: "Inter, sans-serif",
                  }}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {inviteCode}
                </button>
              )}
            </div>
          </div>

          {/* Sair do grupo */}
          {user && user.uid !== ownerId && (
            <button
              onClick={handleLeave}
              disabled={leaving}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                fontSize: 12, fontWeight: 500,
                color: "#f87171", background: "none",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 8, padding: "8px 14px",
                cursor: leaving ? "default" : "pointer",
                fontFamily: "Inter, sans-serif",
                transition: "all 0.15s ease",
              }}
            >
              <LogOut size={13} />
              {leaving ? "Saindo..." : "Sair do grupo"}
            </button>
          )}
        </div>
      </motion.div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => {
            setCategory("futebol");
            setLeagueId("geral");
          }}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            backgroundColor: category === "futebol" ? "var(--orange-500)" : "var(--bg-elevated)",
            color: category === "futebol" ? "white" : "var(--text-primary)",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
          }}
        >
          Futebol
        </button>
        <button
          disabled
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            backgroundColor: "var(--bg-elevated)",
            color: "var(--text-muted)",
            fontWeight: 600,
            border: "none",
            cursor: "not-allowed",
            opacity: 0.5
          }}
        >
          CS2 (Em breve)
        </button>
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

      {/* ── Meu card ── */}
      {myEntry && !loading && (
        <div
          className="grid grid-cols-3"
          style={{ gap: 12, marginBottom: 28 }}
        >
          {[
            { icon: <Trophy size={16} />, label: "Posição no grupo", value: myEntry.position ? `#${myEntry.position}` : "—" },
            { icon: <Target size={16} />, label: "Meus pontos", value: `${myEntry.totalPoints} pts` },
            { icon: <Users size={16} />, label: "Taxa de acerto", value: `${myEntry.accuracy}%` },
          ].map(({ icon, label, value }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="card"
              style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 8 }}
            >
              <div style={{ color: "var(--orange-400)" }}>{icon}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>{value}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Ranking do grupo ── */}
      <motion.div
        className="card"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{ padding: 0, overflow: "hidden" }}
      >
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
            Ranking do grupo
          </h2>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Atualizado em tempo real
          </span>
        </div>

        {error ? (
          <div style={{ padding: "32px", textAlign: "center", color: "#f87171", fontSize: 13 }}>
            {error}
          </div>
        ) : loading ? (
          <div style={{ padding: "16px" }}>
            <Skeleton />
          </div>
        ) : entries.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            Nenhum membro ainda.
          </div>
        ) : (
          <div style={{ padding: "8px 0" }}>
            {entries.map((entry, i) => (
              <MemberRow
                key={entry.uid}
                entry={entry}
                isMe={entry.uid === user?.uid}
                isOwner={entry.uid === ownerId}
                delay={i * 0.05}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Compartilhar convite ── */}
      {inviteCode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="card"
          style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 16 }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
              Convidar amigos
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Compartilhe o código <strong style={{ color: "var(--orange-400)", letterSpacing: 2 }}>{inviteCode}</strong> para seus amigos entrarem neste grupo.
            </div>
          </div>
          <button
            onClick={handleCopyCode}
            className={copied ? "btn-done" : "btn-orange"}
            style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copiado!" : "Copiar código"}
          </button>
        </motion.div>
      )}
    </div>
  );
}
