import { describe, expect, it } from 'vitest';
import playPageSource from '../pages/PlayPage.tsx?raw';
import roomPageSource from '../pages/RoomPage.tsx?raw';
import setupPageSource from '../pages/SetupPage.tsx?raw';

describe('room deletion notification', () => {
  it('guards every online room screen with the shared deletion message and redirect', () => {
    for (const source of [roomPageSource, setupPageSource, playPageSource]) {
      expect(source).toContain('subscribeRoom');
      expect(source).toContain("title: 'Phòng đã bị xoá'");
      expect(source).toContain("navigate('/', { replace: true })");
    }
  });
});
