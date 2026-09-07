// src/screens/ResultScreen.js
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Dimensions,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { globalStyles, colors } from '../styles/globalStyles';
import { addNotification } from '../utils/notifications';
import { saveHistoryItem } from '../utils/historyStorage';
import { formatIncidentTimestamp } from '../utils/reference';
import { pollEvidence } from '../utils/tflite';
import { saveVideoAndThumbnailToGallery } from '../utils/mediaSave';
import { generateCamouFlakesRef } from '../utils/reference';
import MCMCIcon from '../../assets/mcmc-logo.png';

const { width } = Dimensions.get('window');
const VIDEO_HEIGHT = 280;
const VIDEO_WIDTH = width - 42;

const getClassificationText = (isFake, confidence, fakeProb) => {
  if (!isFake) {
    return [
      'The model classified this video as GENUINE (authentic).',
      'No deepfake artifacts were detected with sufficient confidence.',
      'No action is required based on this analysis.'
    ];
  }

  if (confidence >= 90) {
    return [
      'The model classified this video as a DEEPFAKE with HIGH confidence (≥90%).',
      'This is a strong detection; therefore, the model is highly certain that the video contains synthetic manipulation.',
      'We strongly recommend reporting this to MCMC immediately.'
    ];
  } else if (confidence >= 70) {
    return [
      'The model classified this video as a DEEPFAKE with MODERATE confidence (70–89%).',
      'The classification is clear, but some ambiguity remains in the underlying signal.',
      'It is advisable to review the video carefully before reporting.'
    ];
  } else if (confidence > 50) {
    return [
      'The model classified this video as a DEEPFAKE with LOW confidence (51–69%).',
      'This is a suggestive indicator rather than definitive proof.',
      'Consider gathering additional evidence before reporting.'
    ];
  } else {
    return [
      'The model classified this video as a DEEPFAKE with very low confidence.',
      'This result is close to the decision boundary and should be treated with caution.'
    ];
  }
};

