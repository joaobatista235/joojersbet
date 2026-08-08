export interface Cs2ScoringInput {
  predTeamId: number;
  predTeam1Score: number;
  predTeam2Score: number;
  realWinnerId: number | null;
  realTeam1Score: number | null;
  realTeam2Score: number | null;
  team1Id: number;
  team2Id: number;
}

export interface Cs2ScoringResult {
  correctWinner: boolean;
  exactMapScore: boolean;
  correctMapDiff: boolean;
  pointsEarned: number;
}

export function calculateCs2Score(input: Cs2ScoringInput): Cs2ScoringResult {
  const { predTeamId, predTeam1Score, predTeam2Score, realWinnerId, realTeam1Score, realTeam2Score, team1Id, team2Id } = input;

  if (realWinnerId === null || realTeam1Score === null || realTeam2Score === null) {
    return { correctWinner: false, exactMapScore: false, correctMapDiff: false, pointsEarned: 0 };
  }

  const predWinnerId = predTeam1Score > predTeam2Score ? team1Id : team2Id;
  const realWinnerTeamId = realWinnerId;

  const correctWinner = predWinnerId === realWinnerTeamId;
  const exactMapScore =
    correctWinner &&
    predTeam1Score === realTeam1Score &&
    predTeam2Score === realTeam2Score;
  const correctMapDiff =
    correctWinner &&
    (predTeam1Score - predTeam2Score) === (realTeam1Score - realTeam2Score);

  let pointsEarned = 0;
  if (exactMapScore) {
    pointsEarned = 15;
  } else if (correctMapDiff) {
    pointsEarned = 10;
  } else if (correctWinner) {
    pointsEarned = 5;
  }

  return { correctWinner, exactMapScore, correctMapDiff, pointsEarned };
}
