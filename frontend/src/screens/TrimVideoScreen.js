// src/screens/TrimVideoScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { globalStyles, colors } from '../styles/globalStyles';

const { width } = Dimensions.get('window');
const CLIP_LENGTH = 5;

export default function TrimVideoScreen({ route, navigation }) {
  const { videoUri, source = 'gallery' } = route.params || {};
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineWidth, setTimelineWidth] = useState(0);
  const videoRef = useRef(null);
  const isMounted = useRef(true);
  const isDragging = useRef(false);

  const maxStart = Math.max(0, duration - CLIP_LENGTH);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleLoad = (status) => {
    if (isMounted.current && status.isLoaded) {
      const d = status.durationMillis / 1000;
      setDuration(d);
      setCurrentPosition(0);
      setIsLoading(false);

      // If video is already around 5 seconds (tolerance 0.2s), skip trimming
      if (d <= CLIP_LENGTH + 0.2) {
        navigation.replace('Analysing', {
          videoUri,
          source: source || 'gallery',
          startTime: 0,
          duration: d,
        });
        return;
      }
    }
  };

  const handleError = () => {
    if (isMounted.current) {
      setIsLoading(false);
      Alert.alert(
        'Cannot Load Video',
        'Could not load this video. You can proceed without trimming.',
        [
          {
            text: 'Use Full Video',
            onPress: () =>
              navigation.replace('Analysing', {
                videoUri,
                source: source || 'gallery',
                startTime: 0,
              }),
          },
          { text: 'Cancel', onPress: () => navigation.goBack() },
        ]
      );
    }
  };

  const getBoxStyle = () => {
    if (duration <= 0 || maxStart <= 0 || timelineWidth === 0) {
      return { left: 0, width: 0 };
    }
    const ratio = CLIP_LENGTH / duration;
    const boxWidth = Math.min(Math.max(ratio * timelineWidth, 0), timelineWidth);
    const left = (startTime / maxStart) * (timelineWidth - boxWidth);
    const clampedLeft = Math.min(Math.max(left, 0), timelineWidth - boxWidth);
    return { left: clampedLeft, width: boxWidth };
  };

  const boxStyle = getBoxStyle();

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      isDragging.current = true;
    },
    onPanResponderMove: (evt, gestureState) => {
      if (!isDragging.current) return;
      const dx = gestureState.dx;
      const boxWidth = boxStyle.width;
      const availableRoom = timelineWidth - boxWidth;
      if (availableRoom <= 0 || maxStart <= 0) return;
      const newLeft = Math.min(Math.max(boxStyle.left + dx, 0), availableRoom);
      const newStartTime = (newLeft / availableRoom) * maxStart;
      if (Number.isNaN(newStartTime)) return;
      setStartTime(Math.min(Math.max(newStartTime, 0), maxStart));
      if (videoRef.current) {
        videoRef.current.setPositionAsync(newStartTime * 1000);
      }
    },
    onPanResponderRelease: () => {
      isDragging.current = false;
      if (videoRef.current) {
        videoRef.current.setPositionAsync(startTime * 1000);
      }
      if (isPlaying) {
        setIsPlaying(false);
        videoRef.current?.pauseAsync();
      }
    },
    onPanResponderTerminate: () => {
      isDragging.current = false;
    },
  });

  const togglePlay = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
      setIsPlaying(false);
      return;
    }
    const endTime = startTime + CLIP_LENGTH;
    if (currentPosition < startTime || currentPosition > endTime) {
      await videoRef.current.setPositionAsync(startTime * 1000);
      setCurrentPosition(startTime);
    } else {
      await videoRef.current.setPositionAsync(currentPosition * 1000);
    }
    await videoRef.current.playAsync();
    setIsPlaying(true);
  };

  const stopPlayback = async () => {
    if (videoRef.current && isPlaying) {
      await videoRef.current.pauseAsync();
      setIsPlaying(false);
    }
  };

  const handleSkip = async () => {
    await stopPlayback();
    Alert.alert(
      'Skip Trimming',
      'The first 5 seconds will be used. Trimming improves accuracy.',
      [
        { text: 'Go Back', style: 'cancel' },
        {
          text: 'Use First 5s',
          style: 'destructive',
          onPress: () =>
            navigation.replace('Analysing', {
              videoUri,
              source: source || 'gallery',
              startTime: 0,
              duration,
            }),
        },
      ]
    );
  };

  const handleConfirm = async () => {
    await stopPlayback();
    navigation.replace('Analysing', {
      videoUri,
      source: source || 'gallery',
      startTime: startTime,
      duration,
    });
  };

  const formatTime = (sec) => {
    if (typeof sec !== 'number' || isNaN(sec) || sec < 0) {
      return '0:00.00';
    }
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    const sInt = Math.floor(s);
    const sDecimal = Math.round((s - sInt) * 100);
    return `${m}:${sInt.toString().padStart(2, '0')}.${sDecimal
      .toString()
      .padStart(2, '0')}`;
  };

  const endTime = startTime + CLIP_LENGTH;
  const clampedPos = Math.min(Math.max(currentPosition, startTime), endTime);
  const playheadPercent =
    duration > 0 && CLIP_LENGTH > 0
      ? Math.min(
          Math.max(((clampedPos - startTime) / CLIP_LENGTH) * 100, 0),
          100
        )
      : 0;

  const leftShadeWidth = boxStyle.left;
  const rightShadeLeft = boxStyle.left + boxStyle.width;

  return (
    <View style={globalStyles.container}>
      <View style={globalStyles.contentContainer}>
        <Text style={globalStyles.header}>Trim and Preview Video</Text>
        <Text style={globalStyles.subtitle}>
          Drag the orange box to choose your 5-second clip
        </Text>

        <View style={styles.videoContainer}>
          <Video
            ref={videoRef}
            source={{ uri: videoUri }}
            rate={1.0}
            volume={0.0}
            isMuted={true}
            resizeMode="contain"
            shouldPlay={false}
            useNativeControls={false}
            style={styles.video}
            onLoad={handleLoad}
            onError={handleError}
            onPlaybackStatusUpdate={(status) => {
              if (!status.isLoaded) return;
              let pos = status.positionMillis / 1000;
              const end = startTime + CLIP_LENGTH;
              if (pos > end) {
                pos = end;
                videoRef.current?.pauseAsync();
                setIsPlaying(false);
              }
              if (pos < startTime) pos = startTime;
              setCurrentPosition(pos);
              if (status.didJustFinish) {
                setIsPlaying(false);
              }
            }}
          />
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading video...</Text>
            </View>
          )}
          {!isLoading && (
            <TouchableOpacity
              style={styles.playOverlay}
              onPress={togglePlay}
              activeOpacity={0.8}
            >
              <View style={styles.playButton}>
                <Feather
                  name={isPlaying ? 'pause' : 'play'}
                  size={28}
                  color={colors.white}
                  style={{ marginLeft: isPlaying ? 0 : 2 }}
                />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {!isLoading && duration > 0 && (
          <>
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>{formatTime(startTime)}</Text>
              <Text style={styles.clipLabel}>
                {formatTime(clampedPos)} / {formatTime(endTime)}
              </Text>
              <Text style={styles.timeLabel}>{formatTime(endTime)}</Text>
            </View>

            <View
              style={styles.sliderWrapper}
              onLayout={(e) => setTimelineWidth(e.nativeEvent.layout.width)}
            >
              {maxStart > 0 && timelineWidth > 0 && (
                <View
                  style={[styles.leftShade, { width: leftShadeWidth }]}
                  pointerEvents="none"
                />
              )}
              {maxStart > 0 && timelineWidth > 0 && (
                <View
                  style={[styles.rightShade, { left: rightShadeLeft, right: 0 }]}
                  pointerEvents="none"
                />
              )}
              {maxStart > 0 && timelineWidth > 0 && (
                <View
                  style={[
                    styles.selectionBox,
                    { left: boxStyle.left, width: boxStyle.width },
                  ]}
                  {...panResponder.panHandlers}
                >
                  <View style={styles.leftHandle} />
                  <View style={styles.rightHandle} />
                  <View
                    style={[
                      styles.playhead,
                      { left: `${playheadPercent}%` },
                    ]}
                  />
                </View>
              )}
            </View>

            <Text style={styles.durationInfo}>
              Video: {duration.toFixed(2)}s · Clip: {CLIP_LENGTH.toFixed(2)}s
            </Text>
          </>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[globalStyles.outlineBtn, styles.flexButton]}
            onPress={handleSkip}
          >
            <Text style={globalStyles.outlineBtnText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[globalStyles.primaryBtn, styles.flexButton]}
            onPress={handleConfirm}
            disabled={isLoading}
          >
            <Text style={globalStyles.primaryBtnText}>Analyse Clip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = {
  videoContainer: {
    height: 220,
    marginVertical: 12,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  video: { flex: 1 },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  loadingText: { color: '#fff', marginTop: 12 },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timeLabel: { fontSize: 14, color: '#888', fontVariant: ['tabular-nums'] },
  clipLabel: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  sliderWrapper: {
    position: 'relative',
    width: '100%',
    height: 50,
    justifyContent: 'center',
  },
  leftShade: {
    position: 'absolute',
    top: 10,
    bottom: 10,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 8,
  },
  rightShade: {
    position: 'absolute',
    top: 10,
    bottom: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 8,
  },
  selectionBox: {
    position: 'absolute',
    top: 10,
    bottom: 10,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    borderColor: colors.primary,
    borderWidth: 2,
    borderRadius: 8,
  },
  leftHandle: {
    position: 'absolute',
    left: -2,
    top: 0,
    bottom: 0,
    width: 8,
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  rightHandle: {
    position: 'absolute',
    right: -2,
    top: 0,
    bottom: 0,
    width: 8,
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  playhead: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    width: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  durationInfo: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 16,
    justifyContent: 'space-between',
    width: '100%',
  },
  flexButton: { flex: 1, marginHorizontal: 4 },
};