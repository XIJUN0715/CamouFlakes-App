// src/components/BottomNavBar.js
import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { globalStyles, colors } from '../styles/globalStyles';

const TABS = [
  { key: 'Home', label: 'Home', icon: 'home' },
  { key: 'History', label: 'History', icon: 'clock' }, // Changed from 'list' to 'clock'
  { key: 'Reports', label: 'Reports', icon: 'bar-chart-2' },
  { key: 'Settings', label: 'Settings', icon: 'settings' },
];

export default function BottomNavBar({ navigation, active }) {
  return (
    <View style={globalStyles.bottomNav}>
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={globalStyles.bottomNavItem}
            onPress={() => {
              // Always navigate, even when this tab is already "active" -
              // Settings (and any tab with sub-pages) needs tapping the
              // active tab to bring you back to its hub screen from a
              // nested page like Preferences or Report an Issue, where
              // `active` is set to the same key but the route itself is
              // different. Navigating to a screen you're already
              // literally on is a safe no-op, so this doesn't affect
              // Home/History/Reports.
              navigation.navigate(tab.key);
            }}
          >
            <Feather
              name={tab.icon}
              size={22}
              color={isActive ? colors.primary : colors.gray}
              style={{ marginBottom: 2 }}
            />
            <Text style={isActive ? globalStyles.bottomNavTextActive : globalStyles.bottomNavText}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}