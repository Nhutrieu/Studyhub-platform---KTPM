import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
    sidebarOpen: boolean;
    theme: 'light' | 'dark' | 'system';
    toggleSidebar: () => void;
    setSidebarOpen: (isOpen: boolean) => void;
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            sidebarOpen: false,
            theme: 'light',
            toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
            setSidebarOpen: (isOpen) => set({ sidebarOpen: isOpen }),
            setTheme: (theme) => set({ theme }),
        }),
        {
            name: 'ui-storage',
        }
    )
);
