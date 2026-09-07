// src/screens/CameraScreen.js

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, {
  Path,
  Line,
  Circle,
  Ellipse,
} from 'react-native-svg';
import { globalStyles, colors } from '../styles/globalStyles';

/*
 * Passport-style head and upper-body guide.
 *
 * ViewBox: 300 x 420
 *
 * Composition:
 * - Large centered head
 * - Wider and taller face region
 * - Eyes centered
 * - Longer nose reference
 * - Lower mouth position
 * - Visible chin area
 * - Visible neck
 * - Wide and relatively straight shoulders
 * - Longer upper chest
 */

const BUST_PATH =
  'M 6 420 ' +
  'L 6 334 ' +
  'C 6 312, 20 294, 45 281 ' +
  'C 61 273, 79 265, 98 257 ' +
  'L 104 211 ' +
  'C 78 196, 62 169, 62 137 ' +
  'C 62 79, 96 34, 150 34 ' +
  'C 204 34, 238 79, 238 137 ' +
  'C 238 169, 222 196, 196 211 ' +
  'L 202 257 ' +
  'C 221 265, 239 273, 255 281 ' +
  'C 280 294, 294 312, 294 334 ' +
  'L 294 420 ' +
  'Z';

export default function CameraScreen({ navigation }) {
  const [permission, requestPermission] =
    useCameraPermissions();

  const [isRecording, setIsRecording] =
    useState(false);

  const [cameraReady, setCameraReady] =
    useState(false);

  const [facing, setFacing] =
    useState('back');

  const [recordingTime, setRecordingTime] =
    useState(0);

  const [preflightDone, setPreflightDone] =
    useState(false);

  const cameraRef = useRef(null);
  const timerInterval = useRef(null);
  const startTimeRef = useRef(null);

  const [cameraLayout, setCameraLayout] =
    useState({
      width: 0,
      height: 0,
    });

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, []);

  const toggleFacing = () => {
    setFacing((current) =>
      current === 'back' ? 'front' : 'back'
    );
  };

  const handleCameraLayout = (event) => {
    const { width, height } =
      event.nativeEvent.layout;

    setCameraLayout({
      width,
      height,
    });
  };

  const startRecording = async () => {
    if (
      !cameraRef.current ||
      isRecording ||
      !cameraReady
    ) {
      return;
    }

    setIsRecording(true);
    setRecordingTime(0);

    startTimeRef.current = Date.now();

    timerInterval.current = setInterval(() => {
      const elapsed =
        (Date.now() - startTimeRef.current) / 1000;

      setRecordingTime(elapsed);
    }, 100);

    try {
      const video =
        await cameraRef.current.recordAsync({
          maxDuration: 30,
          quality: '1080p',
          mute: true,
        });

      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }

      setIsRecording(false);

      const actualDuration =
        (Date.now() - startTimeRef.current) / 1000;

      if (actualDuration < 3) {
        Alert.alert(
          'Video Too Short',
          'Please record at least 3 seconds.'
        );
        return;
      }

      navigation.replace('TrimVideo', {
        videoUri: video.uri,
        source: 'camera',
      });
    } catch (error) {
      console.error(
        'Recording error:',
        error
      );

      setIsRecording(false);

      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }

      Alert.alert(
        'Error',
        'Failed to record video.'
      );
    }
  };

  const stopRecording = async () => {
    if (
      cameraRef.current &&
      isRecording
    ) {
      await cameraRef.current.stopRecording();

      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }

      setIsRecording(false);
    }
  };

  const getMessage = () => {
    if (isRecording) {
      return `Recording: ${recordingTime.toFixed(
        1
      )}s (min 3s, max 30s)`;
    }

    return 'Keep face centered and shoulders within the outline';
  };

  /*
   * Calculate guide dimensions using the actual
   * camera preview instead of the full device screen.
   */
  const getGuideDimensions = () => {
    const cameraWidth = cameraLayout.width;
    const cameraHeight = cameraLayout.height;

    if (
      !cameraWidth ||
      !cameraHeight
    ) {
      return {
        width: 0,
        height: 0,
        x: 0,
        y: 0,
      };
    }

    /*
     * Taller portrait composition.
     */
    const GUIDE_ASPECT_RATIO = 300 / 420;

    /*
     * Large frame with small margins.
     */
    const maxGuideHeight =
      cameraHeight * 0.95;

    const maxGuideWidth =
      cameraWidth * 0.91;

    let guideHeight =
      maxGuideHeight;

    let guideWidth =
      guideHeight *
      GUIDE_ASPECT_RATIO;

    /*
     * Prevent the guide from exceeding
     * the camera preview width.
     */
    if (
      guideWidth > maxGuideWidth
    ) {
      guideWidth =
        maxGuideWidth;

      guideHeight =
        guideWidth /
        GUIDE_ASPECT_RATIO;
    }

    /*
     * Center the guide exactly
     * inside the camera preview.
     */
    const guideX =
      (cameraWidth - guideWidth) / 2;

    const guideY =
      (cameraHeight - guideHeight) / 2;

    return {
      width: guideWidth,
      height: guideHeight,
      x: guideX,
      y: guideY,
    };
  };

  const GuideOverlay = () => {
    const guide =
      getGuideDimensions();

    if (
      !guide.width ||
      !guide.height
    ) {
      return null;
    }

    return (
      <View
        style={styles.overlayContainer}
        pointerEvents="none"
      >
        <Svg
          width={guide.width}
          height={guide.height}
          viewBox="0 0 300 420"
          style={{
            position: 'absolute',
            left: guide.x,
            top: guide.y,
          }}
        >
          {/* Main passport-style body outline */}
          <Path
            d={BUST_PATH}
            stroke={colors.primary}
            strokeWidth={4}
            strokeDasharray="10,7"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Taller facial alignment oval */}
          <Ellipse
            cx="150"
            cy="124"
            rx="78"
            ry="90"
            fill="none"
            stroke={colors.primary}
            strokeWidth={2}
            strokeDasharray="5,5"
            opacity={0.55}
          />

          {/* Vertical facial center line */}
          <Line
            x1="150"
            y1="42"
            x2="150"
            y2="214"
            stroke={colors.primary}
            strokeWidth={1.5}
            strokeDasharray="4,6"
            opacity={0.45}
          />

          {/* Eye-level guide */}
          <Line
            x1="75"
            y1="109"
            x2="225"
            y2="109"
            stroke={colors.primary}
            strokeWidth={1.2}
            strokeDasharray="4,6"
            opacity={0.32}
          />

          {/* Left eye reference */}
          <Ellipse
            cx="119"
            cy="109"
            rx="15"
            ry="6"
            fill="none"
            stroke={colors.primary}
            strokeWidth={2}
            opacity={0.9}
          />

          <Circle
            cx="119"
            cy="109"
            r="2.5"
            fill={colors.primary}
            opacity={0.9}
          />

          {/* Right eye reference */}
          <Ellipse
            cx="181"
            cy="109"
            rx="15"
            ry="6"
            fill="none"
            stroke={colors.primary}
            strokeWidth={2}
            opacity={0.9}
          />

          <Circle
            cx="181"
            cy="109"
            r="2.5"
            fill={colors.primary}
            opacity={0.9}
          />

          {/* Longer nose reference */}
          <Line
            x1="150"
            y1="116"
            x2="150"
            y2="166"
            stroke={colors.primary}
            strokeWidth={1.5}
            opacity={0.55}
          />

          {/* Lower mouth reference */}
          <Path
            d="M 125 176 Q 150 188 175 176"
            stroke={colors.primary}
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
            opacity={0.9}
          />

          {/* Mouth center marker */}
          <Circle
            cx="150"
            cy="182"
            r="2.5"
            fill={colors.primary}
            opacity={0.85}
          />
        </Svg>
      </View>
    );
  };

  const PreflightItem = ({
    icon,
    text,
  }) => (
    <View
      style={styles.preflightItem}
    >
      <Feather
        name={icon}
        size={20}
        color={colors.primary}
        style={{
          marginRight: 12,
        }}
      />

      <Text
        style={
          styles.preflightItemText
        }
      >
        {text}
      </Text>
    </View>
  );

  if (!preflightDone) {
    return (
      <View
        style={[
          globalStyles.container,
          styles.preflightContainer,
        ]}
      >
        <Feather
          name="camera"
          size={48}
          color={colors.primary}
          style={{
            marginBottom: 16,
          }}
        />

        <Text
          style={
            styles.preflightTitle
          }
        >
          Before you start recording
        </Text>

        <View
          style={{
            width: '100%',
            marginTop: 16,
          }}
        >
          <PreflightItem
            icon="sun"
            text="Make sure the lighting is good and the subject's face is clearly lit"
          />

          <PreflightItem
            icon="aperture"
            text="Check the camera lens is clean and free of smudges"
          />

          <PreflightItem
            icon="user"
            text="Position the person from head to chest, keeping the face centered and both shoulders inside the outline"
          />
        </View>

        <TouchableOpacity
          style={[
            globalStyles.primaryBtn,
            {
              marginTop: 28,
              width: '100%',
            },
          ]}
          onPress={() =>
            setPreflightDone(true)
          }
        >
          <Text
            style={
              globalStyles.primaryBtnText
            }
          >
            I'm Ready — Start Camera
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            globalStyles.outlineBtn,
            {
              width: '100%',
            },
          ]}
          onPress={() =>
            navigation.goBack()
          }
        >
          <Text
            style={
              globalStyles.outlineBtnText
            }
          >
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!permission) {
    return (
      <View
        style={
          globalStyles.centered
        }
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text
          style={[
            globalStyles.subtitle,
            {
              marginTop: 16,
            },
          ]}
        >
          Requesting camera permission...
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View
        style={
          globalStyles.centered
        }
      >
        <Text
          style={globalStyles.header}
        >
          Camera Access
        </Text>

        <Text
          style={[
            globalStyles.subtitle,
            {
              textAlign: 'center',
            },
          ]}
        >
          We need camera permission to record videos.
        </Text>

        <TouchableOpacity
          style={
            globalStyles.primaryBtn
          }
          onPress={requestPermission}
        >
          <Text
            style={
              globalStyles.primaryBtnText
            }
          >
            Grant Permission
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={
            globalStyles.outlineBtn
          }
          onPress={() =>
            navigation.goBack()
          }
        >
          <Text
            style={
              globalStyles.outlineBtnText
            }
          >
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={[
        globalStyles.container,
        {
          paddingTop: 0,
          flex: 1,
        },
      ]}
    >
      <View
        style={styles.cameraContainer}
        onLayout={handleCameraLayout}
      >
        <CameraView
          ref={cameraRef}
          style={
            StyleSheet.absoluteFillObject
          }
          onCameraReady={() =>
            setCameraReady(true)
          }
          videoQuality="1080p"
          facing={facing}
          mode="video"
          mute
        />

        <GuideOverlay />

        <TouchableOpacity
          style={styles.flipButton}
          onPress={toggleFacing}
          disabled={isRecording}
        >
          <Feather
            name="refresh-cw"
            size={24}
            color={colors.white}
          />
        </TouchableOpacity>

        {isRecording && (
          <View
            style={
              styles.recordingStatusWrapper
            }
          >
            <View
              style={
                styles.recordingStatus
              }
            >
              <View
                style={[
                  styles.recordingDot,
                  {
                    backgroundColor:
                      recordingTime < 3
                        ? colors.warning
                        : colors.danger,
                  },
                ]}
              />

              <Text
                style={
                  styles.recordingText
                }
              >
                {recordingTime.toFixed(
                  1
                )}s{' '}
                {recordingTime < 3
                  ? '(min 3s)'
                  : ''}
              </Text>
            </View>
          </View>
        )}
      </View>

      <Text
        style={[
          globalStyles.subtitle,
          {
            textAlign: 'center',
            fontSize: 14,
            color:
              isRecording &&
              recordingTime < 3
                ? colors.warning
                : colors.gray,
            fontWeight:
              isRecording &&
              recordingTime < 3
                ? '600'
                : '400',
            paddingHorizontal: 12,
          },
        ]}
      >
        {getMessage()}
      </Text>

      <TouchableOpacity
        style={[
          globalStyles.primaryBtn,
          {
            backgroundColor:
              isRecording
                ? recordingTime < 3
                  ? colors.warning
                  : colors.danger
                : colors.primary,
            paddingVertical: 20,
            marginVertical: 8,
          },
        ]}
        onPressIn={
          cameraReady &&
          !isRecording
            ? startRecording
            : undefined
        }
        onPressOut={
          isRecording
            ? stopRecording
            : undefined
        }
        disabled={!cameraReady}
        activeOpacity={0.8}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Feather
            name={
              isRecording
                ? 'square'
                : 'circle'
            }
            size={20}
            color={colors.white}
            style={{
              marginRight: 10,
            }}
          />

          <Text
            style={[
              globalStyles.primaryBtnText,
              {
                fontSize: 18,
              },
            ]}
          >
            {isRecording
              ? 'Release to Stop'
              : 'Hold to Record'}
          </Text>
        </View>

        {!cameraReady && (
          <Text
            style={{
              color: colors.white,
              opacity: 0.6,
              fontSize: 12,
              marginTop: 4,
            }}
          >
            Initializing camera...
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={
          globalStyles.outlineBtn
        }
        onPress={() =>
          navigation.goBack()
        }
      >
        <Text
          style={
            globalStyles.outlineBtnText
          }
        >
          Cancel
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  preflightContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  preflightTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.black,
    textAlign: 'center',
  },

  preflightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },

  preflightItemText: {
    flex: 1,
    fontSize: 15,
    color: colors.gray,
  },

  cameraContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 12,
    backgroundColor: '#000',
    position: 'relative',
  },

  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },

  flipButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 12,
    borderRadius: 30,
    zIndex: 10,
  },

  recordingStatusWrapper: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  recordingStatus: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
  },

  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },

  recordingText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 16,
  },
});