import type { ApiMmaFight, UfcFight, UfcFightStatus, UfcMethod } from "./types";

const BASE_URL = "https://v1.mma.api-sports.io";
const UFC_ORGANIZATION_ID = 1;

async function mmaFetch<T>(path: string, params: Record<string, string> = {}): Promise<{ response: T }> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY não configurada");

  const url = new URL(path, BASE_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    headers: { "x-apisports-key": key },
    next: { revalidate: 300 },
  });

  if (!res.ok) throw new Error(`MMA API error: ${res.status} ${res.statusText}`);
  return res.json();
}

function classifyStatus(status: string): UfcFightStatus {
  if (status === "Finished") return "FINISHED";
  if (status === "Ongoing") return "LIVE";
  if (status === "Scheduled") return "UPCOMING";
  return "OTHER";
}

function normalizeMethod(raw: string): UfcMethod {
  const lower = raw.toLowerCase();
  if (lower.includes("ko") || lower.includes("tko")) return "KO/TKO";
  if (lower.includes("sub")) return "Submission";
  if (lower.includes("dec")) return "Decision";
  return "Other";
}

function normalizeFight(fight: ApiMmaFight): UfcFight | null {
  if (fight.fighters.length < 2) return null;

  const red = fight.fighters.find((f) => f.corner === "red") ?? fight.fighters[0];
  const blue = fight.fighters.find((f) => f.corner === "blue") ?? fight.fighters[1];
  if (!red || !blue) return null;

  const winnerId = fight.result?.winner_id ?? null;
  const method = fight.result?.method ? normalizeMethod(fight.result.method) : null;

  return {
    id: String(fight.id),
    externalId: fight.id,
    fighter1: red.fighter.name,
    fighter1Photo: red.fighter.thumbnail,
    fighter1Id: red.fighter.id,
    fighter2: blue.fighter.name,
    fighter2Photo: blue.fighter.thumbnail,
    fighter2Id: blue.fighter.id,
    winnerId,
    method,
    weightClass: fight.weight_class?.name ?? "Unknown",
    isTitleFight: fight.title_fight ?? false,
    isMainEvent: false,
    eventId: fight.event.id,
    eventName: fight.event.name,
    status: classifyStatus(fight.status),
    startTime: fight.date,
    updatedAt: new Date().toISOString(),
  };
}

export async function getUpcomingUfcFights(): Promise<UfcFight[]> {
  const data = await mmaFetch<ApiMmaFight[]>("/fights", {
    organization: String(UFC_ORGANIZATION_ID),
    status: "Scheduled",
  });
  return (data.response ?? []).map(normalizeFight).filter(Boolean) as UfcFight[];
}

export async function getLiveUfcFights(): Promise<UfcFight[]> {
  const data = await mmaFetch<ApiMmaFight[]>("/fights", {
    organization: String(UFC_ORGANIZATION_ID),
    status: "Ongoing",
  });
  return (data.response ?? []).map(normalizeFight).filter(Boolean) as UfcFight[];
}

export async function getPastUfcFights(season?: string): Promise<UfcFight[]> {
  const params: Record<string, string> = {
    organization: String(UFC_ORGANIZATION_ID),
    status: "Finished",
  };
  if (season) params.season = season;

  const data = await mmaFetch<ApiMmaFight[]>("/fights", params);
  return (data.response ?? []).map(normalizeFight).filter(Boolean) as UfcFight[];
}

export async function getUfcFightById(id: string): Promise<UfcFight | null> {
  const data = await mmaFetch<ApiMmaFight[]>("/fights", { id });
  const fight = data.response?.[0];
  if (!fight) return null;
  return normalizeFight(fight);
}
