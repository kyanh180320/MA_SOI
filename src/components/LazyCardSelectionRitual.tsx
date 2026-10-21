import React, { Suspense } from 'react';
import type { CardSelectionRitualProps } from './CardSelectionRitual';

const CardSelectionRitual = React.lazy(() => import('./CardSelectionRitual'));

export function LazyCardSelectionRitual(props: CardSelectionRitualProps) {
  return (
    <Suspense
      fallback={(
        <div
          role="status"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(4, 6, 14, 0.98)',
            color: 'var(--gold-100)',
            fontFamily: 'var(--font-title)',
          }}
        >
          Đang chuẩn bị bộ bài…
        </div>
      )}
    >
      <CardSelectionRitual {...props} />
    </Suspense>
  );
}
