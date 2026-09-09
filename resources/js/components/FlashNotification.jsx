import { usePage } from '@inertiajs/react';
import { useDisclosure } from '@mantine/hooks';
import { useEffect } from 'react';
import useToastStore from '@/hooks/store/useToastStore';
import StyledToast, { TOAST_TYPES } from './StyledToast';

export default function FlashNotification() {
  const [opened, { open, close }] = useDisclosure(false);
  const { flash } = usePage().props;

  const { toast, clear } = useToastStore();

  // Toast disparado desde el flash de sesión (redirect()->success(), etc).
  useEffect(() => {
    if (!flash) return;

    open();
    const timeoutId = setTimeout(() => close(), TOAST_TYPES[flash.type]?.timeout);
    return () => clearTimeout(timeoutId);
  }, [flash]);

  // Toast disparado a mano desde el cliente (useToastStore.show(...)).
  useEffect(() => {
    if (!toast) return;

    open();
    const timeoutId = setTimeout(() => {
      close();
      clear();
    }, TOAST_TYPES[toast.type]?.timeout);
    return () => clearTimeout(timeoutId);
  }, [toast]);

  const active = toast ?? flash;

  const handleClose = () => {
    close();
    if (toast) clear();
  };

  return (
    <StyledToast
      opened={opened && !!active}
      type={active?.type}
      title={active?.title}
      message={active?.message}
      onClose={handleClose}
    />
  );
}
