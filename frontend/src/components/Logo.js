// src/components/Logo.js
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '../styles/globalStyles';

export default function Logo({ size = 60, showText = true, style, imageSource }) {
  // Use the provided imageSource prop, or fallback to the default logo
  const source = imageSource || require('../../assets/header_icon.png');

  return (
    <View style={[styles.container, style]}>
      <Image
        source={source}
        style={{
          width: size,
          height: size,
          resizeMode: 'contain',
        }}
      />
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.brandText, { fontSize: size * 0.5 }]}>
            Camou
            <Text style={styles.brandHighlight}>Flakes</Text>
          </Text>
          <Text style={[styles.tagline, { fontSize: size * 0.15 }]}>
            Unmask the Fake. Protect the Real.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  brandText: {
    fontWeight: '700',
    color: colors.black,
  },
  brandHighlight: {
    color: colors.primary,
  },
  tagline: {
    color: colors.gray,
    fontWeight: '500',
  },
});