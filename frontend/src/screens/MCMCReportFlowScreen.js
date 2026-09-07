// src/screens/MCMCReportFlowScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { globalStyles, colors } from '../styles/globalStyles';
import { savePDFToDownloads, sharePDF, validateReportData } from '../utils/pdfGenerator';
import { addNotification } from '../utils/notifications';
import { upsertReport } from '../utils/database';
import { formatIncidentTimestamp } from '../utils/reference';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Extract the destination screen name from a navigation action.
 * Supports NAVIGATE, REPLACE, POP, POP_TO_TOP.
 */
const getTargetScreen = (action, navigation) => {
  if (!action) return null;

  // NAVIGATE / REPLACE
  if (action.type === 'NAVIGATE' || action.type === 'REPLACE') {
    const payload = action.payload || {};
    // Direct name
    if (payload.name) return payload.name;
    // Nested navigation (e.g., tab screens)
    if (payload.screen) return payload.screen;
    return null;
  }

  // POP – go back N screens
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

  // POP_TO_TOP – go to the first screen in the stack
  if (action.type === 'POP_TO_TOP') {
    const state = navigation.getState();
    const firstRoute = state.routes[0];
    return firstRoute?.name || null;
  }

  return null;
};

export default function MCMCReportFlowScreen({ route, navigation }) {
  const {
    form,
    details,
    result: resultParam,
    reportId,
    videoUri,
    thumbnailUri,
    incidentTimestamp,
    isFake: isFakeParam,
    confidence: confidenceParam,
  } = route.params || {};

  const result = resultParam || {
    isFake: isFakeParam ?? false,
    confidence: confidenceParam ?? 0,
  };

  const [step, setStep] = useState(0);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [savedFileName, setSavedFileName] = useState(null);
  const [pdfLocalUri, setPdfLocalUri] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showSaveSheet, setShowSaveSheet] = useState(false);

  const hasSavedDraftRef = useRef(false);

  const isFake = result?.isFake ?? false;
  const confidence = result?.confidence ?? 0;
  const formattedIncident = formatIncidentTimestamp(incidentTimestamp);

  const prevReportIdRef = useRef(reportId);
  useEffect(() => {
    if (prevReportIdRef.current !== reportId) {
      prevReportIdRef.current = reportId;
      setPdfGenerated(false);
      setSavedFileName(null);
      setPdfLocalUri(null);
      setStep(0);
    }
  }, [reportId]);

  useEffect(() => {
    if (reportId && form && details) {
      upsertReport({
        reportId,
        status: 'Draft',
        platform: form?.platform,
        category: form?.category,
        confidence,
        isFake,
        fullName: details?.fullName,
        incidentTimestamp,
        thumbnailUri: thumbnailUri || null,
        videoUri: videoUri || null,
        userId: details?.userId,
        urlLink: details?.urlLink,
        description: details?.description,
        remedyAction: details?.remedyAction,
        remedyOther: details?.remedyOther,
        mobileNumber: details?.mobileNumber,
        email: details?.email,
        isPwd: details?.isPwd || false,
        isAcknowledged: details?.isAcknowledged || false,
      }).catch(e => console.error('Draft save failed:', e));
    }
  }, [reportId, form, details, thumbnailUri, videoUri]);

  const saveDraftAndExit = async () => {
    try {
      await upsertReport({
        reportId: reportId || `DRAFT-${Date.now()}`,
        status: 'Draft',
        platform: form?.platform || '',
        category: form?.category || '',
        confidence,
        isFake,
        fullName: details?.fullName || '',
        mobileNumber: details?.mobileNumber || '',
        email: details?.email || '',
        urlLink: details?.urlLink || '',
        userId: details?.userId || '',
        description: details?.description || '',
        remedyAction: details?.remedyAction || '',
        remedyOther: details?.remedyOther || '',
        isPwd: details?.isPwd || false,
        isAcknowledged: details?.isAcknowledged || false,
        videoUri: videoUri || null,
        thumbnailUri: thumbnailUri || null,
        incidentTimestamp,
      });
      hasSavedDraftRef.current = true;
      await AsyncStorage.removeItem('temp_report_details').catch(() => {});
      navigation.replace('Reports');
    } catch (e) {
      console.error('Failed to save draft:', e);
      Alert.alert('Error', 'Could not save draft. Please try again.');
    }
  };

  // Intercept back navigation – checks target screen to skip prompt
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (hasSavedDraftRef.current) return;

      const targetScreen = getTargetScreen(e.data.action, navigation);

      // Skip prompt if navigating to Home or Reports
      if (targetScreen === 'Home' || targetScreen === 'Reports') {
        return;
      }

      // Otherwise, show the draft prompt
      e.preventDefault();
      Alert.alert(
        'Save as Draft?',
        'Your report will be saved as a draft. You can continue it later from the Reports screen.',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Save and Exit', onPress: saveDraftAndExit },
        ]
      );
    });
    return unsubscribe;
  }, [navigation]);

  // ... rest of the component (render functions, etc.) remains unchanged.
  // I've omitted the renderStep0, renderStep1, and the rest of the JSX for brevity
  // but they are exactly as you had them.
  // Please copy the full component from your original file and replace only the
  // beforeRemove listener and add the getTargetScreen helper above the component.

  // For completeness, here is the rest of the component (same as before):
  // (In your actual file, keep the existing render logic – only the listener changes)

  const openSaveOptions = () => {
    const validationErrors = validateReportData({ form, details });
    if (validationErrors.length > 0) {
      Alert.alert('Incomplete Report', `Please fill in all required fields:\n\n• ${validationErrors.join('\n• ')}`);
      return;
    }
    setShowSaveSheet(true);
  };

  const handleSaveToDownloads = async () => {
    setShowSaveSheet(false);
    setIsGenerating(true);
    try {
      const outcome = await savePDFToDownloads({ reportId, form, details, result, thumbnailUri, incidentTimestamp });
      if (outcome.success) {
        setPdfGenerated(true);
        setSavedFileName(outcome.fileName || null);
        setPdfLocalUri(outcome.localUri || null);
        await addNotification('PDF Saved', `Report ${reportId} saved as ${outcome.fileName || 'PDF'}.`, 'success');
        Alert.alert(
          'Success',
          outcome.viaShare
            ? 'PDF ready — pick where to save it from the share sheet.'
            : `PDF saved as ${outcome.fileName}`
        );
      } else if (outcome.cancelled) {
        Alert.alert('Folder Access Needed', "Pick a folder (e.g. Downloads) to save into — you'll only be asked once.");
      } else {
        Alert.alert('Error', `Failed to save PDF:\n${outcome.error || 'Unknown error'}`);
        console.error('PDF save error:', outcome.error);
      }
    } catch (error) {
      console.error('Unexpected error during PDF save:', error);
      Alert.alert('Error', `Unexpected error:\n${error.message || String(error)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareInstead = async () => {
    setShowSaveSheet(false);
    setIsSharing(true);
    try {
      const shareResult = await sharePDF({ reportId, form, details, result, thumbnailUri, incidentTimestamp });
      if (shareResult.success) {
        setPdfGenerated(true);
        setPdfLocalUri(shareResult.localUri || null);
        setSavedFileName(null);
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to open the share sheet.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleContinue = () => {
    if (!pdfGenerated) {
      Alert.alert('Please save the PDF first.');
      return;
    }
    setStep(1);
  };

  const openMCMCComplaint = () => {
    const complaintText = `
MCMC Complaint Report
---------------------
Report ID: ${reportId}
Incident Occurred: ${formattedIncident || 'N/A'}
Date: ${new Date().toLocaleString()}

Detection Result: ${isFake ? 'DEEPFAKE DETECTED' : 'GENUINE'}
Confidence: ${confidence}%

User Details:
- Full Name: ${details?.fullName || 'N/A'}
- Mobile: ${details?.mobileNumber || 'N/A'}
- Email: ${details?.email || 'N/A'}

Complaint Details:
- Complaint For: ${form?.complaintFor || 'Myself'}
- Category: ${form?.category || 'N/A'}
- Platform: ${form?.platform || 'N/A'}
- User ID/Account: ${details?.userId || 'N/A'}
- URL Link: ${details?.urlLink || 'Not provided'}

Description: ${details?.description || 'N/A'}

Remedy Requested: ${details?.remedyAction || 'N/A'}

This report was generated by CamouFlakes AI Deepfake Detection App.
`;
    navigation.navigate('MCMCWebView', {
      form,
      details,
      result,
      reportId,
      videoUri,
      thumbnailUri,
      incidentTimestamp,
      mode: 'complaint',
      preFilledText: complaintText,
      pdfLocalUri,
      savedFileName,
    });
  };

  const handleAccountCheck = (hasAccount) => {
    if (hasAccount) {
      openMCMCComplaint();
    } else {
      navigation.navigate('MCMCWebView', {
        form,
        details,
        result,
        reportId,
        videoUri,
        thumbnailUri,
        incidentTimestamp,
        mode: 'register',
        pdfLocalUri,
        savedFileName,
      });
    }
  };

  const renderStep1 = () => (
    <View style={{ alignItems: 'center', paddingTop: 20 }}>
      <Text style={[globalStyles.headerOrange, { fontSize: 24 }]}>MCMC Account</Text>
      <Text style={[globalStyles.subtitle, { textAlign: 'center' }]}>
        Step 2: Do you have an MCMC account?
      </Text>
      <View style={globalStyles.card}>
        <Text style={{ textAlign: 'center', color: colors.gray }}>
          If you already have an account, you'll go straight to the complaint
          form — pre-filled automatically.
          {'\n\n'}
          If not, we'll open sign-up with your details pre-filled, then continue
          straight into the complaint form as soon as you're registered.
        </Text>
      </View>
      <TouchableOpacity
        style={[globalStyles.primaryBtn, { width: '100%', marginTop: 16 }]}
        onPress={() => handleAccountCheck(true)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="check-circle" size={18} color={colors.white} style={{ marginRight: 8 }} />
          <Text style={globalStyles.primaryBtnText}>I have an account</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={[globalStyles.outlineBtn, { width: '100%', marginTop: 8 }]}
        onPress={() => handleAccountCheck(false)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="user-plus" size={18} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={globalStyles.outlineBtnText}>I need to sign up</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderStep0 = () => (
    <View style={{ alignItems: 'center', paddingTop: 20 }}>
      <Text style={[globalStyles.headerOrange, { fontSize: 24 }]}>MCMC Report</Text>
      <Text style={[globalStyles.subtitle, { textAlign: 'center' }]}>
        Step 1: Save your complaint report as a PDF
      </Text>
      <View style={[globalStyles.card, { width: '100%', marginTop: 16 }]}>
        <Text style={globalStyles.label}>Report Summary</Text>
        <View style={{ marginTop: 8 }}>
          <Text style={{ color: colors.black }}>Report ID: <Text style={{ fontWeight: '600' }}>{reportId}</Text></Text>
          {formattedIncident && <Text style={{ color: colors.black, marginTop: 4 }}>Incident: <Text style={{ fontWeight: '500' }}>{formattedIncident}</Text></Text>}
          <Text style={{ color: colors.black, marginTop: 4 }}>Platform: <Text style={{ fontWeight: '500' }}>{form?.platform || 'N/A'}</Text></Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Feather name={isFake ? 'alert-triangle' : 'check-circle'} size={14} color={isFake ? colors.danger : colors.success} style={{ marginRight: 6 }} />
            <Text style={{ color: colors.black }}>Result: <Text style={{ fontWeight: '600', color: isFake ? colors.danger : colors.success }}>{isFake ? 'Deepfake' : 'Genuine'}</Text></Text>
          </View>
          <Text style={{ color: colors.black, marginTop: 4 }}>Confidence: <Text style={{ fontWeight: '500' }}>{confidence}%</Text></Text>
        </View>
      </View>
      <TouchableOpacity
        style={[globalStyles.primaryBtn, { width: '100%', marginTop: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]}
        onPress={openSaveOptions}
        disabled={isGenerating || isSharing}
      >
        {(isGenerating || isSharing) ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <>
            <Feather name={pdfGenerated ? 'check-circle' : 'download'} size={18} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={globalStyles.primaryBtnText}>{pdfGenerated ? 'Saved — Save Again?' : 'Save PDF Report'}</Text>
          </>
        )}
      </TouchableOpacity>
      {pdfGenerated && (
        <Text style={{ color: colors.gray, fontSize: 12, marginTop: 6 }}>
          {savedFileName ? `Saved as ${savedFileName}` : 'Sent successfully via share sheet!'}
        </Text>
      )}
      <TouchableOpacity
        style={[globalStyles.outlineBtn, { width: '100%', marginTop: 16, opacity: pdfGenerated ? 1 : 0.5 }]}
        onPress={handleContinue}
        disabled={!pdfGenerated}
      >
        <Text style={globalStyles.outlineBtnText}>
          {pdfGenerated ? 'Continue to Reporting' : 'Please save PDF first'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showSaveSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSaveSheet(false)}
      >
        <TouchableOpacity
          style={sheetStyles.backdrop}
          activeOpacity={1}
          onPress={() => setShowSaveSheet(false)}
        />
        <View style={sheetStyles.sheet}>
          <View style={sheetStyles.handle} />
          <Text style={sheetStyles.title}>Save your report</Text>
          <TouchableOpacity style={sheetStyles.option} onPress={handleSaveToDownloads}>
            <Feather name="download" size={24} color={colors.primary} style={sheetStyles.optionIcon} />
            <View style={{ flex: 1 }}>
              <Text style={sheetStyles.optionTitle}>Save to Downloads</Text>
              <Text style={sheetStyles.optionSubtitle}>
                Keeps it on this device. You'll pick the folder once — every report after that saves instantly.
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={sheetStyles.option} onPress={handleShareInstead}>
            <Feather name="share-2" size={24} color={colors.primary} style={sheetStyles.optionIcon} />
            <View style={{ flex: 1 }}>
              <Text style={sheetStyles.optionTitle}>Share to another app</Text>
              <Text style={sheetStyles.optionSubtitle}>
                Send it to Google Drive, WhatsApp, Email, or any app that opens PDFs.
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={sheetStyles.cancel} onPress={() => setShowSaveSheet(false)}>
            <Text style={sheetStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={globalStyles.container}
        contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 20, paddingBottom: 40 }}
      >
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
      </ScrollView>

      <View style={{
        flexDirection: 'row',
        paddingVertical: 14,
        paddingHorizontal: 8,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderColor: colors.lightGray,
        paddingBottom: 20,
      }}>
        <TouchableOpacity
          style={{ flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={18} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={{ color: colors.primary, fontWeight: '500' }}>Go Back</Text>
        </TouchableOpacity>

        <View style={{ width: 1, backgroundColor: colors.lightGray, marginHorizontal: 4 }} />

        <TouchableOpacity
          style={{ flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
          onPress={() => {
            const url = step === 0
              ? 'https://aduan.mcmc.gov.my/#/home/newcase'
              : 'https://aduan.mcmc.gov.my/#/public/register';
            Linking.openURL(url);
          }}
        >
          <Feather name="globe" size={18} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={{ color: colors.primary }}>Browser</Text>
        </TouchableOpacity>

        <View style={{ width: 1, backgroundColor: colors.lightGray, marginHorizontal: 4 }} />

        {step === 0 ? (
          <TouchableOpacity
            style={{ flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
            onPress={handleContinue}
            disabled={!pdfGenerated}
          >
            <Feather name="arrow-right" size={18} color={pdfGenerated ? colors.primary : colors.gray} style={{ marginRight: 6 }} />
            <Text style={{ color: pdfGenerated ? colors.primary : colors.gray, fontWeight: '500' }}>
              {pdfGenerated ? 'Continue' : 'Save First'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={{ flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
            onPress={() => {
              if (step === 1) {
                navigation.navigate('MCMCWebView', {
                  form,
                  details,
                  result,
                  reportId,
                  videoUri,
                  thumbnailUri,
                  incidentTimestamp,
                  mode: 'complaint',
                });
              }
            }}
          >
            <Feather name="check-circle" size={18} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Complete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const sheetStyles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDDDDD',
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
    color: '#222',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionIcon: {
    marginRight: 14,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
  },
  optionSubtitle: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  cancel: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelText: {
    fontSize: 15,
    color: '#999',
    fontWeight: '500',
  },
});