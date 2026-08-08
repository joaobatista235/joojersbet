"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Zap,
  Radio,
  BarChart2,
  Users,
  User,
  Settings,
  Gamepad2,
  Swords,
  Shuffle,
  Trophy,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSidebar } from "./SidebarContext";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from "@/lib/admin";

const OPEN_W = 256;
const CLOSED_W = 72;

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/futebol", label: "Futebol", icon: Zap },
  { href: "/cs2", label: "Counter-Strike 2", icon: Gamepad2 },
  { href: "/ufc", label: "UFC", icon: Swords },
  { href: "/ao-vivo", label: "Ao vivo", icon: Radio },
  { href: "/apostas", label: "Apostas", icon: Shuffle },
  { href: "/rankings", label: "Rankings", icon: BarChart2 },
  { href: "/grupos", label: "Grupos", icon: Users },
  { href: "/perfil", label: "Perfil", icon: User },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

const comingSoon: { label: string; icon: React.ElementType }[] = [];


const MOCK_USER = {
  name: "João Becker",
  initials: "JB",
  city: "Palmeiras",
  photoURL: null as string | null,
  avatarColor: "#f97316",
};

/* ─── Component ────────────────────── */
export function Sidebar() {
  const { isOpen, toggle } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const profile = user
    ? {
        name: user.name,
        initials: user.initials,
        city: user.city ?? "Jogador",
        photoURL: user.photoURL,
        avatarColor: "#f97316",
      }
    : MOCK_USER;

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <motion.aside
      animate={{ width: isOpen ? OPEN_W : CLOSED_W }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-0 top-0 bottom-0 z-30 flex flex-col overflow-hidden"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderRight: "1px solid var(--border-subtle)",
        willChange: "width",
      }}
    >
      {/* ── Logo + Toggle ── */}
      <div
        className="flex items-center shrink-0"
        style={{
          height: 72,
          minHeight: 72,
          borderBottom: "1px solid var(--border-subtle)",
          padding: "0 14px",
          gap: 10,
        }}
      >
        {/* Toggle button — sempre visível, à esquerda da logo */}
        <button
          onClick={toggle}
          aria-label={isOpen ? "Recolher menu" : "Expandir menu"}
          style={{
            width: 32,
            height: 32,
            minWidth: 32,
            borderRadius: 8,
            backgroundColor: "transparent",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--text-secondary)",
            transition: "all 0.15s ease",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.backgroundColor = "var(--bg-elevated)";
            el.style.color = "var(--orange-400)";
            el.style.borderColor = "var(--orange-500)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.backgroundColor = "transparent";
            el.style.color = "var(--text-secondary)";
            el.style.borderColor = "var(--border-subtle)";
          }}
        >
          {isOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
        </button>

        {/* Logo link — só visível quando aberta */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden", flexShrink: 0 }}
            >
              <Link
                href="/dashboard"
                className="flex items-center gap-3"
                style={{ textDecoration: "none" }}
              >
                <div
                  className="flex items-center justify-center rounded-xl"
                  style={{
                    width: 34,
                    height: 34,
                    backgroundColor: "var(--orange-500)",
                    flexShrink: 0,
                  }}
                >
                  <Trophy size={17} color="white" />
                </div>
                <span
                  className="text-base font-bold whitespace-nowrap"
                  style={{ color: "var(--text-primary)" }}
                >
                  Joojer<span style={{ color: "var(--orange-500)" }}>Bets</span>
                </span>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Nav ── */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden py-4"
        style={{ display: "flex", flexDirection: "column", gap: 4, padding: "20px 12px" }}
      >
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              title={!isOpen ? label : undefined}
              style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 12px",
                borderRadius: 10,
                backgroundColor: active ? "var(--orange-glow)" : "transparent",
                color: active ? "var(--orange-400)" : "var(--text-secondary)",
                borderLeft: active ? "2px solid var(--orange-500)" : "2px solid transparent",
                transition: "background-color 0.15s ease, color 0.15s ease",
                whiteSpace: "nowrap",
                overflow: "hidden",
                minWidth: 0,
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-elevated)";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                }
              }}
            >
              <Icon
                size={19}
                strokeWidth={active ? 2.5 : 1.8}
                style={{ flexShrink: 0 }}
              />
              <AnimatePresence>
                {isOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{ fontSize: 14, fontWeight: active ? 600 : 500 }}
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}

        {/* Divider */}
        <div
          style={{
            height: 1,
            backgroundColor: "var(--border-subtle)",
            margin: "8px 4px",
            flexShrink: 0,
          }}
        />

        {/* Coming soon */}
        {comingSoon.map(({ label, icon: Icon }) => (
          <div
            key={label}
            title={!isOpen ? label : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "11px 12px",
              borderRadius: 10,
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              justifyContent: isOpen ? "space-between" : "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Icon size={19} strokeWidth={1.8} style={{ flexShrink: 0 }} />
              <AnimatePresence>
                {isOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{ fontSize: 14, fontWeight: 500 }}
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <AnimatePresence>
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: 4,
                    backgroundColor: "var(--bg-elevated)",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border-subtle)",
                    flexShrink: 0,
                  }}
                >
                  Em breve
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        ))}
      </nav>

      {/* ── (toggle removido daqui — foi para o header) ── */}
      <div style={{ display: "none" }}>
        <button
          onClick={toggle}
          aria-label={isOpen ? "Recolher menu" : "Expandir menu"}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--text-secondary)",
            transition: "all 0.15s ease",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-hover)";
            (e.currentTarget as HTMLElement).style.color = "var(--orange-400)";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--orange-500)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-elevated)";
            (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border-default)";
          }}
        >
          {isOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
        </button>
      </div>

      {/* ── User profile + Logout ── */}
      <div
        style={{
          padding: "16px 12px 20px",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {/* Profile row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 10px",
            borderRadius: 10,
            overflow: "hidden",
            justifyContent: isOpen ? "flex-start" : "center",
          }}
        >
          {/* Avatar: foto ou iniciais */}
          <div
            style={{
              width: 34,
              height: 34,
              minWidth: 34,
              borderRadius: "50%",
              backgroundColor: profile.photoURL ? "transparent" : profile.avatarColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              color: "white",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            {profile.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.photoURL}
                alt={profile.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span>{profile.initials}</span>
            )}
          </div>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                style={{ minWidth: 0, overflow: "hidden", flex: 1 }}
              >
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {profile.name}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                    {profile.city}
                  </p>
                  {user && isAdmin(user.uid) && (
                    <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: "var(--orange-400)", backgroundColor: "var(--orange-glow)", padding: "1px 5px", borderRadius: 4 }}>
                      <ShieldCheck size={9} />
                      Admin
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          title={!isOpen ? "Sair" : undefined}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "9px 10px",
            borderRadius: 10,
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            fontSize: 13,
            fontWeight: 500,
            width: "100%",
            justifyContent: isOpen ? "flex-start" : "center",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            el.style.backgroundColor = "rgba(239,68,68,0.08)";
            el.style.color = "#f87171";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.backgroundColor = "transparent";
            el.style.color = "var(--text-muted)";
          }}
        >
          <LogOut size={16} style={{ flexShrink: 0 }} />
          <AnimatePresence>
            {isOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                Sair
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