export default function ResultScreen({ route, navigation }) {
  const {
    videoUri,
    source,
    isFake,
    confidence: backendConfidence,
    probability,
    trimmedUri: initialTrimmedUri,
    thumbnailUri: initialThumbnailUri,
    duration,
    reasoning,
    segments,
    processingTime,
    jobId,
  } = route.params || {};

  const videoRef = useRef(null);
  const [incidentTimestamp] = useState(() => new Date().toISOString());
  const [hasSaved, setHasSaved] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [trimmedUri, setTrimmedUri] = useState(initialTrimmedUri || null);
  const [thumbnailUri, setThumbnailUri] = useState(initialThumbnailUri || null);
  const [evidenceLoading, setEvidenceLoading] = useState(!!jobId && !initialTrimmedUri);

  // Refs to prevent duplicate polling and saves
  const pollingStartedRef = useRef(false);
  const evidenceHandledRef = useRef(false);
  const pollIntervalRef = useRef(null);

  const fakeProb = probability !== undefined ? probability : 0.5;
  const genuineProb = 1 - fakeProb;
  const fakePercent = Math.round(fakeProb * 100);
  const genuinePercent = Math.round(genuineProb * 100);

  const displayConfidence = Math.round(Math.max(fakeProb, 1 - fakeProb) * 100);
  const isHighRisk = isFake && displayConfidence >= 90;

  const classificationText = (reasoning && reasoning.length > 0)
    ? reasoning
    : getClassificationText(isFake, displayConfidence, fakeProb);

  const displayVideoUri = trimmedUri || videoUri;

  useEffect(() => {
    if (displayVideoUri) {
      setIsVideoLoading(true);
      setVideoError(false);
    }
  }, [displayVideoUri]);

  // Polling effect – fixed to avoid duplicate saves
  useEffect(() => {
    if (!jobId || initialTrimmedUri || pollingStartedRef.current) return;
    pollingStartedRef.current = true;

    let pollCount = 0;
    const maxPolls = 20;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const evidence = await pollEvidence(jobId);
        if (evidence.ready && evidence.trimmedUri && !evidenceHandledRef.current) {
          evidenceHandledRef.current = true;
          setTrimmedUri(evidence.trimmedUri);
          setThumbnailUri(evidence.thumbnailUri || thumbnailUri);
          setEvidenceLoading(false);

          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;

          const fileTag = generateCamouFlakesRef();
          saveVideoAndThumbnailToGallery({
            videoUrl: evidence.trimmedUri,
            thumbnailUrl: evidence.thumbnailUri || thumbnailUri,
            reportRef: fileTag,
            isFake: isFake,
          });
        }
      } catch (error) {
        console.warn('[ResultScreen] Poll error:', error);
      }

      pollCount++;
      if (pollCount >= maxPolls) {
        console.log('[ResultScreen] Evidence polling timeout');
        setEvidenceLoading(false);
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        pollingStartedRef.current = false;
      }
    }, 500);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [jobId, initialTrimmedUri]); // ← thumbnailUri removed from dependencies

  useEffect(() => {
    const sendDetectionNotification = async () => {
      if (isFake) {
        await addNotification(
          'Deepfake Detected',
          `Analysis complete: ${fakePercent}% fake - Please review the results.`,
          'alert'
        );
      }
    };
    sendDetectionNotification();
  }, [isFake, fakePercent]);

  const saveToHistory = async () => {
    try {
      let title = 'Video Analysis';
      if (source === 'gallery') title = 'Gallery Upload';
      else if (source === 'camera') title = 'Live Recording';
      else if (source === 'screen_recording') title = 'Screen Recording';

      const historyVideoUri = trimmedUri || videoUri || 'unknown';
      const historyDuration = trimmedUri ? 5 : (duration || 0);

      await saveHistoryItem({
        title,
        videoUri: historyVideoUri,
        confidence: displayConfidence,
        isFake,
        fakePercent,
        genuinePercent,
        source: source || 'unknown',
        probability,
        thumbnail: thumbnailUri,
        incidentTimestamp,
        duration: historyDuration,
        reasoning: classificationText,
        segments: segments || [],
        processingTime,
      });

      setHasSaved(true);
      console.log('[ResultScreen] Saved to history');
      return true;
    } catch (error) {
      console.error('[ResultScreen] Save error:', error);
      Alert.alert('Error', 'Failed to save to history.');
      return false;
    }
  };

  const handleLeave = () => {
    Alert.alert(
      'Exit Analysis',
      'Are you sure you want to exit this analysis? Your results will be saved to history automatically.',
      [
        {
          text: 'Stay',
          style: 'cancel',
          onPress: () => {
            console.log('[ResultScreen] User chose to stay');
          },
        },
        {
          text: 'Exit and Save',
          onPress: async () => {
            const saved = await saveToHistory();
            if (saved) {
              await addNotification(
                'Analysis Saved',
                `Video analysis saved to history with ${fakePercent}% fake confidence.`,
                'info'
              );
            }
            navigation.goBack();
          },
        },
      ]
    );
  };

  const getTargetScreen = (action) => {
    if (!action) return null;
    if (action.type === 'NAVIGATE' || action.type === 'REPLACE') {
      const payload = action.payload || {};
      return payload.name || payload.screen || null;
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (hasSaved) return;
      const target = getTargetScreen(e.data.action);
      if (target === 'MCMCReport' || target === 'Home') {
        return;
      }
      e.preventDefault();
      handleLeave();
    });

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!hasSaved) {
        handleLeave();
        return true;
      }
      return false;
    });

    return () => {
      unsubscribe();
      backHandler.remove();
    };
  }, [navigation, hasSaved]);

  const handleReport = async () => {
    if (isHighRisk) {
      await addNotification(
        'High Risk Detection Alert',
        `A video you analyzed was flagged as high-risk deepfake with ${fakePercent}% fake confidence.`,
        'alert'
      );
    }
    if (!hasSaved) {
      await saveToHistory();
    }
    navigation.navigate('MCMCReport', {
      videoUri: trimmedUri || videoUri,
      confidence: displayConfidence,
      result: { isFake, confidence: displayConfidence },
      thumbnailUri,
      incidentTimestamp,
    });
  };

  const handleSaveAndGoHome = async () => {
    const saved = await saveToHistory();
    if (saved) {
      await addNotification(
        'Analysis Saved',
        `Video analysis saved to history with ${fakePercent}% fake confidence.`,
        'info'
      );
      navigation.navigate('Home');
    }
  };

  const formattedIncident = formatIncidentTimestamp(incidentTimestamp);

  const handleVideoLoad = () => {
    setIsVideoLoading(false);
    setVideoError(false);
  };

  const handleVideoError = (error) => {
    console.warn('[ResultScreen] Video error:', error);
    setIsVideoLoading(false);
    setVideoError(true);
  };

  return (
    <ScrollView
      style={globalStyles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={globalStyles.contentContainer}>
        <Text style={[globalStyles.headerOrange, { fontSize: 32 }]}>CamouFlakes</Text>
        <Text style={[globalStyles.subtitle, { marginBottom: 16 }]}>Unmask the Fake</Text>

        {displayVideoUri ? (
          <View style={[
            globalStyles.card,
            {
              padding: 0,
              overflow: 'hidden',
              marginBottom: 16,
              marginHorizontal: 0,
              backgroundColor: '#000',
            },
          ]}>
            <Video
              ref={videoRef}
              key={displayVideoUri}
              source={{ uri: displayVideoUri }}
              style={{ width: VIDEO_WIDTH, height: VIDEO_HEIGHT, backgroundColor: '#000' }}
              useNativeControls
              resizeMode="contain"
              shouldPlay={false}
              isLooping
              onLoad={handleVideoLoad}
              onError={handleVideoError}
            />
            {isVideoLoading && (
              <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.6)',
              }}>
                <ActivityIndicator size="large" color={colors.white} />
                <Text style={{ color: colors.white, marginTop: 12, fontSize: 14 }}>
                  {evidenceLoading ? 'Loading evidence...' : 'Loading video...'}
                </Text>
              </View>
            )}
            {videoError && !isVideoLoading && (
              <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.7)',
              }}>
                <Feather name="alert-circle" size={40} color={colors.danger} />
                <Text style={{ color: colors.white, marginTop: 8, fontSize: 14 }}>
                  Could not load video
                </Text>
                <Text style={{ color: colors.gray, fontSize: 12, marginTop: 4 }}>
                  Tap the play button to try again
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[
            globalStyles.card,
            {
              alignItems: 'center',
              justifyContent: 'center',
              height: VIDEO_HEIGHT,
              marginBottom: 16,
              marginHorizontal: 0,
            },
          ]}>
            <Feather name="film" size={40} color={colors.gray} />
            <Text style={{ color: colors.gray, marginTop: 8 }}>No video preview available</Text>
          </View>
        )}

        <View style={[
          globalStyles.card,
          {
            alignItems: 'center',
            backgroundColor: isFake ? '#FFF0ED' : '#EDFFF5',
            marginBottom: 16,
            paddingVertical: 16,
          },
        ]}>
          <Feather
            name={isFake ? 'alert-triangle' : 'check-circle'}
            size={48}
            color={isFake ? colors.danger : colors.success}
            style={{ marginVertical: 4 }}
          />
          <Text style={{
            fontSize: 32,
            fontWeight: '700',
            color: isFake ? colors.danger : colors.success,
          }}>
            {isFake ? 'DEEPFAKE' : 'GENUINE'}
          </Text>
          {formattedIncident && (
            <Text style={{ fontSize: 14, color: colors.gray, marginTop: 6 }}>
              Detected on {formattedIncident}
            </Text>
          )}
          {processingTime && (
            <Text style={{ fontSize: 13, color: colors.gray, marginTop: 4 }}>
              Analysed in {processingTime.toFixed(2)} seconds
            </Text>
          )}
        </View>

        {isHighRisk && (
          <View style={[
            globalStyles.card,
            {
              backgroundColor: colors.danger,
              padding: 14,
              marginBottom: 16,
              borderWidth: 0,
            }
          ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="alert-triangle" size={28} color={colors.white} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{
                  color: colors.white,
                  fontWeight: 'bold',
                  fontSize: 18,
                }}>
                  HIGH RISK
                </Text>
                <Text style={{
                  color: colors.white,
                  opacity: 0.9,
                  fontSize: 14,
                  marginTop: 2,
                }}>
                  This video is highly suspicious ({displayConfidence}% confidence).
                  We strongly recommend reporting this to MCMC immediately.
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={[globalStyles.card, { marginTop: 0, paddingVertical: 16 }]}>
          <Text style={[globalStyles.label, { fontSize: 16, marginBottom: 12 }]}>Analysis Breakdown</Text>

          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="check-circle" size={14} color={colors.success} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 14, color: colors.gray }}>Human-Created</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.success }}>
                {genuinePercent}%
              </Text>
            </View>
            <View style={{
              height: 10,
              backgroundColor: colors.lightGray,
              borderRadius: 5,
              marginTop: 4,
              overflow: 'hidden',
            }}>
              <View style={{
                width: `${genuinePercent}%`,
                height: '100%',
                backgroundColor: colors.success,
                borderRadius: 5,
              }} />
            </View>
          </View>

          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="alert-triangle" size={14} color={colors.danger} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 14, color: colors.gray }}>Deepfake</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.danger }}>
                {fakePercent}%
              </Text>
            </View>
            <View style={{
              height: 10,
              backgroundColor: colors.lightGray,
              borderRadius: 5,
              marginTop: 4,
              overflow: 'hidden',
            }}>
              <View style={{
                width: `${fakePercent}%`,
                height: '100%',
                backgroundColor: colors.danger,
                borderRadius: 5,
              }} />
            </View>
          </View>

          <Text style={{
            fontSize: 12,
            color: colors.gray,
            marginTop: 16,
            textAlign: 'center',
          }}>
            Model confidence: {displayConfidence}%
          </Text>
        </View>

        <View style={[globalStyles.card, { paddingVertical: 16 }]}>
          <Text style={[globalStyles.label, { fontSize: 16, marginBottom: 12 }]}>Classification</Text>
          {classificationText.map((text, index) => (
            <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', marginVertical: 2 }}>
              <Text style={{ color: colors.primary, marginRight: 8 }}>•</Text>
              <Text style={{ color: colors.gray, flex: 1 }}>{text}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 20, width: '100%' }}>
          {isFake && (
            <TouchableOpacity
              style={[globalStyles.dangerBtn, { marginBottom: 10 }]}
              onPress={handleReport}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Image
                  source={MCMCIcon}
                  style={{ width: 24, height: 24, marginRight: 8 }}
                />
                <Text style={globalStyles.dangerBtnText}>Report to MCMC</Text>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              globalStyles.primaryBtn,
              { backgroundColor: isFake ? colors.primary : colors.success },
            ]}
            onPress={handleSaveAndGoHome}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="home" size={18} color={colors.white} style={{ marginRight: 8 }} />
              <Text style={globalStyles.primaryBtnText}>Save and Back to Home</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}