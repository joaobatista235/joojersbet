import type { UfcMethod } from "@/lib/api-mma/types";

export interface UfcScoringInput {
  predFighterId: number;
  predMethod: UfcMethod | null;
  realWinnerId: number | null;
  realMethod: UfcMethod | null;
}

export interface UfcScoringResult {
  correctWinner: boolean;
  correctMethod: boolean;
  pointsEarned: number;
}

export function calculateUfcScore(input: UfcScoringInput): UfcScoringResult {
  const { predFighterId, predMethod, realWinnerId, realMethod } = input;

  if (realWinnerId === null) {
    return { correctWinner: false, correctMethod: false, pointsEarned: 0 };
  }

  const correctWinner = predFighterId === realWinnerId;
  const correctMethod = correctWinner && predMethod !== null && predMethod === realMethod;

  let pointsEarned = 0;
  if (correctWinner && correctMethod) {
    pointsEarned = 15;
  } else if (correctWinner) {
    pointsEarned = 10;
  }

  return { correctWinner, correctMethod, pointsEarned };
}
