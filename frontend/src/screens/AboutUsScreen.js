// src/screens/AboutUsScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking, Alert, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { globalStyles, colors } from '../styles/globalStyles';
import Header from '../components/Header';
import BottomNavBar from '../components/BottomNavBar';
import * as MailComposer from 'expo-mail-composer';

export default function AboutUsScreen({ navigation }) {
  const version = '1.0.0';
  const buildNumber = '20260811';

  const handleEmailSupport = async () => {
    try {
      const isAvailable = await MailComposer.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('No Email App', 'Please install an email app to contact support.');
        return;
      }
      await MailComposer.composeAsync({
        recipients: ['camouflakes@gmail.com'],
        subject: 'CamouFlakes Support Request',
        body: 'Describe your question or issue here:\n\n---\nApp Version: ' + version + ' (' + buildNumber + ')',
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to open email app.');
    }
  };

  return (
    <View style={globalStyles.container}>
      {/* Added title and showBack */}
      <Header navigation={navigation} title="About Us" showBack />

      <ScrollView style={globalStyles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Brand Header */}
        <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 24 }}>
          <Image
            source={require('../../assets/icon.png')}
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              marginBottom: 12,
              backgroundColor: colors.primary,
            }}
            resizeMode="contain"
          />
          <Text style={[globalStyles.headerOrange, { fontSize: 28 }]}>CamouFlakes</Text>
          <Text style={[globalStyles.subtitle, { textAlign: 'center', marginTop: 2 }]}>
            Unmask the Fake. Protect the Real.
          </Text>
        </View>

        {/* About Section */}
        <View style={globalStyles.card}>
          <Text style={globalStyles.label}>About CamouFlakes</Text>
          <Text style={{ fontSize: 14, color: colors.gray, lineHeight: 22, marginTop: 4 }}>
            CamouFlakes is an AI-powered deepfake detection app designed to help you verify
            the authenticity of videos in real-time. Using advanced machine learning models,
            we analyse video content to identify AI-generated manipulations and protect
            you from misinformation.
          </Text>
          <Text style={{ fontSize: 14, color: colors.gray, lineHeight: 22, marginTop: 8 }}>
            Our mission is to make digital truth accessible to everyone, one video at a time.
          </Text>
        </View>

        {/* Disclaimer */}
        <View style={globalStyles.card}>
          <Text style={globalStyles.label}>Disclaimer</Text>
          <Text style={{ fontSize: 14, color: colors.black, lineHeight: 22, marginTop: 4 }}>
            CamouFlakes uses AI to assist in detecting deepfakes for reference only.
            It is not a professional verification tool and may make mistakes; hence,
            appropriate handling may still be required.
          </Text>
        </View>

        {/* App Details */}
        <View style={globalStyles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
            <Text style={{ color: colors.gray }}>App Version</Text>
            <Text style={{ fontWeight: '500' }}>{version} ({buildNumber})</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
            <Text style={{ color: colors.gray }}>SDK Version</Text>
            <Text style={{ fontWeight: '500' }}>Expo 54</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
            <Text style={{ color: colors.gray }}>Platform</Text>
            <Text style={{ fontWeight: '500' }}>Android</Text>
          </View>
        </View>

        {/* Developer Info */}
        <View style={globalStyles.card}>
          <Text style={globalStyles.label}>Developed By</Text>
          <Text style={{ fontSize: 16, color: colors.black, fontWeight: '600' }}>
            CamouFlakes Research Team
          </Text>
          <Text style={{ fontSize: 13, color: colors.gray, marginTop: 2 }}>
            Built for digital truth
          </Text>
        </View>

        {/* Footer */}
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Text style={{ fontSize: 12, color: colors.gray, textAlign: 'center' }}>
            (C) 2026 CamouFlakes. All rights reserved.
          </Text>
          <Text style={{ fontSize: 12, color: colors.gray, marginTop: 4 }}>
            Made for digital truth
          </Text>
        </View>
      </ScrollView>

      <BottomNavBar navigation={navigation} active="Settings" />
    </View>
  );
}