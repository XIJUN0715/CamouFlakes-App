// src/screens/SettingsScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { globalStyles, colors } from '../styles/globalStyles';
import Header from '../components/Header';
import BottomNavBar from '../components/BottomNavBar';

export default function SettingsScreen({ navigation }) {
  const settingsOptions = [
    {
      id: 'settings',
      icon: 'sliders',
      title: 'Settings',
      subtitle: 'Preferences and configurations',
      onPress: () => navigation.navigate('SettingsPreferences'),
    },
    {
      id: 'report',
      icon: 'flag',
      title: 'Report an Issue',
      subtitle: 'Submit feedback or bug reports',
      onPress: () => navigation.navigate('ReportIssue'),
    },
    {
      id: 'about',
      icon: 'info',
      title: 'About Us',
      subtitle: 'App information and legal',
      onPress: () => navigation.navigate('AboutUs'),
    },
  ];

  return (
    <View style={globalStyles.container}>
      <Header navigation={navigation} />

      <ScrollView style={globalStyles.contentContainer} showsVerticalScrollIndicator={false}>
        <Text style={globalStyles.header}>Settings & Support</Text>
        <Text style={globalStyles.subtitle}>Preferences and configurations</Text>

        {settingsOptions.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[globalStyles.card, { marginHorizontal: 0 }]}
            onPress={item.onPress}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name={item.icon} size={24} color={colors.primary} style={{ marginRight: 12 }} />
              <View>
                <Text style={{ fontWeight: '600', fontSize: 16 }}>{item.title}</Text>
                <Text style={{ color: colors.gray, fontSize: 12 }}>{item.subtitle}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <BottomNavBar navigation={navigation} active="Settings" />
    </View>
  );
}