import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Game } from '../game/types';
import { syncRoomGame } from '../services/roomService';

interface GameContextType {
  game: Game | null;
  setGame: (game: Game | null) => void;
  updateGame: (updater: (prev: Game) => Game) => void;
  undo: () => void;
  canUndo: boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'werewolf_current_game';

export function GameProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<Game[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) return [JSON.parse(saved)];
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const game = history.length > 0 ? history[history.length - 1] : null;

  // Sync to localStorage and Firestore Room if game is linked to an online room
  useEffect(() => {
    if (game) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(game));
      if (game.roomId) {
        syncRoomGame(game.roomId, game).catch(err => {
          console.error("Lỗi đồng bộ ván chơi lên phòng online:", err);
        });
      }
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, [game]);

  const setGame = (newGame: Game | null) => {
    if (newGame === null) {
      setHistory([]);
    } else {
      setHistory([newGame]);
    }
  };

  const updateGame = (updater: (prev: Game) => Game) => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const current = prev[prev.length - 1];
      const next = updater(current);
      return [...prev, next];
    });
  };

  const undo = () => {
    setHistory(prev => {
      if (prev.length > 1) {
        return prev.slice(0, prev.length - 1);
      }
      return prev;
    });
  };

  return (
    <GameContext.Provider value={{ game, setGame, updateGame, undo, canUndo: history.length > 1 }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within GameProvider");
  return context;
}
