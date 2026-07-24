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
          { icon: <Bell size={18} />, title: "Notificações", desc: "Gerencie alertas de jogos e resultados (em breve)" },
          { icon: <Moon size={18} />, title: "Aparência", desc: "Tema escuro já está ativado por padrão" },
          { icon: <Shield size={18} />, title: "Privacidade e Segurança", desc: "Suas informações estão protegidas pelo Google Auth" },
          { icon: <Settings2 size={18} />, title: "Preferências do Bolão", desc: "Opções avançadas de palpites (em breve)" },
        ].map((item, i) => (
          <motion.div
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
              transition: "transform 0.1s ease"
            }}
            whileHover={{ scale: 1.01, borderColor: "var(--border-default)" }}
          >
            <div style={{ color: "var(--orange-400)", backgroundColor: "var(--bg-elevated)", padding: 12, borderRadius: 10 }}>
              {item.icon}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                {item.title}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {item.desc}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
