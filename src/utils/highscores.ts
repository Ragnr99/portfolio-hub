// Local high-score persistence, shared by every arcade game.

const KEY = 'arcade-highscores'

type Scores = Record<string, number>

function load(): Scores {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}

export function getHighScore(game: string): number {
  return load()[game] || 0
}

/** Records the score if it beats the best; returns true on a new record. */
export function submitScore(game: string, score: number): boolean {
  const scores = load()
  if (score <= (scores[game] || 0)) return false
  scores[game] = score
  try {
    localStorage.setItem(KEY, JSON.stringify(scores))
  } catch {
    /* storage full/blocked - the run still counts, it just isn't saved */
  }
  return true
}
