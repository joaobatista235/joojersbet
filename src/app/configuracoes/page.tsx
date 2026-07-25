"use client";

import { motion } from "framer-motion";
import { Settings2, Bell, Shield, Moon } from "lucide-react";

export default function ConfiguracoesPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-base)", padding: "36px 28px 48px" }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
          Configurações
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Ajuste as preferências da sua conta
        </p>
      </motion.div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 600 }}>
        {[
          { icon: <Shield size={18} />, title: "Excluir Conta", desc: "Apagar permanentemente seus dados do sistema", action: true },
        ].map((item, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="card"
            style={{
              padding: "20px 24px",
              display: "flex",
              alignItems: "center",
              gap: 16,
              cursor: "pointer",
              transition: "all 0.15s ease",
              border: "1px solid var(--border-default)",
              backgroundColor: "transparent",
              textAlign: "left",
              width: "100%"
            }}
            whileHover={{ backgroundColor: "rgba(239,68,68,0.05)", borderColor: "rgba(239,68,68,0.3)" }}
            onClick={() => {
              if (confirm("Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita e todo o seu progresso será perdido.")) {
                alert("Para excluir sua conta, entre em contato com o administrador do sistema.");
              }
            }}
          >
            <div style={{ color: "#ef4444", backgroundColor: "rgba(239,68,68,0.1)", padding: 12, borderRadius: 10 }}>
              {item.icon}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#ef4444", marginBottom: 4 }}>
                {item.title}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {item.desc}
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
