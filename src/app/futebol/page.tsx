"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  Zap,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Check,
} from "lucide-react";
import { useMatches } from "@/hooks/useMatches";
import { usePredictions } from "@/hooks/usePredictions";
import { PredictionModal } from "@/components/PredictionModal";
import { AllPredictionsModal } from "@/components/AllPredictionsModal";
import type { Match } from "@/lib/api-football/types";
import type { Prediction } from "@/lib/predictions";

/* ─── Helpers ─────────────────────────────────────────────── */

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const sameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  if (sameDay(d, today)) return "Hoje";
  if (sameDay(d, tomorrow)) return "Amanhã";
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}

/* ─── Tab pills ───────────────────────────────────────────── */

type Tab = "upcoming" | "live" | "rules" | "finished";

function TabPill({
  label,
  icon,
  active,
  count,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "8px 18px",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 600,
        border: "1px solid",
        cursor: "pointer",
        transition: "all 0.15s ease",
        backgroundColor: active ? "var(--orange-500)" : "transparent",
        borderColor: active ? "var(--orange-500)" : "var(--border-default)",
        color: active ? "white" : "var(--text-secondary)",
      }}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            backgroundColor: active ? "rgba(255,255,255,0.25)" : "var(--bg-elevated)",
            color: active ? "white" : "var(--text-muted)",
            borderRadius: 20,
            padding: "1px 7px",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/* ─── Skeleton ──────────────────────────────────────────── */

function SkeletonRow() {
  return (
    <div
      style={{
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            height: 13,
            borderRadius: 6,
            backgroundColor: "var(--bg-elevated)",
            width: "55%",
          }}
        />
        <div
          style={{
            height: 10,
            borderRadius: 6,
            backgroundColor: "var(--bg-elevated)",
            width: "35%",
          }}
        />
      </div>
      <div
        style={{
          width: 80,
          height: 32,
          borderRadius: 8,
          backgroundColor: "var(--bg-elevated)",
        }}
      />
    </div>
  );
}

/* ─── Match Row ─────────────────────────────────────────── */

