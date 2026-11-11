import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FavoriteItem, WatchHistoryItem } from '@/types/drama';

interface AppState {
  favorites: FavoriteItem[];
  history: WatchHistoryItem[];
  
  // Favorites actions
  addFavorite: (item: FavoriteItem) => void;
  removeFavorite: (dramaId: string) => void;
  isFavorite: (dramaId: string) => boolean;

  // History actions
  updateHistory: (item: WatchHistoryItem) => void;
  removeFromHistory: (dramaId: string) => void;
  clearHistory: () => void;
  getHistoryItem: (dramaId: string) => WatchHistoryItem | undefined;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      favorites: [],
      history: [],

      addFavorite: (item) => {
        set((state) => {
          if (state.favorites.some((f) => f.dramaId === item.dramaId)) return state;
          return { favorites: [item, ...state.favorites] };
        });
      },

      removeFavorite: (dramaId) => {
        set((state) => ({
          favorites: state.favorites.filter((f) => f.dramaId !== dramaId),
        }));
      },

      isFavorite: (dramaId) => {
        return get().favorites.some((f) => f.dramaId === dramaId);
      },

      updateHistory: (item) => {
        set((state) => {
          const filtered = state.history.filter((h) => h.dramaId !== item.dramaId);
          return { history: [item, ...filtered] };
        });
      },

      removeFromHistory: (dramaId) => {
        set((state) => ({
          history: state.history.filter((h) => h.dramaId !== dramaId),
        }));
      },

      clearHistory: () => {
        set({ history: [] });
      },

      getHistoryItem: (dramaId) => {
        return get().history.find((h) => h.dramaId === dramaId);
      },
    }),
    {
      name: 'dracin-web-storage',
    }
  )
);
