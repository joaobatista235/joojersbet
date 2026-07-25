"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Trophy, LogIn, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redireciona se já autenticado
  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
      // router.replace acontece via useEffect acima
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao entrar com Google";
      setError(msg);
    } finally {
      setSigningIn(false);
    }
  };

  // Loading inicial do auth state
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--bg-base)",
        }}
      >
        <Loader2 size={32} style={{ color: "var(--orange-500)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-base)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow decorativo */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Card de login */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{
          width: "100%",
          maxWidth: 420,
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 20,
          padding: "48px 40px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              backgroundColor: "var(--orange-500)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 32px rgba(249,115,22,0.3)",
            }}
          >
            <Trophy size={32} color="white" />
          </div>
          <div style={{ textAlign: "center" }}>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: "var(--text-primary)",
                marginBottom: 6,
              }}
            >
              Joojer<span style={{ color: "var(--orange-500)" }}>Bets</span>
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
              Bolão esportivo
            </p>
          </div>
        </div>

        {/* Headline */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 8,
            }}
          >
            Entre na sua conta
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Faça login com o Google para palpitar, criar grupos e competir com amigos.
          </p>
        </div>

        {/* Erro */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "12px 14px",
              borderRadius: 10,
              backgroundColor: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              marginBottom: 20,
            }}
          >
            <AlertCircle size={16} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13, color: "#f87171", lineHeight: 1.4 }}>
              {error}
            </span>
          </motion.div>
        )}

        {/* Botão Google */}
        <button
          onClick={handleGoogleSignIn}
          disabled={signingIn}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: "14px 24px",
            borderRadius: 12,
            border: "1px solid var(--border-default)",
            backgroundColor: "var(--bg-elevated)",
            color: "var(--text-primary)",
            fontSize: 15,
            fontWeight: 600,
            cursor: signingIn ? "not-allowed" : "pointer",
            opacity: signingIn ? 0.7 : 1,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            if (!signingIn) {
              const el = e.currentTarget;
              el.style.backgroundColor = "var(--bg-hover)";
              el.style.borderColor = "var(--border-default)";
              el.style.transform = "translateY(-1px)";
              el.style.boxShadow = "0 4px 16px rgba(0,0,0,0.3)";
            }
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.backgroundColor = "var(--bg-elevated)";
            el.style.borderColor = "var(--border-default)";
            el.style.transform = "translateY(0)";
            el.style.boxShadow = "none";
          }}
        >
          {signingIn ? (
            <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <LogIn size={20} />
          )}
          {signingIn ? "Entrando..." : "Continuar com Google"}
        </button>

        {/* Rodapé */}
        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "var(--text-muted)",
            marginTop: 24,
            lineHeight: 1.6,
          }}
        >
          Ao entrar, você concorda com nossos{" "}
          <Link href="/termos" style={{ color: "var(--orange-500)", cursor: "pointer", textDecoration: "none" }}>
            Termos de Uso
          </Link>{" "}
          e{" "}
          <Link href="/privacidade" style={{ color: "var(--orange-500)", cursor: "pointer", textDecoration: "none" }}>
            Política de Privacidade
          </Link>
          .
        </p>
      </motion.div>
    </div>
  );
}
