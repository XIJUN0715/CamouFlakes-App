// src/screens/HomeScreen.js
import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity, Text, ScrollView, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { globalStyles, colors } from '../styles/globalStyles';
import Header from '../components/Header';
import BottomNavBar from '../components/BottomNavBar';
import TypingGreeting from '../components/TypingGreeting';
import { getHistoryItems } from '../utils/historyStorage';

const RECENT_TYPES = [
  { source: 'gallery', label: 'Gallery Upload Detection', icon: 'upload-cloud', navigateTo: 'Upload' },
  { source: 'camera', label: 'Recorded Video Detection', icon: 'video', navigateTo: 'Camera' },
  { source: 'screen_recording', label: 'Live Overlay Video Detection', icon: 'tv', navigateTo: 'LiveOverlay' },
];

export default function HomeScreen({ navigation }) {
  const [latestBySource, setLatestBySource] = useState({});

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getHistoryItems().then((items) => {
        if (!active) return;
        const bySource = {};
        RECENT_TYPES.forEach(({ source }) => {
          bySource[source] = items.find((i) => i.source === source) || null;
        });
        setLatestBySource(bySource);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const openRecent = (source, navigateTo) => {
    const item = latestBySource[source];
    if (!item) {
      Alert.alert(
        'No Verification History',
        'No video has been verified using this method yet. Would you like to try it now?',
        [
          {
            text: 'Understood, let us try the feature',
            onPress: () => navigation.navigate(navigateTo),
          },
          {
            text: 'Not Now',
            style: 'cancel',
          },
        ]
      );
      return;
    }
    navigation.navigate('AnalysisDetail', { id: item.id, item });
  };

  return (
    <View style={globalStyles.container}>
      <Header navigation={navigation} />

      <ScrollView
        style={globalStyles.contentContainer}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        <TypingGreeting />

        <TouchableOpacity
          style={[globalStyles.primaryBtn, globalStyles.actionBtn]}
          onPress={() => navigation.navigate('Upload')}
        >
          <Feather
            name="upload-cloud"
            size={22}
            color={colors.white}
            style={globalStyles.actionBtnIcon}
          />
          <View>
            <Text style={globalStyles.primaryBtnText}>Upload Video</Text>
            <Text style={globalStyles.actionBtnSubtext}>Select from gallery</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[globalStyles.secondaryBtn, globalStyles.actionBtn]}
          onPress={() => navigation.navigate('Camera')}
        >
          <Feather
            name="video"
            size={22}
            color={colors.white}
            style={globalStyles.actionBtnIcon}
          />
          <View>
            <Text style={globalStyles.secondaryBtnText}>Record Video</Text>
            <Text style={globalStyles.actionBtnSubtext}>Front or rear camera</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[globalStyles.outlineBtn, globalStyles.actionBtn]}
          onPress={() => navigation.navigate('LiveOverlay')}
        >
          <Feather
            name="tv"
            size={22}
            color={colors.primary}
            style={globalStyles.actionBtnIcon}
          />
          <View>
            <Text style={globalStyles.outlineBtnText}>Live Overlay Detection</Text>
            <Text style={[globalStyles.actionBtnSubtext, { color: colors.primary }]}>
              Screen recording mode
            </Text>
          </View>
        </TouchableOpacity>

        {/* Formatted AI Disclaimer with two separate sentences */}
        <View style={{
          marginTop: 14,
          marginBottom: 4,
          paddingHorizontal: 4,
        }}>
          <Text style={{
            fontSize: 12,
            color: colors.gray,
            textAlign: 'center',
            lineHeight: 18,
          }}>
            Disclaimer: CamouFlakes uses AI to assist in detecting deepfakes for reference only.
          </Text>
          <Text style={{
            fontSize: 12,
            color: colors.gray,
            textAlign: 'center',
            lineHeight: 18,
            marginTop: 2,
          }}>
            It is not a professional verification tool and may make mistakes; hence, appropriate handling may still be required.
          </Text>
        </View>

        {/* Recent Verifications Section */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 20,
          marginBottom: 12,
        }}>
          <Text style={[globalStyles.label, { fontSize: 18, marginBottom: 0 }]}>Recent Verifications</Text>
          <TouchableOpacity onPress={() => navigation.navigate('History')}>
            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>See All</Text>
          </TouchableOpacity>
        </View>

        {RECENT_TYPES.map(({ source, label, icon, navigateTo }) => {
          const item = latestBySource[source];
          return (
            <TouchableOpacity
              key={source}
              style={[globalStyles.card, { flexDirection: 'row', alignItems: 'center', marginVertical: 6 }]}
              onPress={() => openRecent(source, navigateTo)}
            >
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.lightGray,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                <Feather name={icon} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.black }}>{label}</Text>
                <Text style={{ fontSize: 12, color: colors.gray, marginTop: 2 }}>
                  {item ? `Last: ${item.date || 'recently'}` : 'Not used yet'}
                </Text>
              </View>
              {item && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                  backgroundColor: item.isFake ? colors.danger : colors.success,
                  marginRight: 6,
                }}>
                  <Feather
                    name={item.isFake ? 'alert-triangle' : 'check-circle'}
                    size={12}
                    color={colors.white}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={{ color: colors.white, fontSize: 11, fontWeight: '600' }}>
                    {item.isFake ? 'Deepfake' : 'Real'}
                  </Text>
                </View>
              )}
              <Feather name="chevron-right" size={18} color={colors.gray} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <BottomNavBar navigation={navigation} active="Home" />
    </View>
  );
}