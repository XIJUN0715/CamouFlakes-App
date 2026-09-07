// App.js
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './src/navigation/AppNavigator';
import { seedDemoNotifications } from './src/utils/notifications';
import { LogBox } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

// Ignore expo-av deprecation warning (already using legacy import)
LogBox.ignoreLogs([
  'Expo AV has been deprecated',
  'expo-av: Expo AV has been deprecated',
]);
LogBox.ignoreAllLogs();

const PERSISTENCE_KEY = 'NAVIGATION_STATE_V1';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [initialState, setInitialState] = useState();

  // Load custom fonts
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    const restoreState = async () => {
      try {
        const savedStateString = await AsyncStorage.getItem(PERSISTENCE_KEY);
        const state = savedStateString ? JSON.parse(savedStateString) : undefined;
        if (state) setInitialState(state);
      } catch (e) {
        // ignore
      } finally {
        setIsReady(true);
      }
    };
    restoreState();

    // Seed demo notifications on first launch
    seedDemoNotifications();
  }, []);

  // Wait for BOTH fonts to load and navigation state to be restored
  if (!fontsLoaded || !isReady) {
    // You can return a loading/splash screen here if you have one.
    return null;
  }

  return (
    <NavigationContainer
      initialState={initialState}
      onStateChange={(state) =>
        AsyncStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state))
      }
    >
      <AppNavigator />
    </NavigationContainer>
  );
}