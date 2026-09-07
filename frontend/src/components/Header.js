// src/components/Header.js
import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { globalStyles, colors } from '../styles/globalStyles';
import NotificationBell from './NotificationBell';

export default function Header({ navigation, title, showBack }) {
  return (
    <View>
      {/* Brand row — always has a bottom border (line between brand and page title) */}
      <View style={globalStyles.headerContainer}>
        <View style={globalStyles.headerLeft}>
          {/* Custom header icon – slightly larger */}
          <Image
            source={require('../../assets/header_icon.png')}
            style={{
              width: 28,
              height: 28,
              marginRight: 10,
              resizeMode: 'contain',
            }}
          />
          <View>
            <View style={{ flexDirection: 'row' }}>
              <Text style={globalStyles.headerLogo}>Camou</Text>
              <Text style={globalStyles.headerTitle}>Flakes</Text>
            </View>
            <Text style={globalStyles.headerSubtitle}>Unmask the Fake</Text>
          </View>
        </View>
        <NotificationBell navigation={navigation} />
      </View>

      {/* Second row — only rendered if a title is passed */}
      {title ? (
        <View style={[globalStyles.headerSecondRow, { borderBottomWidth: 0 }]}>
          {showBack && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={globalStyles.headerBackBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="chevron-left" size={22} color={colors.black} />
            </TouchableOpacity>
          )}
          <Text style={globalStyles.headerSecondTitle}>{title}</Text>
        </View>
      ) : null}
    </View>
  );
}