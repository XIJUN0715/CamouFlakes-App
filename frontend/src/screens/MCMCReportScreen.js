// src/screens/MCMCReportScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { globalStyles, colors } from '../styles/globalStyles';
import { upsertReport } from '../utils/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- same getTargetScreen helper as above (copy it here) ---
const getTargetScreen = (action, navigation) => {
  if (!action) return null;
  if (action.type === 'NAVIGATE' || action.type === 'REPLACE') {
    const payload = action.payload || {};
    if (payload.name) return payload.name;
    if (payload.screen) return payload.screen;
    return null;
  }
  if (action.type === 'POP') {
    const state = navigation.getState();
    const routes = state.routes;
    const popCount = action.payload?.count || 1;
    const newIndex = routes.length - 1 - popCount;
    if (newIndex >= 0 && routes[newIndex]) {
      return routes[newIndex].name;
    }
    return null;
  }
  if (action.type === 'POP_TO_TOP') {
    const state = navigation.getState();
    const firstRoute = state.routes[0];
    return firstRoute?.name || null;
  }
  return null;
};
// ----------------------------------------------------------

const CATEGORY_OPTIONS = [
  'Bullying or Harassment',
  'Child Pornography',
  'Child Sexual Exploitation',
  'Copyright/Trademark Infringement',
  'Defamation (Organization)',
  'Defamation (Personal)',
  'Disclosure of Official Secrets Documents',
  'Dissemination of Intimate Videos / Photos',
  'Dissemination of Intimate Videos / Photos (Child)',
  'Fake Account / Website, Impersonation',
  'False News / Content / Misleading',
  'Gambling',
  'Hacking',
  'Harassment (Menacing)',
  'Harassment (Obscene - Child)',
  'Harassment (Obscene)',
  'Hate Speech (Racial)',
  'Hate Speech (Religion)',
  'Hate Speech (Royalty / Royal Institution)',
  'Illegal Advertisement / Promotions',
  'Illegal Products / Services',
  'Indecent',
  'Misuse of Personal Data',
  'Pornography',
  'Prostitution',
  'Religious Deviation',
  'Satire / Parody',
  'Scam',
  'Violent Content',
];

const PLATFORM_OPTIONS = [
  'Facebook', 'Instagram', 'LinkedIn', 'MeWe', 'Reddit', 'Skype',
  'Snapchat', 'Tagged', 'Threads', 'TikTok', 'Tumblr', 'Twitter', 'Weibo', 'Youtube',
];

const FIXED_COMPLAINT_FOR = 'Myself';
const FIXED_MCMC_RELATED = 'Online Content';
const FIXED_TYPE_OF_SERVICE = 'Social Media';

