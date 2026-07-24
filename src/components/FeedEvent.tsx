"use client";

import { motion } from "framer-motion";

interface FeedItem {
  id: string;
  user: string;
  initials: string;
  avatarColor: string;
  message: string;
  timeAgo: string;
}

export function FeedEvent({ item, delay = 0 }: { item: FeedItem; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "12px 10px",
        borderRadius: 10,
        cursor: "pointer",
        transition: "background-color 0.15s ease",
      }}
      onHoverStart={(e) => {
        (e.target as HTMLElement)
          .closest("[data-feed]")
          ?.setAttribute("style", "background-color: var(--bg-elevated)");
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 36,
          height: 36,
          minWidth: 36,
          minHeight: 36,
          borderRadius: "50%",
          backgroundColor: item.avatarColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          color: "white",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {item.initials}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text-secondary)" }}>
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
            {item.user}
          </span>{" "}
          {item.message}
        </p>
        <span
          style={{
            display: "block",
            fontSize: 11,
            color: "var(--text-muted)",
            marginTop: 4,
          }}
        >
          {item.timeAgo}
        </span>
      </div>
    </motion.div>
  );
}
