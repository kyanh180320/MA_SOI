import { describe, expect, it } from 'vitest';
import roomPageSource from '../pages/RoomPage.tsx?raw';
import playPageSource from '../pages/PlayPage.tsx?raw';
import playerLiveViewSource from '../components/PlayerLiveView.tsx?raw';

describe('card ritual audience', () => {
  it('keeps the card fan for players but removes it from host screens', () => {
    expect(playerLiveViewSource).toContain('LazyCardSelectionRitual');
    expect(roomPageSource).not.toContain('LazyCardSelectionRitual');
    expect(playPageSource).not.toContain('LazyCardSelectionRitual');
    expect(playPageSource).not.toContain('Xem Rút Bài');
  });
});
