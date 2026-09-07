// src/components/TypingGreeting.js
//
// Types the greeting out character by character, restarting every time the
// screen it's on regains focus. The blinking caret is its own fixed-size
// element controlled by opacity, not a character swapped in and out of the
// text string — swapping characters forces a layout recompute on every
// blink, which was pushing the buttons below up and down.
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { globalStyles, colors } from '../styles/globalStyles';

const DEFAULT_TEXT = 'Good day, how would you like to detect?';
const TYPE_SPEED_MS = 35;
const CURSOR_BLINK_MS = 500;

export default function TypingGreeting({ text = DEFAULT_TEXT, style }) {
  const [displayed, setDisplayed] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const blinkLoopRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      let index = 0;
      let cancelled = false;
      setDisplayed('');
      setIsTyping(true);
      cursorOpacity.setValue(1);
      if (blinkLoopRef.current) {
        blinkLoopRef.current.stop();
        blinkLoopRef.current = null;
      }

      const typeInterval = setInterval(() => {
        index += 1;
        if (cancelled) return;
        setDisplayed(text.slice(0, index));
        if (index >= text.length) {
          clearInterval(typeInterval);
          setIsTyping(false);
        }
      }, TYPE_SPEED_MS);

      return () => {
        cancelled = true;
        clearInterval(typeInterval);
        if (blinkLoopRef.current) {
          blinkLoopRef.current.stop();
          blinkLoopRef.current = null;
        }
      };
    }, [text])
  );

  // Blink starts only once typing finishes, so the caret reads as solid
  // while the words are still appearing.
  useEffect(() => {
    if (isTyping) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: CURSOR_BLINK_MS,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: CURSOR_BLINK_MS,
          useNativeDriver: true,
        }),
      ])
    );
    blinkLoopRef.current = loop;
    loop.start();
    return () => loop.stop();
  }, [isTyping, cursorOpacity]);

  return (
    <View style={styles.row}>
      <Text style={[globalStyles.greetingText, styles.textReset, style]}>
        {displayed}
      </Text>
      <Animated.View
        style={[styles.caret, { opacity: isTyping ? 1 : cursorOpacity }]}
      />
    </View>
  );
}

const styles = {
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 28,
    minHeight: 24,
  },
  textReset: {
    marginTop: 0,
    marginBottom: 0,
  },
  caret: {
    width: 2,
    height: 20,
    marginLeft: 3,
    backgroundColor: colors.black,
    borderRadius: 1,
  },
};