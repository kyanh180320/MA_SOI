import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CardSelectionRitual } from './CardSelectionRitual';

describe('CardSelectionRitual', () => {
  it('luôn hiển thị một quạt 7 lá không phụ thuộc số người chơi', () => {
    const markup = renderToStaticMarkup(
      <CardSelectionRitual
        myRole="villager"
        roleInfo={{
          name: 'Dân làng',
          team: 'Phe Dân',
          icon: '👨‍🌾',
          color: '#fff',
          description: 'Tìm ra Ma Sói.',
          actionHint: 'Hãy quan sát và suy luận.',
        }}
        onComplete={vi.fn()}
      />,
    );

    expect(markup.match(/aria-label="Chọn lá bài định mệnh số \d"/g)).toHaveLength(7);
    expect(markup).toContain('Chọn một lá trong quạt bài để rút số phận');
    expect(markup).not.toMatch(/chia \d+ lá bài cho \d+ người chơi/);
  });
});
