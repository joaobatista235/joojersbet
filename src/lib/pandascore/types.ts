export type Cs2MatchStatus = "LIVE" | "UPCOMING" | "FINISHED" | "OTHER";

export interface Cs2Team {
  id: number;
  name: string;
  acronym: string;
  logo: string | null;
}

export interface Cs2Match {
  id: string;
  externalId: number;
  team1: string;
  team1Logo: string | null;
  team1Id: number;
  team2: string;
  team2Logo: string | null;
  team2Id: number;
  team1Score: number | null;
  team2Score: number | null;
  winnerId: number | null;
  status: Cs2MatchStatus;
  tournament: string;
  tournamentLogo: string | null;
  serie: string;
  bestOf: number;
  startTime: string;
  updatedAt: string;
}

export interface PandaScoreMatch {
  id: number;
  name: string;
  status: string;
  begin_at: string | null;
  scheduled_at: string | null;
  number_of_games: number;
  winner_id: number | null;
  opponents: {
    opponent: {
      id: number;
      name: string;
      acronym: string;
      image_url: string | null;
    };
    type: string;
  }[];
  results: {
    team_id: number;
    score: number;
  }[];
  tournament: {
    id: number;
    name: string;
    slug: string;
  };
  serie: {
    id: number;
    full_name: string;
  };
  league: {
    id: number;
    name: string;
    image_url: string | null;
  };
}
