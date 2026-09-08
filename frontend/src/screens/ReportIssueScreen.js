// src/screens/ReportIssueScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MailComposer from 'expo-mail-composer';
import * as Device from 'expo-device';
import { globalStyles, colors } from '../styles/globalStyles';
import Header from '../components/Header';
import BottomNavBar from '../components/BottomNavBar';
import Constants from 'expo-constants';
import { BACKEND_URL } from '../config';

const MAX_WORDS = 500;
const MAX_SCREENSHOTS = 5;

const getCleanAndroidVersion = () => {
  const osName = Device.osName || '';
  if (osName && !osName.includes('/') && osName.startsWith('Android')) {
    return osName;
  }
  const apiLevel = Platform.Version;
  const versionMap = {
    23: 'Android 6.0 (Marshmallow)',
    24: 'Android 7.0 (Nougat)',
    25: 'Android 7.1',
    26: 'Android 8.0 (Oreo)',
    27: 'Android 8.1',
    28: 'Android 9.0 (Pie)',
    29: 'Android 10',
    30: 'Android 11',
    31: 'Android 12',
    32: 'Android 12L',
    33: 'Android 13',
    34: 'Android 14',
    35: 'Android 15',
    36: 'Android 16',
    37: 'Android 17',
    38: 'Android 18',
  };
  return versionMap[apiLevel] || `Android API ${apiLevel}`;
};

