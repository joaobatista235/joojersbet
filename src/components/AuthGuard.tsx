"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, firebaseConfigured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Só redireciona se Firebase estiver configurado e o usuário não estiver logado
    if (!loading && firebaseConfigured && !user) {
      router.replace("/login");
    }
  }, [user, loading, firebaseConfigured, router]);

  // Carregando estado de auth
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--bg-base)",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            backgroundColor: "var(--orange-500)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Loader2 size={24} color="white" className="animate-spin" />
        </div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Carregando...
        </p>
      </div>
    );
  }

  // Firebase não configurado → mostra dashboard sem auth (modo dev)
  if (!firebaseConfigured) {
    return <>{children}</>;
  }

  // Firebase configurado mas sem usuário → aguarda redirect
  if (!user) {
    return null;
  }

  return <>{children}</>;
}
