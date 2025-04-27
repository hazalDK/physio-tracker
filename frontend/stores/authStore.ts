// stores/authStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";

// Create an async storage adapter for SecureStore
const secureStorage = createJSONStorage(() => ({
  getItem: async (name: string) => {
    try {
      const value = await SecureStore.getItemAsync(name);
      return value ?? null;
    } catch (e) {
      console.error("Error getting item from SecureStore:", e);
      return null;
    }
  },
  setItem: async (name: string, value: string) => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch (e) {
      console.error("Error setting item in SecureStore:", e);
    }
  },
  removeItem: async (name: string) => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch (e) {
      console.error("Error removing item from SecureStore:", e);
    }
  },
}));

interface AuthStore {
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
  hydrated: boolean;
  setHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      setIsAuthenticated: (value) => set({ isAuthenticated: value }),
      hydrated: false,
      setHydrated: (state) => set({ hydrated: state }),
    }),
    {
      name: "auth-storage",
      storage: secureStorage,
      // This is important - we'll handle hydration manually
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);

// Add this function to manually trigger hydration in your app's entry point
export const hydrateAuthStore = async () => {
  const storedState = await SecureStore.getItemAsync("auth-storage");
  if (storedState) {
    try {
      const parsedState = JSON.parse(storedState);
      useAuthStore.setState({
        isAuthenticated: parsedState.state.isAuthenticated,
        hydrated: true,
      });
    } catch (e) {
      console.error("Failed to parse stored state:", e);
    }
  } else {
    useAuthStore.setState({ hydrated: true });
  }
};
