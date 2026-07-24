// ─── API-Football v3 — Tipos ─────────────────────────────────────────────────

export interface ApiFootballResponse<T> {
  get: string;
  parameters: Record<string, unknown>;
  errors: unknown[];
  results: number;
  paging: { current: number; total: number };
  response: T[];
}

// ─── Fixture / Match ─────────────────────────────────────────────────────────

export interface ApiTeam {
  id: number;
  name: string;
  logo: string;
  winner: boolean | null;
}

export interface ApiGoals {
  home: number | null;
  away: number | null;
}

export interface ApiScore {
  halftime: ApiGoals;
  fulltime: ApiGoals;
  extratime: ApiGoals;
  penalty: ApiGoals;
}

export interface ApiStatus {
  long: string;
  short: string; // "NS" | "1H" | "HT" | "2H" | "ET" | "P" | "FT" | "AET" | "PEN" | "BT" | "SUSP" | "INT" | "PST" | "CANC" | "ABD" | "AWD" | "WO" | "LIVE"
  elapsed: number | null;
}

export interface ApiFixture {
  id: number;
  referee: string | null;
  timezone: string;
  date: string; // ISO 8601
  timestamp: number;
  status: ApiStatus;
}

export interface ApiLeague {
  id: number;
  name: string;
  country: string;
  logo: string;
  flag: string | null;
  season: number;
  round: string;
}

export interface ApiFixtureItem {
  fixture: ApiFixture;
  league: ApiLeague;
  teams: {
    home: ApiTeam;
    away: ApiTeam;
  };
  goals: ApiGoals;
  score: ApiScore;
}

// ─── Modelo normalizado para Firestore ───────────────────────────────────────

export type MatchStatus = "LIVE" | "UPCOMING" | "FINISHED" | "OTHER";

export interface Match {
  id: string;             // fixture.id como string
  externalId: number;
  homeTeam: string;
  homeLogo: string;
  awayTeam: string;
  awayLogo: string;
  homeScore: number | null;
  awayScore: number | null;
  minute: number | null;
  statusShort: string;
  status: MatchStatus;
  leagueId?: number;
  competition: string;
  competitionLogo: string;
  round: string;
  startTime: string;      // ISO 8601
  updatedAt: string;      // ISO 8601
}
