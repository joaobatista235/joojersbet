"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ShieldCheck, Plus, Trophy, RefreshCw, Trash2, CheckCircle2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from "@/lib/admin";
import { useCustomEvents } from "@/hooks/useCustomEvents";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

interface Season {
  id: string;
  name: string;
  status: "active" | "closed";
  startDate: string;
  endDate: string | null;
  number: number;
}

function AdminPanel() {
  const { user } = useAuth();
  const { events } = useCustomEvents();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [showNewEvent, setShowNewEvent] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newOptions, setNewOptions] = useState(["", ""]);
  const [newDeadline, setNewDeadline] = useState("");
  const [resolvingEventId, setResolvingEventId] = useState<string | null>(null);
  const [resolveOption, setResolveOption] = useState("");

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "seasons"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Season));
      data.sort((a, b) => b.number - a.number);
      setSeasons(data);
      setLoadingSeasons(false);
    });
    return () => unsub();
  }, []);

  function showMsg(msg: string) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 3000);
  }

  async function callAdmin(path: string, method: string, body?: object) {
    const secret = process.env.NEXT_PUBLIC_SYNC_SECRET_HINT ?? "";
    const res = await fetch(path, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${await user?.getIdToken()}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  }

  async function handleCloseSeason() {
    if (!confirm("Encerrar a season ativa e iniciar uma nova? Esta ação irá resetar os pontos.")) return;
    setBusy(true);
    try {
      const r = await callAdmin("/api/admin/season", "POST", { action: "close" });
      if (r.ok) showMsg(`Season encerrada! Nova season criada.`);
      else showMsg(`Erro: ${r.error}`);
    } finally { setBusy(false); }
  }

  async function handleInitSeason() {
    setBusy(true);
    try {
      const r = await callAdmin("/api/admin/season", "POST", { action: "init" });
      if (r.ok) showMsg(`Season inicializada: ${r.season?.name}`);
      else showMsg(`Erro: ${r.error}`);
    } finally { setBusy(false); }
  }

  async function handleCreateEvent() {
    const opts = newOptions.filter((o) => o.trim());
    if (!newTitle.trim() || opts.length < 2) { showMsg("Preencha o título e pelo menos 2 opções."); return; }
    setBusy(true);
    try {
      const r = await callAdmin("/api/admin/custom-event", "POST", {
        title: newTitle.trim(),
        description: newDesc.trim(),
        options: opts,
        deadline: newDeadline || null,
      });
      if (r.ok) {
        showMsg("Aposta criada!");
        setShowNewEvent(false);
        setNewTitle(""); setNewDesc(""); setNewOptions(["", ""]); setNewDeadline("");
      } else showMsg(`Erro: ${r.error}`);
    } finally { setBusy(false); }
  }

  async function handleResolveEvent(eventId: string) {
    if (!resolveOption) { showMsg("Selecione a opção vencedora."); return; }
    if (!confirm(`Encerrar a aposta com opção "${resolveOption}"?`)) return;
    setBusy(true);
    try {
      const r = await callAdmin("/api/admin/custom-event", "PATCH", { eventId, resolvedOption: resolveOption });
      if (r.ok) { showMsg(`Aposta encerrada! ${r.processed} palpites processados.`); setResolvingEventId(null); setResolveOption(""); }
      else showMsg(`Erro: ${r.error}`);
    } finally { setBusy(false); }
  }

  async function handleDeleteEvent(eventId: string, title: string) {
    if (!confirm(`Excluir a aposta "${title}"?`)) return;
    setBusy(true);
    try {
      const r = await callAdmin(`/api/admin/custom-event?eventId=${eventId}`, "DELETE");
      if (r.ok) showMsg("Aposta excluída!");
      else showMsg(`Erro: ${r.error}`);
    } finally { setBusy(false); }
  }

  const activeSeason = seasons.find((s) => s.status === "active");
  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: "1px solid var(--border-default)", backgroundColor: "var(--bg-elevated)",
    color: "var(--text-primary)", fontSize: 13, outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {actionMsg && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          style={{ padding: "12px 16px", borderRadius: 10, backgroundColor: "rgba(249,115,22,0.1)", border: "1px solid var(--orange-500)", fontSize: 13, color: "var(--orange-400)", fontWeight: 600 }}>
          {actionMsg}
        </motion.div>
      )}

      {/* ── Seasons ── */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Temporadas</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Season atual: <strong style={{ color: "var(--orange-400)" }}>{activeSeason?.name ?? "Nenhuma ativa"}</strong>
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {!activeSeason && (
              <button onClick={handleInitSeason} disabled={busy} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--orange-500)", background: "var(--orange-glow)", color: "var(--orange-400)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                <Plus size={14} /> Iniciar Season
              </button>
            )}
            {activeSeason && (
              <button onClick={handleCloseSeason} disabled={busy} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid #ef4444", background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                <RefreshCw size={14} /> Encerrar Season
              </button>
            )}
          </div>
        </div>

        {loadingSeasons ? (
          <div style={{ height: 60, backgroundColor: "var(--bg-elevated)", borderRadius: 8 }} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {seasons.map((season) => (
              <div key={season.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 8, backgroundColor: "var(--bg-elevated)", border: `1px solid ${season.status === "active" ? "var(--orange-500)" : "var(--border-subtle)"}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Trophy size={14} color={season.status === "active" ? "var(--orange-400)" : "var(--text-muted)"} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: season.status === "active" ? "var(--orange-400)" : "var(--text-primary)" }}>{season.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(season.startDate).toLocaleDateString("pt-BR")}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, backgroundColor: season.status === "active" ? "rgba(249,115,22,0.15)" : "var(--bg-base)", color: season.status === "active" ? "var(--orange-400)" : "var(--text-muted)" }}>
                    {season.status === "active" ? "ATIVA" : "ENCERRADA"}
                  </span>
                </div>
              </div>
            ))}
            {seasons.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>Nenhuma temporada ainda. Clique em "Iniciar Season".</p>
            )}
          </div>
        )}
      </div>

      {/* ── Apostas Personalizadas ── */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Apostas Personalizadas</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{events.length} aposta(s) criada(s)</p>
          </div>
          <button onClick={() => setShowNewEvent(!showNewEvent)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--orange-500)", background: "var(--orange-glow)", color: "var(--orange-400)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            <Plus size={14} /> Nova Aposta
          </button>
        </div>

        <AnimatePresence>
          {showNewEvent && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              style={{ marginBottom: 20, padding: 16, borderRadius: 10, border: "1px solid var(--border-default)", backgroundColor: "var(--bg-elevated)", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Nova Aposta</span>
                <button onClick={() => setShowNewEvent(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={16} /></button>
              </div>
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Título da aposta" style={inputStyle} />
              <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Descrição (opcional)" style={inputStyle} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Opções</label>
                {newOptions.map((opt, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 6 }}>
                    <input value={opt} onChange={(e) => { const o = [...newOptions]; o[idx] = e.target.value; setNewOptions(o); }} placeholder={`Opção ${idx + 1}`} style={{ ...inputStyle, flex: 1 }} />
                    {newOptions.length > 2 && (
                      <button onClick={() => setNewOptions(newOptions.filter((_, i) => i !== idx))} style={{ padding: "8px", borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--bg-base)", color: "#ef4444", cursor: "pointer" }}><Trash2 size={14} /></button>
                    )}
                  </div>
                ))}
                <button onClick={() => setNewOptions([...newOptions, ""])} style={{ fontSize: 12, color: "var(--orange-400)", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "4px 0" }}>+ Adicionar opção</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Prazo de palpite (opcional)</label>
                <input type="datetime-local" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} style={inputStyle} />
              </div>
              <button onClick={handleCreateEvent} disabled={busy} style={{ padding: "10px 0", borderRadius: 8, border: "none", background: "var(--orange-500)", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {busy ? "Criando..." : "Criar Aposta"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {events.map((event) => (
            <div key={event.id} style={{ padding: "14px 16px", borderRadius: 10, border: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-elevated)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{event.title}</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{event.options.join(" · ")}</p>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, backgroundColor: event.status === "open" ? "rgba(249,115,22,0.1)" : "var(--bg-base)", color: event.status === "open" ? "var(--orange-400)" : "var(--text-muted)" }}>
                    {event.status === "open" ? "ABERTA" : "ENCERRADA"}
                  </span>
                  {event.status === "open" && (
                    <button onClick={() => { setResolvingEventId(event.id); setResolveOption(""); }} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #22c55e", background: "rgba(34,197,94,0.08)", color: "#22c55e", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      <CheckCircle2 size={12} />
                    </button>
                  )}
                  <button onClick={() => handleDeleteEvent(event.id, event.title)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #ef4444", background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: 11, cursor: "pointer" }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {resolvingEventId === event.id && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Selecione a opção vencedora:</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {event.options.map((opt) => (
                      <button key={opt} onClick={() => setResolveOption(opt)} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${resolveOption === opt ? "#22c55e" : "var(--border-subtle)"}`, background: resolveOption === opt ? "rgba(34,197,94,0.1)" : "var(--bg-base)", color: resolveOption === opt ? "#22c55e" : "var(--text-muted)", transition: "all 0.15s" }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleResolveEvent(event.id)} disabled={!resolveOption || busy} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: "#22c55e", color: "white", fontWeight: 700, fontSize: 12, cursor: "pointer", opacity: resolveOption ? 1 : 0.5 }}>
                      Confirmar Resultado
                    </button>
                    <button onClick={() => setResolvingEventId(null)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--bg-elevated)", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {event.resolvedOption && (
                <p style={{ fontSize: 12, marginTop: 6, color: "#22c55e" }}>✓ Resultado: {event.resolvedOption}</p>
              )}
            </div>
          ))}
          {events.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>Nenhuma aposta criada ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConfiguracoesPage() {
  const { user } = useAuth();
  const adminUser = user && isAdmin(user.uid);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-base)", padding: "36px 28px 48px" }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>Configurações</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {adminUser ? "Painel de Administração" : "Ajuste as preferências da sua conta"}
        </p>
      </motion.div>

      {adminUser ? (
        <AdminPanel />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 600 }}>
          <motion.button
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="card"
            style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", border: "1px solid var(--border-default)", backgroundColor: "transparent", textAlign: "left", width: "100%" }}
            whileHover={{ backgroundColor: "rgba(239,68,68,0.05)", borderColor: "rgba(239,68,68,0.3)" }}
            onClick={() => {
              if (confirm("Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita e todo o seu progresso será perdido.")) {
                alert("Para excluir sua conta, entre em contato com o administrador do sistema.");
              }
            }}
          >
            <div style={{ color: "#ef4444", backgroundColor: "rgba(239,68,68,0.1)", padding: 12, borderRadius: 10 }}>
              <Shield size={18} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#ef4444", marginBottom: 4 }}>Excluir Conta</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Apagar permanentemente seus dados do sistema</div>
            </div>
          </motion.button>
        </div>
      )}
    </div>
  );
}
