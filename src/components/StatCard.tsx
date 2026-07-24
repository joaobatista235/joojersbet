"use client";

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  subtextHighlight?: string;
  subtextSuffix?: string;
  icon?: React.ReactNode;
  highlight?: "orange" | "none";
  delay?: number;
}

export function StatCard({
  label,
  value,
  subtext,
  subtextHighlight,
  subtextSuffix,
  icon,
  highlight = "none",
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      className="card"
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-default)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon && (
          <span style={{ color: "var(--text-muted)", display: "flex" }}>{icon}</span>
        )}
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>
          {label}
        </span>
      </div>

      {/* Value */}
      <div
        style={{
          fontSize: 38,
          fontWeight: 800,
          letterSpacing: "-1px",
          color: "var(--text-primary)",
          lineHeight: 1,
        }}
      >
        {value}
      </div>

      {/* Subtext */}
      {(subtext || subtextHighlight || subtextSuffix) && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {subtextHighlight && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                fontWeight: 600,
                color:
                  highlight === "orange"
                    ? "var(--orange-500)"
                    : "var(--color-success)",
              }}
            >
              {highlight === "orange" && <TrendingUp size={11} />}
              {subtextHighlight}
            </span>
          )}
          {subtext && (
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{subtext}</span>
          )}
          {subtextSuffix && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--orange-500)",
              }}
            >
              {subtextSuffix}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
