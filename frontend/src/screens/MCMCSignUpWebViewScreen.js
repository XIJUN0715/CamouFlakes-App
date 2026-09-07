// src/screens/MCMCSignUpWebViewScreen.js
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { globalStyles, colors } from '../styles/globalStyles';

export default function MCMCSignUpWebViewScreen({ route, navigation }) {
  const { details, onRegister } = route.params || {};
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);

  const handleDone = () => {
    if (onRegister && typeof onRegister === 'function') {
      onRegister();
    }
    navigation.goBack();
  };

  const handleOpenBrowser = () => {
    Linking.openURL('https://aduan.mcmc.gov.my/#/public/register');
  };

  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 40 : 44;

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={{ flex: 1, paddingTop: statusBarHeight + 10 }}>
        <WebView
          ref={webViewRef}
          source={{ uri: 'https://aduan.mcmc.gov.my/#/public/register' }}
          onLoadEnd={() => setLoading(false)}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={[globalStyles.centered, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[globalStyles.subtitle, { marginTop: 16 }]}>Loading Registration Page...</Text>
            </View>
          )}
        />

        {/* Bottom Toolbar */}
        <View style={{
          flexDirection: 'row',
          paddingVertical: 14,
          paddingHorizontal: 8,
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderColor: colors.lightGray,
          paddingBottom: 20,
        }}>
          <TouchableOpacity
            style={{ flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={18} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={{ color: colors.primary, fontWeight: '500' }}>Back</Text>
          </TouchableOpacity>

          <View style={{ width: 1, backgroundColor: colors.lightGray, marginHorizontal: 4 }} />

          <TouchableOpacity
            style={{ flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
            onPress={handleOpenBrowser}
          >
            <Feather name="globe" size={18} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={{ color: colors.primary }}>Browser</Text>
          </TouchableOpacity>

          <View style={{ width: 1, backgroundColor: colors.lightGray, marginHorizontal: 4 }} />

          <TouchableOpacity
            style={{ flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
            onPress={handleDone}
          >
            <Feather name="check-circle" size={18} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}