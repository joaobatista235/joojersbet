/**
 * UFC client usando a ESPN API publica (sem chave de API)
 * Endpoint: https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard
 * Suporta dados atuais de 2026 sem custo.
 */
import type { UfcFight, UfcFightStatus, UfcMethod } from "./types";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/mma/ufc";
const ESPN_CORE = "https://sports.core.api.espn.com/v2/sports/mma/leagues/ufc";

interface EspnAthlete {
  fullName: string;
  displayName: string;
  headshot?: { href: string };
  flag?: { href: string };
  accolades?: Array<{ id: string; name: string }>;
}

interface EspnCompetitor {
  id: string;
  order: number;
  winner: boolean;
  athlete?: EspnAthlete;
  records?: Array<{ name: string; summary: string }>;
}

interface EspnStatusType {
  id: string;
  name: string;
  state: "pre" | "in" | "post";
  completed: boolean;
  description: string;
}

interface EspnCompetition {
  id: string;
  date: string;
  startDate: string;
  type?: { id: string; abbreviation?: string };
  competitors: EspnCompetitor[];
  status: { type: EspnStatusType };
  details?: Array<{ id: string; type: { id: string; text: string } }>;
  format?: { regulation?: { periods?: number } };
}

interface EspnEvent {
  id: string;
  name: string;
  shortName?: string;
  date: string;
  competitions: EspnCompetition[];
  status: { type: EspnStatusType };
}

interface EspnScoreboardResponse {
  events?: EspnEvent[];
}

function classifyStatus(espnState: "pre" | "in" | "post", completed: boolean): UfcFightStatus {
  if (espnState === "pre") return "UPCOMING";
  if (espnState === "in") return "LIVE";
  if (espnState === "post" && completed) return "FINISHED";
  return "OTHER";
}

function extractMethod(details?: EspnCompetition["details"]): UfcMethod | null {
  if (!details) return null;
  // detail types: "Unofficial Winner Submission", "KO/TKO", "Decision", etc.
  const winnerDetail = details.find((d) => d.type.text.toLowerCase().includes("winner"));
  if (!winnerDetail) return null;
  const text = winnerDetail.type.text.toLowerCase();
  if (text.includes("ko") || text.includes("tko")) return "KO/TKO";
  if (text.includes("sub")) return "Submission";
  if (text.includes("dec")) return "Decision";
  return "Other";
}

function normalizeCompetition(comp: EspnCompetition, event: EspnEvent): UfcFight | null {
  const c1 = comp.competitors.find((c) => c.order === 1);
  const c2 = comp.competitors.find((c) => c.order === 2);
  if (!c1 || !c2) return null;

  const statusType = comp.status.type;
  const status = classifyStatus(statusType.state, statusType.completed);

  const winner = comp.competitors.find((c) => c.winner);
  const winnerId = winner ? parseInt(winner.id) : null;

  return {
    id: comp.id,
    externalId: parseInt(comp.id),
    fighter1: c1.athlete?.fullName ?? "Fighter 1",
    fighter1Photo: c1.athlete?.headshot?.href ?? null,
    fighter1Id: parseInt(c1.id),
    fighter2: c2.athlete?.fullName ?? "Fighter 2",
    fighter2Photo: c2.athlete?.headshot?.href ?? null,
    fighter2Id: parseInt(c2.id),
    winnerId,
    method: extractMethod(comp.details),
    weightClass: comp.type?.abbreviation ?? "Unknown",
    isTitleFight: c1.athlete?.accolades?.length
      ? c1.athlete.accolades.some((a) => a.name.toLowerCase().includes("title"))
      : c2.athlete?.accolades?.some((a) => a.name.toLowerCase().includes("title")) ?? false,
    isMainEvent: false,
    eventId: parseInt(event.id),
    eventName: event.name,
    status,
    startTime: comp.startDate ?? comp.date,
    updatedAt: new Date().toISOString(),
  };
}

async function fetchScoreboard(dateStr?: string): Promise<EspnEvent[]> {
  const url = dateStr
    ? `${ESPN_BASE}/scoreboard?dates=${dateStr}`
    : `${ESPN_BASE}/scoreboard`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });

  if (!res.ok) return [];
  const data: EspnScoreboardResponse = await res.json();
  return data.events ?? [];
}

/** Gera strings de data YYYYMMDD para os proximos N dias */
function getUpcomingDateStrings(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i <= days; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    dates.push(d.toISOString().slice(0, 10).replace(/-/g, ""));
  }
  return dates;
}

/** Gera strings de data YYYYMMDD para os ultimos N dias */
function getPastDateStrings(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 1; i <= days; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    dates.push(d.toISOString().slice(0, 10).replace(/-/g, ""));
  }
  return dates;
}

export async function getUpcomingUfcFights(): Promise<UfcFight[]> {
  // Buscar evento atual + proximos 21 dias (eventos UFC sao semanais)
  const datesToFetch = ["", ...getUpcomingDateStrings(21)];

  const allEvents = (
    await Promise.all(datesToFetch.map((d) => fetchScoreboard(d || undefined)))
  ).flat();

  // Deduplicar eventos por ID
  const seenEvents = new Set<string>();
  const uniqueEvents = allEvents.filter((e) => {
    if (seenEvents.has(e.id)) return false;
    seenEvents.add(e.id);
    return true;
  });

  const fights: UfcFight[] = [];
  for (const event of uniqueEvents) {
    for (const comp of event.competitions) {
      const statusState = comp.status.type.state;
      if (statusState === "pre") {
        const fight = normalizeCompetition(comp, event);
        if (fight) fights.push(fight);
      }
    }
  }

  return fights;
}

export async function getLiveUfcFights(): Promise<UfcFight[]> {
  const events = await fetchScoreboard();
  const fights: UfcFight[] = [];

  for (const event of events) {
    for (const comp of event.competitions) {
      if (comp.status.type.state === "in") {
        const fight = normalizeCompetition(comp, event);
        if (fight) fights.push(fight);
      }
    }
  }

  return fights;
}

export async function getPastUfcFights(): Promise<UfcFight[]> {
  // Buscar ultimos 30 dias para pegar resultados recentes
  const datesToFetch = ["", ...getPastDateStrings(30)];

  const allEvents = (
    await Promise.all(datesToFetch.map((d) => fetchScoreboard(d || undefined)))
  ).flat();

  const seenEvents = new Set<string>();
  const uniqueEvents = allEvents.filter((e) => {
    if (seenEvents.has(e.id)) return false;
    seenEvents.add(e.id);
    return true;
  });

  const fights: UfcFight[] = [];
  for (const event of uniqueEvents) {
    for (const comp of event.competitions) {
      if (comp.status.type.state === "post" && comp.status.type.completed) {
        const fight = normalizeCompetition(comp, event);
        if (fight) fights.push(fight);
      }
    }
  }

  return fights;
}

export async function getUfcFightById(id: string): Promise<UfcFight | null> {
  // ESPN nao tem endpoint por ID de fight - busca no scoreboard atual
  const events = await fetchScoreboard();
  for (const event of events) {
    const comp = event.competitions.find((c) => c.id === id);
    if (comp) return normalizeCompetition(comp, event);
  }
  return null;
}
