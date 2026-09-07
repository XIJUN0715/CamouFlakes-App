// src/screens/AnalysisDetailScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { globalStyles, colors } from '../styles/globalStyles';
import Header from '../components/Header';
import { getHistoryItemById } from '../utils/historyStorage';
import { formatIncidentTimestamp } from '../utils/reference';

const { width } = Dimensions.get('window');
const VIDEO_HEIGHT = 220;
const VIDEO_WIDTH = width - 42;

// Same helper as ResultScreen – ensures classification is shown even if history missing
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

export default function AnalysisDetailScreen({ route, navigation }) {
  const { id, item: passedItem } = route.params || {};
  const [item, setItem] = useState(passedItem || null);
  const [loading, setLoading] = useState(!passedItem);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (passedItem) {
      setItem(passedItem);
      setLoading(false);
      return;
    }
    const loadItem = async () => {
      try {
        const result = await getHistoryItemById(id);
        if (result) {
          setItem(result);
        } else {
          setError(true);
        }
      } catch (_) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    if (id) loadItem();
  }, [id, passedItem]);

  if (loading) {
    return (
      <View style={globalStyles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.gray, marginTop: 16 }}>Loading analysis details...</Text>
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={globalStyles.centered}>
        <Feather name="alert-circle" size={48} color={colors.danger} style={{ marginBottom: 16 }} />
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.black }}>Item Not Found</Text>
        <Text style={{ color: colors.gray, marginTop: 8 }}>This analysis could not be found.</Text>
        <TouchableOpacity
          style={[globalStyles.primaryBtn, { marginTop: 24, paddingHorizontal: 32 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={globalStyles.primaryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const {
    videoUri,
    isFake,
    confidence,
    fakePercent = 0,
    genuinePercent = 100,
    source = 'unknown',
    thumbnail,
    incidentTimestamp,
    date,
    duration,
    reasoning,
  } = item;

  const formattedDate = incidentTimestamp
    ? formatIncidentTimestamp(incidentTimestamp)
    : date || 'Unknown date';
  const displayThumbnail = thumbnail || null;

  const isHighRisk = isFake && confidence >= 90;

  // Use reasoning from history if available, otherwise generate classification text
  const classificationText = (reasoning && reasoning.length > 0)
    ? reasoning
    : getClassificationText(isFake, confidence, 0.5); // fakeProb not stored, use confidence

  const getSourceLabel = () => {
    switch (source) {
      case 'gallery': return 'Gallery Upload';
      case 'camera': return 'Recorded Video';
      case 'screen_recording': return 'Live Overlay Detection';
      default: return 'Unknown Source';
    }
  };

  const sourceLabel = getSourceLabel();
  const durationText = duration ? `${duration.toFixed(1)}s` : 'Unknown';

  return (
    <View style={globalStyles.container}>
      <Header navigation={navigation} title="Analysis Details" showBack />

      <ScrollView
        style={globalStyles.contentContainer}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {videoUri ? (
          <View style={[globalStyles.card, { padding: 0, overflow: 'hidden', marginBottom: 16, backgroundColor: '#000' }]}>
            <Video
              key={videoUri}
              source={{ uri: videoUri }}
              style={{ width: VIDEO_WIDTH, height: VIDEO_HEIGHT, backgroundColor: '#000' }}
              useNativeControls
              resizeMode="contain"
              shouldPlay={false}
              isLooping
            />
          </View>
        ) : displayThumbnail ? (
          <Image
            source={{ uri: displayThumbnail }}
            style={{ width: VIDEO_WIDTH, height: VIDEO_HEIGHT, borderRadius: 12, marginBottom: 16 }}
            resizeMode="cover"
          />
        ) : (
          <View style={[globalStyles.card, { height: VIDEO_HEIGHT, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }]}>
            <Feather name="film" size={48} color={colors.gray} />
            <Text style={{ color: colors.gray, marginTop: 8 }}>No video preview available</Text>
          </View>
        )}

        {/* High‑Risk Banner */}
        {isHighRisk && (
          <View style={{
            backgroundColor: colors.danger,
            padding: 14,
            borderRadius: 10,
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 16,
          }}>
            <Feather name="alert-triangle" size={24} color={colors.white} style={{ marginRight: 10 }} />
            <Text style={{ color: colors.white, fontWeight: 'bold', fontSize: 16, flex: 1 }}>
              HIGH RISK – Immediate action recommended
            </Text>
          </View>
        )}

        <View style={[
          globalStyles.card,
          {
            alignItems: 'center',
            backgroundColor: isFake ? '#FFF0ED' : '#EDFFF5',
            marginBottom: 16,
          }
        ]}>
          <Feather
            name={isFake ? 'alert-triangle' : 'check-circle'}
            size={48}
            color={isFake ? colors.danger : colors.success}
            style={{ marginVertical: 8 }}
          />
          <Text style={{
            fontSize: 28,
            fontWeight: '700',
            color: isFake ? colors.danger : colors.success,
          }}>
            {isFake ? 'DEEPFAKE' : 'GENUINE'}
          </Text>
          <Text style={{ fontSize: 14, color: colors.gray, marginTop: 4 }}>
            {confidence}% Confidence
          </Text>
          <Text style={{ fontSize: 12, color: colors.gray, marginTop: 2 }}>
            Analysed on {formattedDate}
          </Text>
        </View>

        <View style={[globalStyles.card, { marginBottom: 16 }]}>
          <Text style={[globalStyles.label, { fontSize: 16, marginBottom: 12 }]}>Confidence Analysis</Text>

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
            <View style={{ height: 8, backgroundColor: colors.lightGray, borderRadius: 4, marginTop: 4, overflow: 'hidden' }}>
              <View style={{ width: `${genuinePercent}%`, height: '100%', backgroundColor: colors.success, borderRadius: 4 }} />
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
            <View style={{ height: 8, backgroundColor: colors.lightGray, borderRadius: 4, marginTop: 4, overflow: 'hidden' }}>
              <View style={{ width: `${fakePercent}%`, height: '100%', backgroundColor: colors.danger, borderRadius: 4 }} />
            </View>
          </View>
        </View>

        {/* Classification Section */}
        <View style={[globalStyles.card, { marginBottom: 16, paddingVertical: 16 }]}>
          <Text style={[globalStyles.label, { fontSize: 16, marginBottom: 12 }]}>Classification</Text>
          {classificationText.map((text, index) => (
            <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', marginVertical: 2 }}>
              <Text style={{ color: colors.primary, marginRight: 8, fontSize: 14 }}>•</Text>
              <Text style={{ color: colors.gray, flex: 1, fontSize: 14 }}>{text}</Text>
            </View>
          ))}
        </View>

        <View style={[globalStyles.card, { marginBottom: 24 }]}>
          <Text style={[globalStyles.label, { fontSize: 16, marginBottom: 12 }]}>Details</Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
            <Text style={{ color: colors.gray, fontSize: 14 }}>Upload Method</Text>
            <Text style={{ color: colors.black, fontSize: 14, fontWeight: '500' }}>{sourceLabel}</Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
            <Text style={{ color: colors.gray, fontSize: 14 }}>Video Length</Text>
            <Text style={{ color: colors.black, fontSize: 14, fontWeight: '500' }}>{durationText}</Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
            <Text style={{ color: colors.gray, fontSize: 14 }}>Analysed On</Text>
            <Text style={{ color: colors.black, fontSize: 14, fontWeight: '500' }}>{formattedDate}</Text>
          </View>

          {confidence && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
              <Text style={{ color: colors.gray, fontSize: 14 }}>Confidence Score</Text>
              <Text style={{ color: colors.black, fontSize: 14, fontWeight: '500' }}>{confidence}%</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[globalStyles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('Home')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="home" size={18} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={globalStyles.primaryBtnText}>Back to Home</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}