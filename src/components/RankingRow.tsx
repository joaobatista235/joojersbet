"use client";

import { motion } from "framer-motion";

interface RankingEntry {
  position: number;
  name: string;
  initials: string;
  avatarColor: string;
  points: number;
  isMe?: boolean;
}

const medalColors: Record<number, string> = {
  1: "#FFD700",
  2: "#C0C0C0",
  3: "#CD7F32",
};

export function RankingRow({
  entry,
  delay = 0,
}: {
  entry: RankingEntry;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 10px",
        borderRadius: 10,
        backgroundColor: entry.isMe ? "var(--orange-glow)" : "transparent",
        border: entry.isMe
          ? "1px solid rgba(249,115,22,0.2)"
          : "1px solid transparent",
        transition: "background-color 0.15s ease",
        cursor: "pointer",
      }}
      onHoverStart={(e) => {
        if (!entry.isMe) {
          const el = (e.target as HTMLElement).closest("[data-ranking]") as HTMLElement;
          if (el) el.style.backgroundColor = "var(--bg-elevated)";
        }
      }}
      onHoverEnd={(e) => {
        if (!entry.isMe) {
          const el = (e.target as HTMLElement).closest("[data-ranking]") as HTMLElement;
          if (el) el.style.backgroundColor = "transparent";
        }
      }}
    >
      {/* Position */}
      <div
        style={{
          width: 24,
          textAlign: "center",
          fontSize: 13,
          fontWeight: 700,
          color:
            medalColors[entry.position] ??
            (entry.isMe ? "var(--orange-400)" : "var(--text-muted)"),
          flexShrink: 0,
        }}
      >
        {entry.position}
      </div>

      {/* Avatar */}
      <div
        style={{
          width: 34,
          height: 34,
          minWidth: 34,
          borderRadius: "50%",
          backgroundColor: entry.avatarColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          color: "white",
          flexShrink: 0,
        }}
      >
        {entry.initials}
      </div>

      {/* Name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: entry.isMe ? "var(--orange-400)" : "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "block",
          }}
        >
          {entry.name}
          {entry.isMe && (
            <span
              style={{
                marginLeft: 6,
                fontSize: 10,
                fontWeight: 400,
                color: "var(--orange-500)",
              }}
            >
              (você)
            </span>
          )}
        </span>
      </div>

      {/* Points */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: entry.isMe ? "var(--orange-400)" : "var(--text-primary)",
          flexShrink: 0,
        }}
      >
        {entry.points}
      </div>
    </motion.div>
  );
}
