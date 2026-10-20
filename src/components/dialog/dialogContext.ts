import { createContext } from 'react';

export type DialogTone = 'info' | 'success' | 'warning' | 'danger';

export interface AlertDialogOptions {
  title: string;
  message: string;
  tone?: DialogTone;
  confirmLabel?: string;
}

export interface ConfirmDialogOptions extends AlertDialogOptions {
  cancelLabel?: string;
}

export interface AppDialogApi {
  showAlert: (options: AlertDialogOptions) => Promise<void>;
  showConfirm: (options: ConfirmDialogOptions) => Promise<boolean>;
}

export const DialogContext = createContext<AppDialogApi | null>(null);