function MatchRow({
  match,
  prediction,
  onPredict,
  onViewAllPredictions,
}: {
  match: Match;
  prediction?: Prediction | null;
  onPredict: () => void;
  onViewAllPredictions: () => void;
}) {
  const isLocked =
    prediction?.locked || new Date(match.startTime) <= new Date();
  const hasPred = Boolean(prediction);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "15px 20px",
        borderBottom: "1px solid var(--border-subtle)",
        transition: "background-color 0.12s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor =
          "var(--bg-elevated)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
      }}
    >
      {/* Time and Date */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minWidth: 44,
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--orange-400)", marginBottom: 2 }}>
          {formatDateLabel(match.startTime)}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>
          {formatTime(match.startTime)}
        </div>
      </div>

      {/* Teams */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: 3,
          }}
        >
          {match.homeTeam} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>×</span> {match.awayTeam}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {match.round}
        </div>
        {/* Palpite feito */}
        {hasPred && prediction && (
          <div
            style={{
              marginTop: 4,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12 }}>
              <span style={{ color: "var(--text-muted)" }}>Seu palpite:</span>
              <span style={{ fontWeight: 700, color: "var(--orange-400)" }}>
                {prediction.homeGoals} × {prediction.awayGoals}
              </span>
            </div>
            <button
              onClick={onViewAllPredictions}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-secondary)",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                padding: "2px 8px",
                borderRadius: 6,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4
              }}
            >
              👥 Galera
            </button>
          </div>
        )}
      </div>

      <div style={{ flexShrink: 0 }}>
        {hasPred ? (
          <button
            className="btn-done"
            style={{ padding: "6px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 4, cursor: "default", opacity: 0.8 }}
          >
            <Check size={12} />
            Palpitado
          </button>
        ) : isLocked ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            <Clock size={12} />
            Encerrado
          </div>
        ) : (
          <button
            onClick={onPredict}
            className="btn-orange"
            style={{ fontSize: 13, padding: "7px 18px" }}
          >
            Palpitar
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Competition Group ─────────────────────────────────── */

function CompetitionGroup({
  competition,
  matches,
  byMatch,
  onPredict,
  onViewAllPredictions,
}: {
  competition: string;
  matches: Match[];
  byMatch: Map<string, Prediction>;
  onPredict: (match: Match) => void;
  onViewAllPredictions: (match: Match) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const total = matches.length;
  const done = matches.filter((m) => byMatch.has(m.id)).length;

  return (
    <div
      className="card"
      style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}
    >
      {/* Competition header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px 20px",
          background: "none",
          border: "none",
          cursor: "pointer",
          borderBottom: collapsed ? "none" : "1px solid var(--border-subtle)",
          textAlign: "left",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {competition}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            {total} jogo{total !== 1 ? "s" : ""}
            {done > 0 && (
              <span style={{ color: "var(--color-success)", marginLeft: 8 }}>
                · {done} palpite{done !== 1 ? "s" : ""} feito{done !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Progresso */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {done === total && total > 0 ? (
            <CheckCircle2 size={16} color="var(--color-success)" />
          ) : (
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: done > 0 ? "var(--orange-400)" : "var(--text-muted)",
              }}
            >
              {done}/{total}
            </div>
          )}
          {collapsed ? (
            <ChevronDown size={15} color="var(--text-muted)" />
          ) : (
            <ChevronUp size={15} color="var(--text-muted)" />
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            {matches.map((m) => (
              <MatchRow
                key={m.id}
                match={m}
                prediction={byMatch.get(m.id)}
                onPredict={() => onPredict(m)}
                onViewAllPredictions={() => onViewAllPredictions(m)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Empty state ───────────────────────────────────────── */

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "64px 24px",
        color: "var(--text-muted)",
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 16 }}>
        {tab === "live" ? "📡" : "📅"}
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>
        {tab === "live"
          ? "Nenhuma partida ao vivo agora"
          : "Sem jogos disponíveis"}
      </div>
      <div style={{ fontSize: 13 }}>
        {tab === "live"
          ? "Quando houver jogos ao vivo, eles aparecerão aqui."
          : "Os jogos de hoje aparecerão aqui após sincronização."}
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────── */

export default function FutebolPage() {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedMatchForAll, setSelectedMatchForAll] = useState<Match | null>(null);

  const { matches: upcoming, loading: upLoading } = useMatches("UPCOMING", 200);
  const { matches: live, loading: liveLoading } = useMatches("LIVE", 200);
  const { matches: finished, loading: finishedLoading } = useMatches("FINISHED", 200);
  const { byMatch } = usePredictions();


  const loading = tab === "upcoming" ? upLoading : (tab === "live" ? liveLoading : finishedLoading);
  const matches = tab === "upcoming" ? upcoming : (tab === "live" ? live : finished);

  // Agrupar por competição
  const grouped = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const m of matches) {
      const key = m.competition;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return map;
  }, [matches]);

  // Contagens de tab
  const pendingCount = upcoming.filter((m) => !byMatch.has(m.id)).length;

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
        style={{ marginBottom: 28 }}
      >
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "var(--text-primary)",
            letterSpacing: "-0.5px",
            marginBottom: 6,
          }}
        >
          Futebol
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Faça seus palpites antes do apito inicial
        </p>
      </motion.div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <TabPill
          label="Próximos"
          icon={<Calendar size={14} />}
          active={tab === "upcoming"}
          count={pendingCount > 0 ? pendingCount : undefined}
          onClick={() => setTab("upcoming")}
        />
        <TabPill
          label="Regras"
          icon={<BookOpen size={14} />}
          active={tab === "rules"}
          onClick={() => setTab("rules")}
        />
        <TabPill
          label="Resultados"
          icon={<CheckCircle2 size={14} />}
          active={tab === "finished"}
          onClick={() => setTab("finished")}
        />
      </div>

      {/* ── Content ── */}
      {tab === "rules" ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
            Como funciona a pontuação?
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.6 }}>
            A cada jogo finalizado, seus palpites são comparados com o resultado oficial da partida. Os pontos não são cumulativos para um mesmo jogo, você recebe apenas a <strong>maior pontuação</strong> que atingir:
          </p>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ padding: 16, backgroundColor: "var(--bg-elevated)", borderRadius: 12, borderLeft: "4px solid var(--color-success)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <strong style={{ fontSize: 15, color: "var(--text-primary)" }}>Placar Exato</strong>
                <span style={{ fontSize: 18, fontWeight: 800, color: "var(--color-success)" }}>+15 pts</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Acertou na mosca o resultado final. Ex: Apostou 2x1, jogo terminou 2x1.
              </div>
            </div>

            <div style={{ padding: 16, backgroundColor: "var(--bg-elevated)", borderRadius: 12, borderLeft: "4px solid var(--orange-500)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <strong style={{ fontSize: 15, color: "var(--text-primary)" }}>Vencedor + Saldo de Gols</strong>
                <span style={{ fontSize: 18, fontWeight: 800, color: "var(--orange-500)" }}>+10 pts</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Acertou quem ganhou e pela mesma diferença de gols. Ex: Apostou 3x1 (saldo +2), jogo terminou 2x0 (saldo +2).
              </div>
            </div>

            <div style={{ padding: 16, backgroundColor: "var(--bg-elevated)", borderRadius: 12, borderLeft: "4px solid var(--text-secondary)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <strong style={{ fontSize: 15, color: "var(--text-primary)" }}>Apenas Vencedor</strong>
                <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text-secondary)" }}>+5 pts</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Acertou o time vencedor ou cravou o empate (mas errou a quantidade de gols). Ex: Apostou 1x0, jogo terminou 3x1.
              </div>
            </div>

            <div style={{ padding: 16, backgroundColor: "var(--bg-elevated)", borderRadius: 12, borderLeft: "4px solid var(--border-default)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <strong style={{ fontSize: 15, color: "var(--text-primary)" }}>Erro Total</strong>
                <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text-muted)" }}>+0 pts</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Apostou na vitória de um time, mas ele empatou ou perdeu. Tente de novo no próximo jogo!
              </div>
            </div>
          </div>
        </motion.div>
      ) : loading ? (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : grouped.size === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {Array.from(grouped.entries()).map(([competition, compMatches]) => (
            <CompetitionGroup
              key={competition}
              competition={competition}
              matches={compMatches}
              byMatch={byMatch}
              onPredict={setSelectedMatch}
              onViewAllPredictions={setSelectedMatchForAll}
            />
          ))}
        </motion.div>
      )}

      {/* ── Modal de palpite ── */}
      <AnimatePresence>
        {selectedMatch && (
          <PredictionModal
            key={selectedMatch.id}
            match={selectedMatch}
            existingPrediction={byMatch.get(selectedMatch.id) ?? null}
            onClose={() => setSelectedMatch(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Modal de Todos os Palpites ── */}
      <AnimatePresence>
        {selectedMatchForAll && (
          <AllPredictionsModal
            key={`all-${selectedMatchForAll.id}`}
            match={selectedMatchForAll}
            onClose={() => setSelectedMatchForAll(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
