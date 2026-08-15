"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Plus,
  Users,
  LogIn,
  Copy,
  Check,
  ChevronRight,
  X,
  Loader2,
  Trophy,
} from "lucide-react";
import { useGroups } from "@/hooks/useGroups";
import { useAuth } from "@/contexts/AuthContext";
import { createGroup, joinGroupByCode } from "@/lib/groups";
import type { Group } from "@/lib/groups";

/* ─── Modal base ──────────────────────────────────────────── */

function Modal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <motion.div
          initial={{ scale: 0.92, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.92, y: 20, opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: 20,
            width: "100%",
            maxWidth: 400,
            overflow: "hidden",
            boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          }}
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Criar grupo ─────────────────────────────────────────── */

function CreateGroupModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (group: Group) => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim() || !user) return;
    setLoading(true);
    setError(null);
    try {
      const group = await createGroup(name, user.uid);
      onCreated(group);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      {/* Header */}
      <div
        style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
            Criar grupo
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            Um código de convite será gerado automaticamente
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 30, height: 30, borderRadius: 8,
            backgroundColor: "transparent",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-muted)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: "24px" }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 8 }}>
          Nome do grupo
        </label>
        <input
          type="text"
          placeholder="Ex: Galera do Trabalho"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          maxLength={40}
          autoFocus
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 10,
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            color: "var(--text-primary)",
            fontSize: 14,
            outline: "none",
            marginBottom: 16,
            fontFamily: "Inter, sans-serif",
          }}
        />

        {error && (
          <div style={{ fontSize: 12, color: "#f87171", marginBottom: 12, textAlign: "center" }}>
            {error}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={!name.trim() || loading}
          className="btn-orange"
          style={{ width: "100%", padding: "13px", fontSize: 14, opacity: !name.trim() ? 0.5 : 1 }}
        >
          {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : "Criar grupo"}
        </button>
      </div>
    </Modal>
  );
}

/* ─── Entrar por código ────────────────────────────────────── */

function JoinGroupModal({
  onClose,
  onJoined,
}: {
  onClose: () => void;
  onJoined: (group: Group) => void;
}) {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!code.trim() || !user) return;
    setLoading(true);
    setError(null);
    try {
      const group = await joinGroupByCode(code, user.uid);
      onJoined(group);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div
        style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
            Entrar em um grupo
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            Cole o código de convite de 6 caracteres
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 30, height: 30, borderRadius: 8,
            backgroundColor: "transparent",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-muted)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={14} />
        </button>
      </div>

      <div style={{ padding: "24px" }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 8 }}>
          Código de convite
        </label>
        <input
          type="text"
          placeholder="Ex: AB3X7K"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          maxLength={6}
          autoFocus
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 10,
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            color: "var(--text-primary)",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 6,
            textAlign: "center",
            outline: "none",
            marginBottom: 16,
            fontFamily: "Inter, sans-serif",
          }}
        />

        {error && (
          <div style={{ fontSize: 12, color: "#f87171", marginBottom: 12, textAlign: "center" }}>
            {error}
          </div>
        )}

        <button
          onClick={handleJoin}
          disabled={code.length < 4 || loading}
          className="btn-orange"
          style={{ width: "100%", padding: "13px", fontSize: 14, opacity: code.length < 4 ? 0.5 : 1 }}
        >
          {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : "Entrar no grupo"}
        </button>
      </div>
    </Modal>
  );
}

/* ─── Card de grupo ───────────────────────────────────────── */

function GroupCard({ group, delay }: { group: Group; delay: number }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      onClick={() => router.push(`/grupos/${group.id}`)}
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 14,
        padding: "20px 20px",
        cursor: "pointer",
        transition: "border-color 0.15s ease, transform 0.15s ease",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
      onHoverStart={(e) => {
        const el = (e.target as HTMLElement).closest("[data-card]") as HTMLElement | null;
        if (el) {
          el.style.borderColor = "var(--border-default)";
          el.style.transform = "translateY(-1px)";
        }
      }}
      whileHover={{ borderColor: "var(--border-default)", y: -2 }}
      data-card
    >
      {/* Icon */}
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 12,
          backgroundColor: "var(--orange-glow)",
          border: "1px solid rgba(249,115,22,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Trophy size={20} color="var(--orange-500)" />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: 4,
          }}
        >
          {group.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            <Users size={11} style={{ display: "inline", marginRight: 4 }} />
            {group.members.length} membro{group.members.length !== 1 ? "s" : ""}
          </span>

          {/* Invite code */}
          <button
            onClick={handleCopy}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.5,
              color: copied ? "var(--color-success)" : "var(--orange-400)",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
              fontFamily: "Inter, sans-serif",
            }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {group.inviteCode}
          </button>
        </div>
      </div>

      <ChevronRight size={16} color="var(--text-muted)" />
    </motion.div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

type ModalType = "create" | "join" | null;

export default function GruposPage() {
  const router = useRouter();
  const { groups, loading } = useGroups();
  const [modal, setModal] = useState<ModalType>(null);

  const handleCreated = (group: Group) => {
    setModal(null);
    router.push(`/grupos/${group.id}`);
  };

  const handleJoined = (group: Group) => {
    setModal(null);
    router.push(`/grupos/${group.id}`);
  };

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
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 28,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.5px",
              marginBottom: 6,
            }}
          >
            Meus Grupos
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Compete com amigos em bolões privados
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn-ghost"
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px" }}
            onClick={() => setModal("join")}
          >
            <LogIn size={14} />
            Entrar com código
          </button>
          <button
            className="btn-orange"
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px" }}
            onClick={() => setModal("create")}
          >
            <Plus size={14} />
            Criar grupo
          </button>
        </div>
      </motion.div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[0, 1].map((i) => (
            <div
              key={i}
              style={{
                height: 86,
                borderRadius: 14,
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
              }}
            />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ textAlign: "center", padding: "64px 24px" }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>
            Nenhum grupo ainda
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 28 }}>
            Crie um grupo ou entre com um código de convite para competir com amigos
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn-ghost" onClick={() => setModal("join")} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <LogIn size={14} />
              Entrar com código
            </button>
            <button className="btn-orange" onClick={() => setModal("create")} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Plus size={14} />
              Criar meu primeiro grupo
            </button>
          </div>
        </motion.div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {groups.map((group, i) => (
            <GroupCard key={group.id} group={group} delay={i * 0.06} />
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {modal === "create" && (
        <CreateGroupModal onClose={() => setModal(null)} onCreated={handleCreated} />
      )}
      {modal === "join" && (
        <JoinGroupModal onClose={() => setModal(null)} onJoined={handleJoined} />
      )}
    </div>
  );
}
