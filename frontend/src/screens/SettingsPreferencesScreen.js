// src/screens/SettingsPreferencesScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Switch, Alert,
  ActivityIndicator, Platform, Linking, AppState,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { globalStyles, colors } from '../styles/globalStyles';
import Header from '../components/Header';
import BottomNavBar from '../components/BottomNavBar';
import { loadHistory, clearAllHistory } from '../utils/historyStorage';
import { getAllReports, clearAllReports } from '../utils/database';
import { BACKEND_URL } from '../config';

const HISTORY_KEY = '@camouflakes_history';
const REPORTS_KEY = '@camouflakes_reports';

export default function SettingsPreferencesScreen({ navigation }) {
  const [notifications, setNotifications] = useState(false);
  const [databaseSize, setDatabaseSize] = useState('0 KB');
  const [mediaCacheSize, setMediaCacheSize] = useState('0 KB');
  const [loading, setLoading] = useState(false);
  const [openingSettings, setOpeningSettings] = useState(false);

  const awaitingSettingsReturn = useRef(false);
  const appState = useRef(AppState.currentState);

  // ------------------- Real-time data loading -------------------
  const loadData = useCallback(async () => {
    try {
      const [historyStr, reportsStr] = await Promise.all([
        AsyncStorage.getItem(HISTORY_KEY),
        AsyncStorage.getItem(REPORTS_KEY),
      ]);
      const historySize = historyStr ? new Blob([historyStr]).size : 0;
      const reportsSize = reportsStr ? new Blob([reportsStr]).size : 0;
      const totalBytes = historySize + reportsSize;
      const totalKB = totalBytes / 1024;
      setDatabaseSize(totalKB < 1 ? '0 KB' : `${Math.round(totalKB)} KB`);

      const cacheDir = FileSystem.cacheDirectory;
      const cacheInfo = await FileSystem.getInfoAsync(cacheDir);
      if (cacheInfo.exists) {
        const sizeKB = await getDirectorySize(cacheDir);
        setMediaCacheSize(sizeKB < 1 ? '0 KB' : `${Math.round(sizeKB)} KB`);
      } else {
        setMediaCacheSize('0 KB');
      }
    } catch (error) {
      console.warn('loadData error:', error);
    }
  }, []);

  const getDirectorySize = async (dirPath) => {
    try {
      const files = await FileSystem.readDirectoryAsync(dirPath);
      let total = 0;
      for (const file of files) {
        const filePath = dirPath + file;
        const info = await FileSystem.getInfoAsync(filePath);
        if (info.exists) {
          if (info.isDirectory) {
            total += await getDirectorySize(filePath + '/');
          } else {
            total += info.size / 1024;
          }
        }
      }
      return total;
    } catch (error) {
      console.warn('getDirectorySize error:', error);
      return 0;
    }
  };

  const deleteDirectoryContents = async (dirPath) => {
    try {
      const files = await FileSystem.readDirectoryAsync(dirPath);
      for (const file of files) {
        const filePath = dirPath + file;
        const info = await FileSystem.getInfoAsync(filePath);
        if (info.exists) {
          if (info.isDirectory) {
            await deleteDirectoryContents(filePath + '/');
            await FileSystem.deleteAsync(filePath, { idempotent: true });
          } else {
            await FileSystem.deleteAsync(filePath, { idempotent: true });
          }
        }
      }
    } catch (error) {
      console.warn('deleteDirectoryContents error:', error);
    }
  };

  // ------------------- Server cleanup (only used by Clear History & Reports) -------------------
  const cleanupServerMedia = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/cleanup/trimmed`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        console.warn('Server cleanup failed:', response.status);
      }
    } catch (error) {
      console.warn('Could not reach server for cleanup:', error);
    }
  };

  // ------------------- Notification permission -------------------
  const checkNotificationPermission = async () => {
    try {
      const perm = await Notifications.getPermissionsAsync();
      setNotifications(perm.status === 'granted');
    } catch {
      setNotifications(false);
    }
  };

  const openNotificationSettings = async () => {
    awaitingSettingsReturn.current = true;
    if (Platform.OS !== 'android') {
      try { await Linking.openSettings(); } catch {}
      return;
    }
    try {
      setOpeningSettings(true);
      const pkg = Constants.expoConfig?.android?.package || 'com.camouflakes.app';
      if (Platform.Version >= 26) {
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.APP_NOTIFICATION_SETTINGS,
          { extra: { 'android.provider.extra.APP_PACKAGE': pkg } }
        );
      } else {
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS,
          { data: `package:${pkg}` }
        );
      }
    } catch (e) {
      try {
        const pkg = Constants.expoConfig?.android?.package || 'com.camouflakes.app';
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS,
          { data: `package:${pkg}` }
        );
      } catch {
        try { await Linking.openSettings(); } catch {
          Alert.alert('Unable to Open Settings', 'Please open Android Settings manually → Apps → CamouFlakes → Notifications.');
        }
      }
    } finally { setOpeningSettings(false); }
  };

  const toggleNotifications = async () => {
    if (notifications) {
      Alert.alert(
        'Turn Off Notifications',
        'Android controls this permission. Open notification settings?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openNotificationSettings }
        ]
      );
      return;
    }
    try {
      const perm = await Notifications.requestPermissionsAsync();
      if (perm.status === 'granted') {
        setNotifications(true);
        Alert.alert('Notifications Enabled', 'You will now receive detection alerts.');
      } else {
        setNotifications(false);
        Alert.alert(
          'Notifications Disabled',
          'Permission not granted. Enable from settings?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: openNotificationSettings }
          ]
        );
      }
    } catch {
      Alert.alert(
        'Notification Error',
        'Unable to request permission. Open settings?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openNotificationSettings }
        ]
      );
    }
  };

  // ------------------- Clear actions -------------------
  const handleClearHistoryAndReports = () => {
    Alert.alert(
      'Clear History and Reports',
      'This will permanently delete all history, reports, and all trimmed videos from the server.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await clearAllHistory();
              await clearAllReports();
              await cleanupServerMedia();
              await loadData();
              Alert.alert('Cleared', 'All history, reports, and trimmed videos deleted.');
            } catch (e) {
              Alert.alert('Error', 'Failed to clear data.');
            } finally { setLoading(false); }
          }
        }
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Media Cache',
      'Delete all temporary media files? Your history and reports remain.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const cacheDir = FileSystem.cacheDirectory;
              await deleteDirectoryContents(cacheDir);
              await loadData();
              Alert.alert('Cache Cleared', 'All media cache removed.');
            } catch (e) {
              Alert.alert('Error', 'Failed to clear cache.');
            } finally { setLoading(false); }
          }
        }
      ]
    );
  };

  // ------------------- Lifecycle -------------------
  useEffect(() => {
    loadData();
    checkNotificationPermission();

    const subscription = AppState.addEventListener('change', (nextState) => {
      const cameToForeground =
        appState.current.match(/inactive|background/) && nextState === 'active';
      if (cameToForeground) {
        checkNotificationPermission();
        awaitingSettingsReturn.current = false;
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      checkNotificationPermission();
    }, [loadData])
  );

  // ------------------- Render -------------------
  return (
    <View style={globalStyles.container}>
      <Header navigation={navigation} title="Preferences" showBack />

      <ScrollView style={globalStyles.contentContainer} showsVerticalScrollIndicator={false}>
        <Text style={globalStyles.subtitle}>Customize your app experience</Text>

        <Text style={[globalStyles.label, { marginTop: 16 }]}>Preferences</Text>
        <View style={globalStyles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="bell" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ fontWeight: '600' }}>Notifications</Text>
              </View>
              <Text style={{ color: colors.gray, fontSize: 12, marginTop: 2 }}>Detection alerts when app is closed</Text>
            </View>
            {openingSettings ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Switch
                trackColor={{ false: colors.lightGray, true: colors.primary }}
                thumbColor="#fff"
                value={notifications}
                onValueChange={toggleNotifications}
              />
            )}
          </View>
        </View>

        <Text style={[globalStyles.label, { marginTop: 16 }]}>Storage</Text>
        <View style={globalStyles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
            <Text style={{ color: colors.gray }}>Database Size:</Text>
            <Text style={{ fontWeight: '500' }}>{databaseSize}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
            <Text style={{ color: colors.gray }}>Media Cache Size:</Text>
            <Text style={{ fontWeight: '500' }}>{mediaCacheSize}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[globalStyles.dangerBtn, { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
          onPress={handleClearHistoryAndReports}
          disabled={loading}
        >
          <Feather name="trash-2" size={18} color={colors.white} style={{ marginRight: 8 }} />
          <Text style={globalStyles.dangerBtnText}>Clear History and Reports</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[globalStyles.dangerBtn, {
            marginTop: 8,
            backgroundColor: colors.warning || '#F5A623',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center'
          }]}
          onPress={handleClearCache}
          disabled={loading}
        >
          <Feather name="archive" size={18} color={colors.white} style={{ marginRight: 8 }} />
          <Text style={globalStyles.dangerBtnText}>Clear Media Cache</Text>
        </TouchableOpacity>
        <Text style={{
          color: colors.gray,
          fontSize: 11,
          marginTop: 4,
          textAlign: 'center',
          paddingHorizontal: 8
        }}>
          Clearing cache removes temporary files and helps the app run faster.
        </Text>

        {loading && <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 16 }} />}
      </ScrollView>

      <BottomNavBar navigation={navigation} active="Settings" />
    </View>
  );
}