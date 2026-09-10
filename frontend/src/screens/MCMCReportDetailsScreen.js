// src/screens/MCMCReportDetailsScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { globalStyles, colors } from '../styles/globalStyles';

const DRAFT_KEY = 'temp_report_details';

export default function MCMCReportDetailsScreen({ route, navigation }) {
  const { form, result, videoUri, thumbnailUri, thumbnailFileName, incidentTimestamp, draftDetails, isDraft } = route.params || {};

  const [details, setDetails] = useState({
    fullName: '',
    mobileNumber: '',
    email: '',
    urlLink: '',
    userId: '',
    description: '',
    remedyAction: '',
    remedyOther: '',
    isPwd: false,
    isAcknowledged: false,
  });

  const [errors, setErrors] = useState({
    fullName: '',
    mobileNumber: '',
    email: '',
    userId: '',
    description: '',
    remedyAction: '',
    remedyOther: '',
    isAcknowledged: '',
  });

  const [showRemedyModal, setShowRemedyModal] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const isMounted = useRef(true);
  const saveTimeout = useRef(null);

  const remedyOptions = [
    'Access Restrictions',
    'Investigation',
    'Remove Content',
    'Request Information',
    'Other (please specify) i.e. Monitor.',
  ];

  useEffect(() => {
    const loadDraft = async () => {
      try {
        if (draftDetails && Object.keys(draftDetails).length > 0) {
          setDetails(prev => ({
            ...prev,
            ...draftDetails,
            isPwd: draftDetails.isPwd || false,
            isAcknowledged: draftDetails.isAcknowledged || false,
          }));
          setLoaded(true);
          return;
        }
        const saved = await AsyncStorage.getItem(DRAFT_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setDetails(prev => ({
            ...prev,
            ...parsed,
            isPwd: parsed.isPwd === true,
            isAcknowledged: parsed.isAcknowledged === true,
          }));
          console.log('Loaded draft from AsyncStorage:', parsed);
        } else {
          console.log('No draft found in AsyncStorage, using empty form');
        }
      } catch (e) {
        console.warn('Failed to load draft:', e);
      } finally {
        if (isMounted.current) {
          setLoaded(true);
        }
      }
    };
    loadDraft();

    return () => {
      isMounted.current = false;
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, [draftDetails]);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }
    saveTimeout.current = setTimeout(() => {
      if (isMounted.current) {
        AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(details))
          .then(() => console.log('Saved draft (debounced):', details))
          .catch(e => console.warn('Failed to save draft:', e));
      }
    }, 500);
  }, [details, loaded]);

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidMobile = (mobile) => {
    const mobileRegex = /^(\+?6?01)[0-46-9]-*[0-9]{7,8}$/;
    return mobileRegex.test(mobile.replace(/\s/g, ''));
  };

  const validateFields = () => {
    let isValid = true;
    const newErrors = {
      fullName: '',
      mobileNumber: '',
      email: '',
      userId: '',
      description: '',
      remedyAction: '',
      remedyOther: '',
      isAcknowledged: '',
    };

    if (!details.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
      isValid = false;
    }
    if (!details.mobileNumber.trim()) {
      newErrors.mobileNumber = 'Mobile number is required';
      isValid = false;
    } else if (!isValidMobile(details.mobileNumber)) {
      newErrors.mobileNumber = 'Please enter a valid Malaysian mobile number';
      isValid = false;
    }
    if (!details.email.trim()) {
      newErrors.email = 'Email address is required';
      isValid = false;
    } else if (!isValidEmail(details.email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }
    if (!details.userId.trim()) {
      newErrors.userId = 'User ID/Account is required';
      isValid = false;
    }
    if (!details.description.trim()) {
      newErrors.description = 'Complaint description is required';
      isValid = false;
    } else if (details.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
      isValid = false;
    }
    if (!details.remedyAction) {
      newErrors.remedyAction = 'Please select a remedy action';
      isValid = false;
    }
    if (details.remedyAction === 'Other (please specify) i.e. Monitor.' && !details.remedyOther.trim()) {
      newErrors.remedyOther = 'Please specify the remedy';
      isValid = false;
    }
    if (!details.isAcknowledged) {
      newErrors.isAcknowledged = 'You must acknowledge the terms to proceed';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = () => {
    if (validateFields()) {
      navigation.navigate('MCMCReportPreview', {
        form,
        details,
        result,
        videoUri,
        thumbnailUri,
        thumbnailFileName,
        incidentTimestamp,
        isDraft: true,
      });
    } else {
      Alert.alert(
        'Please Fix Errors',
        'Some fields need your attention. Please fill in all required fields correctly and acknowledge the terms.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleInputChange = (field, value) => {
    setDetails({ ...details, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
    if (field === 'isAcknowledged' && value) {
      setErrors({ ...errors, isAcknowledged: '' });
    }
    if (field === 'remedyAction' && value !== 'Other (please specify) i.e. Monitor.') {
      setErrors({ ...errors, remedyOther: '' });
    }
  };

  const handleSelectRemedy = (remedy) => {
    setDetails({
      ...details,
      remedyAction: remedy,
      remedyOther: remedy === 'Other (please specify) i.e. Monitor.' ? details.remedyOther : '',
    });
    if (errors.remedyAction) {
      setErrors({ ...errors, remedyAction: '' });
    }
    setShowRemedyModal(false);
  };

  const togglePwd = () => {
    setDetails({ ...details, isPwd: !details.isPwd });
  };

  const toggleAcknowledged = () => {
    const newVal = !details.isAcknowledged;
    setDetails({ ...details, isAcknowledged: newVal });
    if (newVal && errors.isAcknowledged) {
      setErrors({ ...errors, isAcknowledged: '' });
    }
  };

  // No beforeRemove listener – back goes to MCMCReportScreen without prompt

  return (
    <ScrollView
      style={globalStyles.container}
      contentContainerStyle={{ paddingTop: 24, paddingHorizontal: 20, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[globalStyles.headerOrange, { fontSize: 24 }]}>MCMC Report</Text>
      <Text style={[globalStyles.subtitle, { marginBottom: 12 }]}>Complaint Details</Text>

      <Text style={globalStyles.label}>Full Name *</Text>
      <TextInput
        style={[globalStyles.input, errors.fullName ? { borderColor: colors.danger, borderWidth: 2 } : {}]}
        placeholder="Enter your full name"
        placeholderTextColor={colors.gray}
        value={details.fullName}
        onChangeText={(text) => handleInputChange('fullName', text)}
      />
      {errors.fullName && <Text style={{ color: colors.danger, fontSize: 12, marginBottom: 8 }}>{errors.fullName}</Text>}

      <Text style={globalStyles.label}>Mobile Number *</Text>
      <TextInput
        style={[globalStyles.input, errors.mobileNumber ? { borderColor: colors.danger, borderWidth: 2 } : {}]}
        placeholder="012-3456789"
        placeholderTextColor={colors.gray}
        value={details.mobileNumber}
        onChangeText={(text) => handleInputChange('mobileNumber', text)}
        keyboardType="phone-pad"
      />
      {errors.mobileNumber && <Text style={{ color: colors.danger, fontSize: 12, marginBottom: 8 }}>{errors.mobileNumber}</Text>}

      <Text style={globalStyles.label}>Email Address *</Text>
      <TextInput
        style={[globalStyles.input, errors.email ? { borderColor: colors.danger, borderWidth: 2 } : {}]}
        placeholder="your.email@example.com"
        placeholderTextColor={colors.gray}
        value={details.email}
        onChangeText={(text) => handleInputChange('email', text)}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {errors.email && <Text style={{ color: colors.danger, fontSize: 12, marginBottom: 8 }}>{errors.email}</Text>}

      <Text style={globalStyles.label}>URL Link of the Content</Text>
      <TextInput
        style={globalStyles.input}
        placeholder="https://example.com/..."
        placeholderTextColor={colors.gray}
        value={details.urlLink}
        onChangeText={(text) => handleInputChange('urlLink', text)}
      />

      <Text style={globalStyles.label}>Impersonate User ID/Account *</Text>
      <TextInput
        style={[globalStyles.input, errors.userId ? { borderColor: colors.danger, borderWidth: 2 } : {}]}
        placeholder="@username or account ID"
        placeholderTextColor={colors.gray}
        value={details.userId}
        onChangeText={(text) => handleInputChange('userId', text)}
      />
      {errors.userId && <Text style={{ color: colors.danger, fontSize: 12, marginBottom: 8 }}>{errors.userId}</Text>}

      <Text style={globalStyles.label}>Complaint Description *</Text>
      <TextInput
        style={[globalStyles.inputMultiline, errors.description ? { borderColor: colors.danger, borderWidth: 2 } : {}]}
        placeholder="Describe the incident (minimum 10 characters)..."
        placeholderTextColor={colors.gray}
        value={details.description}
        onChangeText={(text) => handleInputChange('description', text)}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
      />
      {errors.description && <Text style={{ color: colors.danger, fontSize: 12, marginBottom: 8 }}>{errors.description}</Text>}

      <Text style={globalStyles.label}>Remedy Action *</Text>
      <TouchableOpacity
        style={[
          globalStyles.select,
          {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderColor: errors.remedyAction ? colors.danger : colors.lightGray,
            borderWidth: errors.remedyAction ? 2 : 1,
          },
        ]}
        onPress={() => setShowRemedyModal(true)}
      >
        <Text style={{ fontSize: 16, color: details.remedyAction ? colors.black : colors.gray }}>
          {details.remedyAction || 'Select remedy action...'}
        </Text>
        <Feather name="chevron-down" size={18} color={colors.primary} />
      </TouchableOpacity>
      {errors.remedyAction && <Text style={{ color: colors.danger, fontSize: 12, marginBottom: 8 }}>{errors.remedyAction}</Text>}

      {details.remedyAction === 'Other (please specify) i.e. Monitor.' && (
        <>
          <Text style={globalStyles.label}>Please Specify Other Remedy *</Text>
          <TextInput
            style={[globalStyles.input, errors.remedyOther ? { borderColor: colors.danger, borderWidth: 2 } : {}]}
            placeholder="Enter your specific remedy request..."
            placeholderTextColor={colors.gray}
            value={details.remedyOther}
            onChangeText={(text) => handleInputChange('remedyOther', text)}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          {errors.remedyOther && <Text style={{ color: colors.danger, fontSize: 12, marginBottom: 8 }}>{errors.remedyOther}</Text>}
        </>
      )}

      <View
        style={{
          backgroundColor: colors.lightGray + '40',
          borderRadius: 12,
          padding: 12,
          marginTop: 8,
          borderWidth: 1,
          borderColor: colors.lightGray,
        }}
      >
        <Text style={[globalStyles.label, { color: colors.primary, marginBottom: 4 }]}>
          Terms and Acknowledgment
        </Text>

        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 6 }}
          onPress={togglePwd}
          activeOpacity={0.7}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              borderWidth: 2,
              borderColor: details.isPwd ? colors.primary : colors.gray,
              backgroundColor: details.isPwd ? colors.primary : 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 10,
            }}
          >
            {details.isPwd && <Feather name="check" size={16} color={colors.white} />}
          </View>
          <Text style={{ fontSize: 14, color: colors.black, flex: 1 }}>
            Are you Person With Disabilities (PWD)?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 6 }}
          onPress={toggleAcknowledged}
          activeOpacity={0.7}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              borderWidth: 2,
              borderColor: details.isAcknowledged ? colors.primary : colors.gray,
              backgroundColor: details.isAcknowledged ? colors.primary : 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 10,
            }}
          >
            {details.isAcknowledged && <Feather name="check" size={16} color={colors.white} />}
          </View>
          <Text style={{ fontSize: 13, color: colors.black, flex: 1 }}>
            I acknowledge that all the information specified is correct. I agree to give my full commitment and cooperation to MCMC in any investigation action and shall allow for MCMC to review and verify all the information prior the acceptance or reject the complaint.
          </Text>
        </TouchableOpacity>
        {errors.isAcknowledged && (
          <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>{errors.isAcknowledged}</Text>
        )}
      </View>

      <View style={globalStyles.card}>
        <Text style={globalStyles.attachment}>Attachment Auto-Uploaded</Text>
        <Text style={globalStyles.attachmentDetail}>Detected video/screenshot</Text>
        <Text style={globalStyles.attachmentDetail}>Deepfake confidence: {result?.confidence || 0}%</Text>
      </View>

      <TouchableOpacity style={globalStyles.primaryBtn} onPress={handleNext}>
        <Text style={globalStyles.primaryBtnText}>Preview</Text>
      </TouchableOpacity>

      <Modal
        visible={showRemedyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRemedyModal(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setShowRemedyModal(false)}
        >
          <View
            style={{
              backgroundColor: colors.white,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: '60%',
              paddingBottom: 20,
            }}
          >
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.lightGray, alignSelf: 'center', marginVertical: 10 }} />
            <Text style={{ fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 8, color: colors.black }}>
              Select Remedy Action
            </Text>
            <FlatList
              data={remedyOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ paddingVertical: 14, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: colors.lightGray }}
                  onPress={() => handleSelectRemedy(item)}
                >
                  <Text style={{ fontSize: 15, color: item === details.remedyAction ? colors.primary : colors.black, fontWeight: item === details.remedyAction ? '700' : '400' }}>
                    {item === details.remedyAction && <Feather name="check" size={16} color={colors.primary} style={{ marginRight: 6 }} />}
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={{ marginTop: 10, paddingVertical: 12, alignItems: 'center', marginHorizontal: 16, borderRadius: 10, backgroundColor: colors.lightGray }}
              onPress={() => setShowRemedyModal(false)}
            >
              <Text style={{ color: colors.gray, fontSize: 15, fontWeight: '500' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}