import type { Game } from "../game/types";

const GAMES_KEY = "werewolf_games";

export function saveGameLocal(game: Game) {
  const games = getLocalGames();
  // Ensure we don't duplicate if saving multiple times (though we shouldn't)
  const existingIndex = games.findIndex(g => g.id === game.id);
  if (existingIndex >= 0) {
    games[existingIndex] = game;
  } else {
    games.push(game);
  }
  // Sort descending by createdAt
  games.sort((a, b) => b.createdAt - a.createdAt);
  localStorage.setItem(GAMES_KEY, JSON.stringify(games));
}

export function getLocalGames(): Game[] {
  try {
    const raw = localStorage.getItem(GAMES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
