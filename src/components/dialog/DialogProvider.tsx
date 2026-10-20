import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button, Modal } from '../ui';
import {
  DialogContext,
  type AlertDialogOptions,
  type AppDialogApi,
  type ConfirmDialogOptions,
  type DialogTone,
} from './dialogContext';
import styles from './DialogProvider.module.css';

type DialogKind = 'alert' | 'confirm';

interface DialogRequest {
  kind: DialogKind;
  options: ConfirmDialogOptions;
  resolve: (confirmed: boolean) => void;
}

interface DialogProviderProps {
  children: ReactNode;
}

const ICONS: Record<DialogTone, string> = {
  info: '✦',
  success: '✓',
  warning: '!',
  danger: '✕',
};

export function DialogProvider({ children }: DialogProviderProps) {
  const activeRequestRef = useRef<DialogRequest | null>(null);
  const queuedRequestsRef = useRef<DialogRequest[]>([]);
  const [activeRequest, setActiveRequest] = useState<DialogRequest | null>(null);

  const enqueue = useCallback((kind: DialogKind, options: ConfirmDialogOptions) => {
    return new Promise<boolean>(resolve => {
      const request: DialogRequest = { kind, options, resolve };
      if (activeRequestRef.current) {
        queuedRequestsRef.current.push(request);
        return;
      }
      activeRequestRef.current = request;
      setActiveRequest(request);
    });
  }, []);

  const finishActive = useCallback((confirmed: boolean) => {
    const current = activeRequestRef.current;
    if (!current) return;

    current.resolve(confirmed);
    const next = queuedRequestsRef.current.shift() ?? null;
    activeRequestRef.current = next;
    setActiveRequest(next);
  }, []);

  useEffect(() => () => {
    activeRequestRef.current?.resolve(false);
    queuedRequestsRef.current.forEach(request => request.resolve(false));
    queuedRequestsRef.current = [];
    activeRequestRef.current = null;
  }, []);

  const api = useMemo<AppDialogApi>(() => ({
    showAlert: async (options: AlertDialogOptions) => {
      await enqueue('alert', options);
    },
    showConfirm: (options: ConfirmDialogOptions) => enqueue('confirm', options),
  }), [enqueue]);

  const tone = activeRequest?.options.tone ?? (activeRequest?.kind === 'confirm' ? 'warning' : 'info');
  const isConfirm = activeRequest?.kind === 'confirm';
  const dismissValue = !isConfirm;

  return (
    <DialogContext.Provider value={api}>
      {children}
      <Modal
        isOpen={activeRequest !== null}
        onClose={() => finishActive(dismissValue)}
        title={activeRequest?.options.title}
        footer={activeRequest && (
          <div className={styles.actions}>
            {isConfirm && (
              <Button
                variant="secondary"
                fullWidth
                autoFocus
                onClick={() => finishActive(false)}
              >
                {activeRequest.options.cancelLabel ?? 'Hủy'}
              </Button>
            )}
            <Button
              variant={tone === 'danger' ? 'danger' : 'primary'}
              fullWidth
              autoFocus={!isConfirm}
              onClick={() => finishActive(true)}
            >
              {activeRequest.options.confirmLabel ?? (isConfirm ? 'Xác nhận' : 'Đã hiểu')}
            </Button>
          </div>
        )}
      >
        {activeRequest && (
          <div className={`${styles.content} ${styles[tone]}`}>
            <div className={styles.icon} aria-hidden="true">{ICONS[tone]}</div>
            <p>{activeRequest.options.message}</p>
          </div>
        )}
      </Modal>
    </DialogContext.Provider>
  );
}