export default function ReportIssueScreen({ navigation }) {
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [description, setDescription] = useState('');
  const [screenshots, setScreenshots] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [isVerifying, setIsVerifying] = useState(false);
  const pollingIntervalRef = useRef(null);
  const pollAttemptsRef = useRef(0);
  const isCancelledRef = useRef(false);

  const categories = [
    'General',
    'Upload Video',
    'Record Video',
    'Live Overlay Detection',
    'App Performance',
    'Other',
  ];

  const countWords = (text) => {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const wordCount = countWords(description);
  const isOverWordLimit = wordCount > MAX_WORDS;

  const hasUnsavedChanges =
    description.trim().length > 0 ||
    screenshots.length > 0 ||
    selectedCategory !== 'General';

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (isSubmitted) return;
      if (!hasUnsavedChanges) return;

      e.preventDefault();
      Alert.alert(
        'Discard Report?',
        'Your description and attached screenshots will be lost.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setDescription('');
              setScreenshots([]);
              setSelectedCategory('General');
              unsubscribe();
              navigation.dispatch(e.data.action);
            },
          },
        ]
      );
    });
    return unsubscribe;
  }, [navigation, hasUnsavedChanges, isSubmitted]);

  const pickScreenshots = async () => {
    const remaining = MAX_SCREENSHOTS - screenshots.length;
    if (remaining <= 0) {
      Alert.alert('Maximum Reached', `You can attach up to ${MAX_SCREENSHOTS} screenshots.`);
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.7,
      });
      if (!result.canceled && result.assets) {
        setScreenshots((prev) => [...prev, ...result.assets]);
      }
    } catch (error) {
      console.error('Screenshot picker error:', error);
      Alert.alert('Error', 'Unable to select screenshots.');
    }
  };

  const removeScreenshot = (index) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  };

  const storeFeedbackOnServer = async (issueId, now) => {
    try {
      const payload = {
        issueId,
        category: selectedCategory,
        description,
        device: Device.modelName || 'Unknown Device',
        osVersion: String(Platform.Version),
        osName: getCleanAndroidVersion(),
        appVersion: Constants.expoConfig?.version || '1.0.0',
        submittedAt: now.toISOString(),
        screenshots_count: screenshots.length,
      };
      const response = await fetch(`${BACKEND_URL}/store-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return response.ok;
    } catch (error) {
      console.warn('Backup storage failed:', error);
      return false;
    }
  };

  const verifyEmailDelivery = (issueId, onSuccess, onFailure) => {
    isCancelledRef.current = false;
    pollAttemptsRef.current = 0;
    const POLL_INTERVAL = 12000;
    const MAX_ATTEMPTS = 15;

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    const intervalId = setInterval(async () => {
      if (isCancelledRef.current) {
        clearInterval(intervalId);
        pollingIntervalRef.current = null;
        return;
      }

      pollAttemptsRef.current += 1;

      try {
        const response = await fetch(`${BACKEND_URL}/check-email-received?issue_id=${issueId}`);
        const data = await response.json();
        if (response.ok && data.received === true) {
          clearInterval(intervalId);
          pollingIntervalRef.current = null;
          onSuccess();
          return;
        }
      } catch (error) {
        // ignore
      }

      if (pollAttemptsRef.current >= MAX_ATTEMPTS) {
        clearInterval(intervalId);
        pollingIntervalRef.current = null;
        onFailure('Timeout – email not received.');
      }
    }, POLL_INTERVAL);

    pollingIntervalRef.current = intervalId;
  };

  const cancelVerification = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    isCancelledRef.current = true;
    setIsVerifying(false);
    setIsSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Description Required', 'Please describe the issue before submitting.');
      return;
    }
    if (isOverWordLimit) {
      Alert.alert('Description Too Long', `Please keep your description within ${MAX_WORDS} words.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date();
      const dateStr =
        now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0');
      const issueId = `CF-${dateStr}-${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`;

      const deviceInfo = {
        device: Device.modelName || 'Unknown Device',
        osName: getCleanAndroidVersion(),
        appVersion: Constants.expoConfig?.version || '1.0.0',
      };

      const emailBody = `
CamouFlakes Issue Report
━━━━━━━━━━━━━━━━━━━━━━

Issue ID: ${issueId}
Category: ${selectedCategory}
Submitted: ${now.toLocaleString()}

Device: ${deviceInfo.device}
OS: ${deviceInfo.osName}
App Version: ${deviceInfo.appVersion}

Description:
${description}

Screenshots: ${screenshots.length} attached
━━━━━━━━━━━━━━━━━━━━━━
This report was submitted through the CamouFlakes mobile application.
      `;

      const isAvailable = await MailComposer.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('No Email App', 'Please install an email app to send reports.');
        setIsSubmitting(false);
        return;
      }

      const attachmentUris = screenshots.map((item) => item.uri);
      const result = await MailComposer.composeAsync({
        recipients: ['camouflakes@gmail.com'],
        subject: `[CamouFlakes] ${selectedCategory} - ${issueId}`,
        body: emailBody,
        isHtml: false,
        attachments: attachmentUris.length > 0 ? attachmentUris : undefined,
      });

      if (result.status === 'sent') {
        if (Platform.OS === 'ios') {
          await storeFeedbackOnServer(issueId, now);
          setIsSubmitted(true);
          setDescription('');
          setScreenshots([]);
          setSelectedCategory('General');
          Alert.alert(
            'Issue Submitted',
            `Thank you for helping us improve CamouFlakes.\n\nIssue ID: ${issueId}`,
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          setIsSubmitting(false);
        } else {
          setIsVerifying(true);
          verifyEmailDelivery(
            issueId,
            async () => {
              setIsVerifying(false);
              await storeFeedbackOnServer(issueId, now);
              setIsSubmitted(true);
              setDescription('');
              setScreenshots([]);
              setSelectedCategory('General');

              Alert.alert(
                'Issue Submitted',
                `Thank you for helping us improve CamouFlakes.\n\nIssue ID: ${issueId}`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      setTimeout(() => navigation.goBack(), 100);
                    },
                  },
                ]
              );
              setIsSubmitting(false);
            },
            (errorMsg) => {
              setIsVerifying(false);
              Alert.alert(
                'Feedback Not Sent',
                'We couldn\'t confirm your email was received. You can try again or leave the page.',
                [
                  {
                    text: 'Try Again',
                    onPress: () => setIsSubmitting(false),
                  },
                  {
                    text: 'Leave',
                    onPress: () => setIsSubmitting(false),
                  },
                ]
              );
            }
          );
        }
      } else if (result.status === 'cancelled') {
        setIsSubmitting(false);
      } else {
        Alert.alert('Error', 'Failed to open the email app. Please try again.');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to submit issue. Please try again later.');
      setIsSubmitting(false);
    }
  };

  return (
    <View style={globalStyles.container}>
      <Header navigation={navigation} title="Report an Issue" showBack />

      <ScrollView style={globalStyles.contentContainer} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <Text style={globalStyles.subtitle}>Help us improve CamouFlakes by reporting problems or unexpected behaviour.</Text>

        <Text style={globalStyles.label}>Issue Category</Text>
        <TouchableOpacity style={[globalStyles.input, { justifyContent: 'center', flexDirection: 'row', alignItems: 'center' }]} onPress={() => setIsDropdownOpen(true)}>
          <Text style={{ color: colors.black, flex: 1 }}>{selectedCategory}</Text>
          <Feather name="chevron-down" size={18} color={colors.gray} />
        </TouchableOpacity>

        <Modal visible={isDropdownOpen} transparent animationType="fade" onRequestClose={() => setIsDropdownOpen(false)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={() => setIsDropdownOpen(false)}>
            <View style={{ backgroundColor: colors.white, borderRadius: 16, padding: 20, width: '85%' }}>
              <Text style={[globalStyles.header, { fontSize: 18, marginBottom: 12 }]}>Select Category</Text>
              {categories.map((category) => (
                <TouchableOpacity key={category} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.lightGray, flexDirection: 'row', alignItems: 'center' }} onPress={() => { setSelectedCategory(category); setIsDropdownOpen(false); }}>
                  {selectedCategory === category && <Feather name="check" size={16} color={colors.primary} style={{ marginRight: 10 }} />}
                  <Text style={{ fontSize: 16, color: selectedCategory === category ? colors.primary : colors.black, fontWeight: selectedCategory === category ? '600' : '400', marginLeft: selectedCategory === category ? 0 : 26 }}>{category}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        <Text style={[globalStyles.label, { marginTop: 18 }]}>Describe the Issue</Text>
        <TextInput style={[globalStyles.inputMultiline, { height: 180 }]} placeholder="Please describe what happened..." placeholderTextColor={colors.gray} value={description} onChangeText={setDescription} multiline textAlignVertical="top" />
        <Text style={{ textAlign: 'right', marginTop: 6, color: isOverWordLimit ? colors.danger : colors.gray, fontSize: 12 }}>{wordCount} / {MAX_WORDS} words</Text>

        <Text style={[globalStyles.label, { marginTop: 16 }]}>Screenshots</Text>
        <Text style={{ fontSize: 13, color: colors.gray, marginBottom: 10 }}>Optional • Up to {MAX_SCREENSHOTS} screenshots</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {screenshots.map((item, index) => (
            <View key={`${item.uri}-${index}`} style={{ width: 90, height: 90, marginRight: 10, position: 'relative' }}>
              <Image source={{ uri: item.uri }} style={{ width: 90, height: 90, borderRadius: 12 }} />
              <TouchableOpacity onPress={() => removeScreenshot(index)} style={{ position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.darkGray, justifyContent: 'center', alignItems: 'center' }}>
                <Feather name="x" size={14} color={colors.white} />
              </TouchableOpacity>
            </View>
          ))}
          {screenshots.length < MAX_SCREENSHOTS && (
            <TouchableOpacity onPress={pickScreenshots} style={{ width: 90, height: 90, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.gray, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}>
              <Feather name="plus" size={28} color={colors.gray} />
              <Text style={{ fontSize: 11, color: colors.gray, marginTop: 2 }}>Add</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <TouchableOpacity style={[globalStyles.primaryBtn, { marginTop: 24 }]} onPress={handleSubmit} disabled={isSubmitting}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="mail" size={18} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={globalStyles.primaryBtnText}>{isSubmitting ? 'Submitting...' : 'Submit Issue via Email'}</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      <BottomNavBar navigation={navigation} active="Settings" />

      <Modal visible={isVerifying} transparent animationType="fade" onRequestClose={cancelVerification}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.white, borderRadius: 20, padding: 24, width: '85%', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 16, fontSize: 16, fontWeight: '600', textAlign: 'center', color: colors.black }}>Verifying your report was received…</Text>
            <Text style={{ marginTop: 8, fontSize: 13, color: colors.gray, textAlign: 'center' }}>Please wait while we confirm delivery.</Text>
            <TouchableOpacity onPress={cancelVerification} style={{ marginTop: 20, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: colors.lightGray }}>
              <Text style={{ color: colors.danger, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}