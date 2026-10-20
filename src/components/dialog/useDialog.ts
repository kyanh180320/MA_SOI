import { useContext } from 'react';
import { DialogContext } from './dialogContext';

export function useDialog() {
  const dialog = useContext(DialogContext);
  if (!dialog) {
    throw new Error('useDialog phải được dùng bên trong DialogProvider');
  }
  return dialog;
}
