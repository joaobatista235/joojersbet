import type { Cs2Match, Cs2MatchStatus, PandaScoreMatch } from "./types";

const BASE_URL = "https://api.pandascore.co";

const TIER1_TOURNAMENT_SLUGS = [
  "cs-go-major",
  "cs2-major",
  "blast",
  "iem",
  "esl",
  "esl-pro-league",
  "blast-premier",
  "iem-cologne",
  "iem-katowice",
  "pgl",
  "major",
];

async function pandaFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const key = process.env.PANDASCORE_API_KEY;
  if (!key) throw new Error("PANDASCORE_API_KEY não configurada");

  const url = new URL(path, BASE_URL);
  url.searchParams.set("per_page", "50");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${key}` },
    next: { revalidate: 120 },
  });

  if (!res.ok) throw new Error(`PandaScore error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

function classifyStatus(status: string): Cs2MatchStatus {
  if (status === "running") return "LIVE";
  if (status === "finished") return "FINISHED";
  if (status === "not_started") return "UPCOMING";
  return "OTHER";
}

function normalizeMatch(m: PandaScoreMatch): Cs2Match | null {
  if (m.opponents.length < 2) return null;

  const team1 = m.opponents[0]?.opponent;
  const team2 = m.opponents[1]?.opponent;
  if (!team1 || !team2) return null;

  const team1Result = m.results.find((r) => r.team_id === team1.id);
  const team2Result = m.results.find((r) => r.team_id === team2.id);

  const startTime = m.begin_at ?? m.scheduled_at ?? new Date().toISOString();

  return {
    id: String(m.id),
    externalId: m.id,
    team1: team1.name,
    team1Logo: team1.image_url,
    team1Id: team1.id,
    team2: team2.name,
    team2Logo: team2.image_url,
    team2Id: team2.id,
    team1Score: team1Result?.score ?? null,
    team2Score: team2Result?.score ?? null,
    winnerId: m.winner_id,
    status: classifyStatus(m.status),
    tournament: m.league?.name ?? m.tournament?.name ?? "CS2",
    tournamentLogo: m.league?.image_url ?? null,
    serie: m.serie?.full_name ?? "",
    bestOf: m.number_of_games ?? 3,
    startTime,
    updatedAt: new Date().toISOString(),
  };
}

function isTier1(match: PandaScoreMatch): boolean {
  const slug = (match.tournament?.slug ?? "").toLowerCase();
  const serieName = (match.serie?.full_name ?? "").toLowerCase();
  const leagueName = (match.league?.name ?? "").toLowerCase();
  return TIER1_TOURNAMENT_SLUGS.some(
    (t) => slug.includes(t) || serieName.includes(t) || leagueName.includes(t)
  );
}

export async function getLiveCs2Matches(): Promise<Cs2Match[]> {
  const data = await pandaFetch<PandaScoreMatch[]>("/csgo/matches/running");
  return data.filter(isTier1).map(normalizeMatch).filter(Boolean) as Cs2Match[];
}

export async function getUpcomingCs2Matches(days = 7): Promise<Cs2Match[]> {
  const from = new Date().toISOString();
  const to = new Date(Date.now() + days * 86400 * 1000).toISOString();
  const data = await pandaFetch<PandaScoreMatch[]>("/csgo/matches/upcoming", {
    "range[scheduled_at]": `${from},${to}`,
    sort: "scheduled_at",
  });
  return data.filter(isTier1).map(normalizeMatch).filter(Boolean) as Cs2Match[];
}

export async function getPastCs2Matches(): Promise<Cs2Match[]> {
  const data = await pandaFetch<PandaScoreMatch[]>("/csgo/matches/past", {
    sort: "-begin_at",
  });
  return data.filter(isTier1).map(normalizeMatch).filter(Boolean) as Cs2Match[];
}

export async function getCs2MatchById(id: string): Promise<Cs2Match | null> {
  const data = await pandaFetch<PandaScoreMatch>(`/csgo/matches/${id}`);
  return normalizeMatch(data);
}
