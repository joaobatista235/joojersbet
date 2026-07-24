export interface ScoringInput {
  predHome: number;
  predAway: number;
  realHome: number;
  realAway: number;
}

export interface ScoringResult {
  exactScore: boolean;
  correctGoalDiff: boolean;
  correctWinner: boolean;
  pointsEarned: number;
}

function winner(home: number, away: number): "home" | "away" | "draw" {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

/**
 * Calcula os pontos de um palpite com base no resultado real.
 *
 * Tabela:
 *  - Placar exato                         → 15 pts
 *  - Vencedor certo + diferença de gols   → 10 pts
 *  - Vencedor certo (ou empate certo)     →  5 pts
 *  - Erro total                           →  0 pts
 */
export function calculateScore({
  predHome,
  predAway,
  realHome,
  realAway,
}: ScoringInput): ScoringResult {
  const exactScore = predHome === realHome && predAway === realAway;
  const correctWinner = winner(predHome, predAway) === winner(realHome, realAway);
  const correctGoalDiff =
    correctWinner && predHome - predAway === realHome - realAway;

  let pointsEarned = 0;
  if (exactScore) {
    pointsEarned = 15;
  } else if (correctGoalDiff) {
    pointsEarned = 10;
  } else if (correctWinner) {
    pointsEarned = 5;
  }

  return { exactScore, correctGoalDiff, correctWinner, pointsEarned };
}
