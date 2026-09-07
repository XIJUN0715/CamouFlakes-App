// src/utils/historyStorage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = '@camouflakes_history';

export const saveHistoryItem = async (item) => {
  try {
    const existing = await loadHistory();
    const newItem = {
      id: Date.now().toString(),
      ...item,
      date: new Date().toISOString().split('T')[0],
    };
    const updated = [newItem, ...existing];
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Failed to save history:', error);
    throw error;
  }
};

export const loadHistory = async () => {
  try {
    const data = await AsyncStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load history:', error);
    return [];
  }
};

// Alias for loadHistory – used by HomeScreen and other components
export const getHistoryItems = loadHistory;

export const clearHistory = async () => {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error('Failed to clear history:', error);
  }
};

// Alias for clearHistory – used by SettingsPreferencesScreen
export const clearAllHistory = clearHistory;

export const deleteHistoryItem = async (id) => {
  try {
    const items = await loadHistory();
    const filtered = items.filter(item => item.id !== id);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
    return filtered;
  } catch (error) {
    console.error('Failed to delete history item:', error);
    throw error;
  }
};

export const getHistoryItemById = async (id) => {
  try {
    const items = await loadHistory();
    return items.find(item => item.id === id) || null;
  } catch (error) {
    console.error('Failed to get history item:', error);
    return null;
  }
};