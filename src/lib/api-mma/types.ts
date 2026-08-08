export type UfcFightStatus = "UPCOMING" | "LIVE" | "FINISHED" | "OTHER";
export type UfcMethod = "KO/TKO" | "Submission" | "Decision" | "Other";

export interface UfcFighter {
  id: number;
  name: string;
  photo: string | null;
  nationality: string | null;
}

export interface UfcFight {
  id: string;
  externalId: number;
  fighter1: string;
  fighter1Photo: string | null;
  fighter1Id: number;
  fighter2: string;
  fighter2Photo: string | null;
  fighter2Id: number;
  winnerId: number | null;
  method: UfcMethod | null;
  weightClass: string;
  isTitleFight: boolean;
  isMainEvent: boolean;
  eventId: number;
  eventName: string;
  status: UfcFightStatus;
  startTime: string;
  updatedAt: string;
}

export interface ApiMmaFight {
  id: number;
  status: string;
  date: string;
  weight_class: { name: string };
  title_fight: boolean;
  event: { id: number; name: string };
  fighters: {
    fighter: { id: number; name: string; thumbnail: string | null; nationality: string | null };
    corner: string;
    winner: boolean;
  }[];
  result?: {
    winner_id: number | null;
    method: string;
  } | null;
}
