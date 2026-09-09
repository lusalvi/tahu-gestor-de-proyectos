import { create } from 'zustand';

/**
 * Store util para avisos que dependen de una verificación hecha en el
 * navegador, como el estado de la tarea a la que apunta una notificación.
 */
const useToastStore = create((set) => ({
  toast: null,
  show: ({ type, title, message }) => set({ toast: { type, title, message, key: Date.now() } }),
  clear: () => set({ toast: null }),
}));

export default useToastStore;