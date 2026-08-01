// ─── API-Football v3 Client ───────────────────────────────────────────────────
// Usa o cache nativo do Next.js 16 (fetch + next.revalidate).
// Nunca importar em client components — apenas em route handlers e server components.

import type {
  ApiFixtureItem,
  ApiFootballResponse,
  Match,
  MatchStatus,
} from "./types";

const BASE_URL = "https://v3.football.api-sports.io";

// ─── Fetch helper ─────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  params: Record<string, string> = {},
  revalidateSeconds = 60
): Promise<ApiFootballResponse<T>> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    throw new Error(
      "API_FOOTBALL_KEY não configurada. Adicione ao .env.local."
    );
  }

  const url = new URL(path, BASE_URL);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: {
      "x-apisports-key": key,
    },
    // Cache nativo Next.js 16 — sem Redis necessário
    next: { revalidate: revalidateSeconds },
  });

  if (!res.ok) {
    throw new Error(`API-Football error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<ApiFootballResponse<T>>;
}

// ─── Normalização ─────────────────────────────────────────────────────────────

const LIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE"]);
const FINISHED_STATUSES = new Set(["FT", "AET", "PEN", "AWD", "WO"]);

function classifyStatus(short: string): MatchStatus {
  if (LIVE_STATUSES.has(short)) return "LIVE";
  if (FINISHED_STATUSES.has(short)) return "FINISHED";
  if (short === "NS" || short === "TBD") return "UPCOMING";
  return "OTHER";
}

export function normalizeFixture(item: ApiFixtureItem): Match {
  const { fixture, league, teams, goals } = item;
  const statusShort = fixture.status.short;
  return {
    id: String(fixture.id),
    externalId: fixture.id,
    homeTeam: teams.home.name,
    homeLogo: teams.home.logo,
    awayTeam: teams.away.name,
    awayLogo: teams.away.logo,
    homeScore: goals.home,
    awayScore: goals.away,
    minute: fixture.status.elapsed,
    statusShort,
    status: classifyStatus(statusShort),
    leagueId: league.id,
    competition: league.name,
    competitionLogo: league.logo,
    round: league.round,
    startTime: fixture.date,
    updatedAt: new Date().toISOString(),
  };
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

const ALLOWED_LEAGUES = new Set([
  // Nacionais principais
  71,  // Brasileirão Série A
  72,  // Brasileirão Série B
  39,  // Premier League
  140, // La Liga
  135, // Serie A TIM
  61,  // Ligue 1
  94,  // Liga Portugal
  307, // Saudi Pro League
  253, // MLS
  // Torneios de Seleções
  1,   // Copa do Mundo
  4,   // Eurocopa
  9,   // Copa America
  // Copas Internacionais
  13,  // Libertadores
  11,  // Sulamericana
  2,   // Champions League
  3,   // Europa League
  // Copas Nacionais
  73,  // Copa do Brasil
  45,  // FA Cup
  143, // Copa do Rei
  137, // Coppa Italia
  66,  // Coupe de France
  96,  // Taça de Portugal
]);

/** Partidas ao vivo (cache curto: 60 s) */
export async function getLiveMatches(): Promise<Match[]> {
  const data = await apiFetch<ApiFixtureItem>("/fixtures", { live: "all" }, 60);
  return data.response
    .filter((item) => ALLOWED_LEAGUES.has(item.league.id))
    .map(normalizeFixture);
}

/** Partidas de uma data (YYYY-MM-DD). Cache 5 min. */
export async function getFixturesByDate(date: string): Promise<Match[]> {
  const data = await apiFetch<ApiFixtureItem>(
    "/fixtures",
    { date, timezone: "America/Sao_Paulo" },
    300
  );
  return data.response
    .filter((item) => ALLOWED_LEAGUES.has(item.league.id))
    .map(normalizeFixture);
}

/** Partidas dos próximos N dias (incluindo hoje) */
export async function getUpcomingFixtures(days = 3): Promise<Match[]> {
  const promises = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    promises.push(getFixturesByDate(dateStr));
  }
  const results = await Promise.all(promises);
  return results.flat();
}

export async function getFixtureById(fixtureId: string): Promise<Match | null> {
  const data = await apiFetch<ApiFixtureItem>(
    "/fixtures",
    { id: fixtureId },
    60
  );
  const item = data.response[0];
  if (!item) return null;
  return normalizeFixture(item);
}
