import { useEffect, useRef } from 'react';

export function useDismissiblePanel(onClose: () => void) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    function handleOutsideClick(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) onClose();
    }

    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [onClose]);

  return panelRef;
}
