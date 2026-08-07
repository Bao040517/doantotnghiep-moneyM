import AsyncStorage from "@react-native-async-storage/async-storage";

const memoryStore: Record<string, string> = {};

export const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value !== null) return value;
      return memoryStore[key] || null;
    } catch (e) {
      console.warn(`[SafeStorage] getItem failed for "${key}", falling back to memory:`, e);
      return memoryStore[key] || null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    memoryStore[key] = value;
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn(`[SafeStorage] setItem failed for "${key}", saved to memory:`, e);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    delete memoryStore[key];
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn(`[SafeStorage] removeItem failed for "${key}":`, e);
    }
  },
};