export default function MCMCReportScreen({ route, navigation }) {
  const { result, videoUri, thumbnailUri, incidentTimestamp, draftReport } = route.params || {};

  const isDraft = !!draftReport;
  const reportData = draftReport || {};

  const confidence = reportData.confidence || result?.confidence || 0;
  const isFake = reportData.isFake ?? result?.isFake ?? false;
  const initialCategory = reportData.category || '';
  const initialPlatform = reportData.platform || '';
  const initialThumbnail = reportData.thumbnailUri || thumbnailUri || null;
  const initialVideoUri = reportData.videoUri || videoUri || null;
  const initialIncidentTimestamp = reportData.incidentTimestamp || incidentTimestamp || null;

  const [category, setCategory] = useState(initialCategory);
  const [platform, setPlatform] = useState(initialPlatform);
  const [activeField, setActiveField] = useState(null);
  const [errors, setErrors] = useState({ category: '', platform: '' });
  const hasSavedDraftRef = useRef(false);

  const pickerOptions = activeField === 'category' ? CATEGORY_OPTIONS
    : activeField === 'platform' ? PLATFORM_OPTIONS
    : [];
  const pickerValue = activeField === 'category' ? category : platform;
  const pickerTitle = activeField === 'category' ? 'Select Category' : 'Select Platform';

  const handleSelect = (value) => {
    if (activeField === 'category') {
      setCategory(value);
      setErrors({ ...errors, category: '' });
    } else if (activeField === 'platform') {
      setPlatform(value);
      setErrors({ ...errors, platform: '' });
    }
    setActiveField(null);
  };

  const validateFields = () => {
    let isValid = true;
    const newErrors = { category: '', platform: '' };
    if (!category) {
      newErrors.category = 'Please select a category';
      isValid = false;
    }
    if (!platform) {
      newErrors.platform = 'Please select a platform';
      isValid = false;
    }
    setErrors(newErrors);
    return isValid;
  };

  const handleNext = () => {
    if (!validateFields()) {
      Alert.alert(
        'Please Fix Errors',
        'Please select both Category and Platform before proceeding.',
        [{ text: 'OK' }]
      );
      return;
    }

    const form = {
      complaintFor: FIXED_COMPLAINT_FOR,
      mcmcRelated: FIXED_MCMC_RELATED,
      category,
      typeOfService: FIXED_TYPE_OF_SERVICE,
      platform,
    };

    const detailsData = {
      fullName: reportData.fullName || '',
      mobileNumber: reportData.mobileNumber || '',
      email: reportData.email || '',
      urlLink: reportData.urlLink || '',
      userId: reportData.userId || '',
      description: reportData.description || '',
      remedyAction: reportData.remedyAction || '',
      remedyOther: reportData.remedyOther || '',
      isPwd: reportData.isPwd || false,
      isAcknowledged: reportData.isAcknowledged || false,
    };

    navigation.navigate('MCMCReportDetails', {
      form,
      result: { confidence, isFake },
      videoUri: initialVideoUri,
      thumbnailUri: initialThumbnail,
      incidentTimestamp: initialIncidentTimestamp,
      draftDetails: isDraft ? detailsData : undefined,
      isDraft: isDraft,
    });
  };

  const saveDraftAndExit = async () => {
    try {
      const form = {
        complaintFor: FIXED_COMPLAINT_FOR,
        mcmcRelated: FIXED_MCMC_RELATED,
        category,
        typeOfService: FIXED_TYPE_OF_SERVICE,
        platform,
      };
      await upsertReport({
        reportId: `DRAFT-${Date.now()}`,
        status: 'Draft',
        platform: form.platform,
        category: form.category,
        confidence,
        isFake,
        videoUri: initialVideoUri,
        thumbnailUri: initialThumbnail,
        incidentTimestamp: initialIncidentTimestamp,
        fullName: reportData.fullName || '',
        mobileNumber: reportData.mobileNumber || '',
        email: reportData.email || '',
        userId: reportData.userId || '',
        urlLink: reportData.urlLink || '',
        description: reportData.description || '',
        remedyAction: reportData.remedyAction || '',
        remedyOther: reportData.remedyOther || '',
        isPwd: reportData.isPwd || false,
        isAcknowledged: reportData.isAcknowledged || false,
      });
      hasSavedDraftRef.current = true;
      await AsyncStorage.removeItem('temp_report_details').catch(() => {});
      navigation.replace('Reports');
    } catch (e) {
      console.error('Failed to save draft:', e);
      Alert.alert('Error', 'Could not save draft. Please try again.');
    }
  };

  // ✅ Updated beforeRemove listener using getTargetScreen
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (hasSavedDraftRef.current) return;

      const targetScreen = getTargetScreen(e.data.action, navigation);

      if (targetScreen === 'Home' || targetScreen === 'Reports') {
        return;
      }

      e.preventDefault();
      Alert.alert(
        'Save as Draft?',
        'Do you want to save this report as a draft before leaving? You can continue it later from the Reports screen.',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Save and Exit', onPress: saveDraftAndExit },
        ]
      );
    });
    return unsubscribe;
  }, [navigation]);

  // ... rest of the component (FixedRow, DropdownRow, render) unchanged
  // Keep everything else as is.

  const FixedRow = ({ label, value }) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={globalStyles.label}>{label}</Text>
      <View style={[globalStyles.select, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <Text style={{ fontSize: 16, color: colors.black }}>{value}</Text>
        <Text style={{ color: colors.gray, fontSize: 12 }}>Fixed</Text>
      </View>
    </View>
  );

  const DropdownRow = ({ label, value, onPress, error }) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={globalStyles.label}>{label} *</Text>
      <TouchableOpacity
        style={[
          globalStyles.select,
          {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderColor: error ? colors.danger : colors.lightGray,
            borderWidth: error ? 2 : 1,
          },
        ]}
        onPress={onPress}
      >
        <Text
          style={{
            fontSize: 16,
            color: value ? colors.black : colors.gray,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {value || 'Choose...'}
        </Text>
        <Feather name="chevron-down" size={18} color={colors.primary} />
      </TouchableOpacity>
      {error && <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>{error}</Text>}
    </View>
  );

  return (
    <ScrollView
      style={globalStyles.container}
      contentContainerStyle={{ paddingTop: 24, paddingHorizontal: 20, paddingBottom: 40 }}
    >
      <Text style={[globalStyles.headerOrange, { fontSize: 24 }]}>MCMC Report</Text>
      <Text style={[globalStyles.subtitle, { marginBottom: 16 }]}>
        {isDraft ? 'Draft Report' : (isFake ? 'Deepfake Detected' : 'Genuine Video')} – {confidence}% Confidence
      </Text>

      <FixedRow label="This complaint is for" value={FIXED_COMPLAINT_FOR} />
      <FixedRow label="MCMC Related Complaints" value={FIXED_MCMC_RELATED} />
      <DropdownRow
        label="Category"
        value={category}
        onPress={() => setActiveField('category')}
        error={errors.category}
      />
      <FixedRow label="Type of Service" value={FIXED_TYPE_OF_SERVICE} />
      <DropdownRow
        label="Platform"
        value={platform}
        onPress={() => setActiveField('platform')}
        error={errors.platform}
      />

      <TouchableOpacity style={[globalStyles.primaryBtn, { marginTop: 8 }]} onPress={handleNext}>
        <Text style={globalStyles.primaryBtnText}>Next</Text>
      </TouchableOpacity>

      <Modal visible={activeField !== null} transparent animationType="slide" onRequestClose={() => setActiveField(null)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setActiveField(null)}
        >
          <View style={{ backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', paddingBottom: 20 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.lightGray, alignSelf: 'center', marginVertical: 10 }} />
            <Text style={{ fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 8, color: colors.black }}>{pickerTitle}</Text>
            <FlatList
              data={pickerOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ paddingVertical: 14, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: colors.lightGray }}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={{ fontSize: 15, color: item === pickerValue ? colors.primary : colors.black, fontWeight: item === pickerValue ? '700' : '400' }}>
                    {item === pickerValue && <Feather name="check" size={16} color={colors.primary} style={{ marginRight: 6 }} />}
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}