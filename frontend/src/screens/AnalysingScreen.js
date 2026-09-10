// src/screens/AnalysingScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Alert, Animated, Easing, AppState } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { globalStyles, colors } from '../styles/globalStyles';
import { analyzeVideo, pollEvidence } from '../utils/tflite';
import { saveVideoAndThumbnailToGallery } from '../utils/mediaSave';
import { generateCamouFlakesRef } from '../utils/reference';

// Key used to bridge the gallery-saved thumbnail filename to the WebView banner.
export const LAST_THUMBNAIL_NAME_KEY = '@camouflakes_last_thumbnail_name';

export default function AnalysingScreen({ route, navigation }) {
  const { videoUri, source } = route.params || {};
  const rawStartTime = route.params?.startTime;
  const startTime = typeof rawStartTime === 'number' && !Number.isNaN(rawStartTime) ? rawStartTime : 0;
  const rawDuration = route.params?.duration;
  const originalDuration = typeof rawDuration === 'number' && !Number.isNaN(rawDuration) ? rawDuration : undefined;

  const [progress, setProgress] = useState(0);
  const [saveStatus, setSaveStatus] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  // ─── NEW: holds the real filename returned by mediaSave.js so we can also
  //     pass it as a route param to ResultScreen (in addition to the
  //     AsyncStorage write). Belt-and-braces — the WebView reads either.
  const lastThumbnailFileNameRef = useRef(null);

  const spinValue = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(1)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  useEffect(() => {
    if (isComplete) {
      Animated.timing(ringOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        Animated.spring(checkScale, {
          toValue: 1,
          friction: 5,
          tension: 120,
          useNativeDriver: true,
        }).start();
      });
      playSuccessSound();
    }
  }, [isComplete]);

  const playSuccessSound = async () => {
    try {
      const appState = AppState.currentState;
      if (appState !== 'active') {
        console.log('[Analysing] App in background, skipping sound');
        return;
      }
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/success.mp3')
      );
      await sound.playAsync();
    } catch (error) {
      console.warn('[Analysing] Could not play sound:', error);
    }
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const generateLocalThumbnail = async (uri, timeInSeconds) => {
    try {
      const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, {
        time: timeInSeconds * 1000,
        quality: 0.8,
      });
      const fileName = `thumbnail_${Date.now()}.jpg`;
      const destPath = FileSystem.cacheDirectory + fileName;
      await FileSystem.copyAsync({ from: thumbUri, to: destPath });
      console.log('[Analysing] Local thumbnail generated:', destPath);
      return destPath;
    } catch (error) {
      console.warn('[Analysing] Failed to generate local thumbnail:', error);
      return null;
    }
  };

  // ─── Awaits save, stores the real thumbnail filename both in the ref
  //     (for the ResultScreen route param) and in AsyncStorage (fallback).
  const saveToGalleryInBackground = async (trimmedUri, thumbnailUri, isFakeResult) => {
    const fileTag = generateCamouFlakesRef();
    try {
      const result = await saveVideoAndThumbnailToGallery({
        videoUrl: trimmedUri,
        thumbnailUrl: thumbnailUri,
        reportRef: fileTag,
        isFake: isFakeResult,
      });
      console.log('[Analysing] Background gallery save completed:', result);

      if (result.thumbnailFileName) {
        // ─── NEW: keep it in the ref so we can pass it forward.
        lastThumbnailFileNameRef.current = result.thumbnailFileName;

        try {
          await AsyncStorage.setItem(LAST_THUMBNAIL_NAME_KEY, result.thumbnailFileName);
          console.log(
            '[Analysing] Stored real thumbnail filename:',
            result.thumbnailFileName
          );
        } catch (e) {
          console.warn('[Analysing] Could not persist thumbnail filename:', e);
        }
      }
    } catch (error) {
      console.warn('[Analysing] Background gallery save failed:', error);
    }
  };

  useEffect(() => {
    let mounted = true;
    let pollInterval = null;

    const run = async () => {
      try {
        const interval = setInterval(() => {
          if (mounted) setProgress(p => Math.min(p + Math.random() * 15, 95));
        }, 300);

        const result = await analyzeVideo(videoUri, startTime);
        console.log('[Analysing] Server response:', result);
        clearInterval(interval);
        if (!mounted) return;

        const displayTrimmedUri = null;
        let finalThumbnailUri = null;
        finalThumbnailUri = await generateLocalThumbnail(videoUri, startTime);

        setProgress(100);
        setIsComplete(true);

        const jobId = result.jobId;
        if (jobId) {
          console.log(`[Analysing] Job ID: ${jobId}, starting evidence polling...`);
          let pollCount = 0;
          const maxPolls = 20;

          pollInterval = setInterval(async () => {
            if (!mounted) {
              clearInterval(pollInterval);
              return;
            }

            pollCount++;
            try {
              const evidence = await pollEvidence(jobId);

              if (evidence.ready && evidence.trimmedUri) {
                console.log('[Analysing] Evidence ready:', evidence);
                clearInterval(pollInterval);
                pollInterval = null;

                // Fire-and-forget, but now it also persists the real
                // thumbnail filename for the WebView banner.
                saveToGalleryInBackground(
                  evidence.trimmedUri,
                  evidence.thumbnailUri || finalThumbnailUri,
                  result.isFake
                );
              }
            } catch (error) {
              console.warn('[Analysing] Poll error:', error);
            }

            if (pollCount >= maxPolls) {
              console.log('[Analysing] Evidence polling timeout');
              clearInterval(pollInterval);
              pollInterval = null;
            }
          }, 500);
        }

        setTimeout(() => {
          if (mounted) {
            navigation.replace('Result', {
              videoUri,
              source,
              isFake: result.isFake,
              confidence: result.confidence,
              probability: result.probability,
              trimmedUri: displayTrimmedUri,
              thumbnailUri: finalThumbnailUri,
              // ─── NEW: pass the real filename forward as a route param.
              thumbnailFileName: lastThumbnailFileNameRef.current || null,
              duration: 5,
              originalDuration: originalDuration,
              reasoning: result.reasoning || [],
              segments: result.segments || [],
              processingTime: result.processingTime || null,
              jobId: result.jobId,
            });
          }
        }, 1200);

        return () => {
          if (pollInterval) clearInterval(pollInterval);
        };

      } catch (error) {
        console.error('[Analysing] Analysis error:', error);
        if (pollInterval) clearInterval(pollInterval);
        Alert.alert('Analysis Failed', 'Could not analyse the video. Please try again.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    };

    run();

    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [videoUri, source, startTime, originalDuration]);

  return (
    <View style={globalStyles.centered}>
      <Text style={[globalStyles.headerOrange, { fontSize: 32 }]}>CamouFlakes</Text>
      <Text style={[globalStyles.subtitle, { marginBottom: 32 }]}>Unmask the Fake</Text>

      <View style={{
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: colors.lightGray,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Animated.View
          style={{
            position: 'absolute',
            width: 120,
            height: 120,
            borderRadius: 60,
            borderWidth: 6,
            borderColor: colors.primary,
            borderTopColor: 'transparent',
            transform: [{ rotate: spin }],
            opacity: ringOpacity,
          }}
        />
        <Animated.View style={{ transform: [{ scale: checkScale }] }}>
          <Feather name="check" size={56} color={colors.success} />
        </Animated.View>
      </View>

      <Text style={{ fontSize: 22, fontWeight: '700', marginTop: 24 }}>
        {isComplete ? 'Analysis Complete' : 'Analysing Video'}
      </Text>
      <Text style={{ fontSize: 14, color: colors.gray, marginTop: 8 }}>
        {isComplete ? 'Preparing results...' : (saveStatus || 'AI is detecting deepfake artifacts')}
      </Text>

      <View style={{
        width: '70%',
        height: 6,
        backgroundColor: colors.lightGray,
        borderRadius: 3,
        marginTop: 24,
        overflow: 'hidden',
      }}>
        <View style={{
          width: `${Math.min(progress, 100)}%`,
          height: '100%',
          backgroundColor: colors.primary,
          borderRadius: 3,
        }} />
      </View>
      <Text style={{ marginTop: 8, color: colors.gray, fontSize: 12 }}>
        {Math.round(Math.min(progress, 100))}% complete
      </Text>
    </View>
  );
}