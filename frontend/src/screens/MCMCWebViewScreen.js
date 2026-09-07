// src/screens/MCMCWebViewScreen.js
import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { globalStyles, colors } from '../styles/globalStyles';
import MCMCIcon from '../../assets/mcmc-logo.png';
import {
  buildRegisterAutofillScript,
  buildComplaintAutofillScript,
  buildFileInputWatcherScript,
  buildSaveButtonWatcherScript,
  buildComplaintFieldsPhase1,
  buildComplaintFieldsPhase2,
  buildRegisterFields,
} from '../utils/webViewAutofill';

const REGISTER_URL = 'https://aduan.mcmc.gov.my/#/public/register';
const NEW_CASE_URL = 'https://aduan.mcmc.gov.my/#/home/newcase';

export default function MCMCWebViewScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const {
    form,
    details,
    result,
    reportId,
    videoUri,
    thumbnailUri,
    mode: initialMode = 'complaint',
  } = route.params || {};

  const [mode, setMode] = useState(initialMode);
  const [targetUri] = useState(initialMode === 'register' ? REGISTER_URL : NEW_CASE_URL);
  const webViewRef = useRef(null);
  const currentUrlRef = useRef(targetUri);

  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);
  const [autofillStatus, setAutofillStatus] = useState(null);
  const [stepMessage, setStepMessage] = useState(null);
  const [showFileHelper, setShowFileHelper] = useState(false);
  const [mcmcCaseId, setMcmcCaseId] = useState(null);

  const isRegisterMode = mode === 'register';
  const pdfFileName = reportId ? `${reportId}.pdf` : null;
  const screenshotFileName = thumbnailUri ? thumbnailUri.split('/').pop() : null;

  // Set status bar to white to prevent transparency clash
  useEffect(() => {
    if (Platform.OS === 'android') {
      try {
        StatusBar.setBackgroundColor('#FFFFFF');
        StatusBar.setBarStyle('dark-content');
        StatusBar.setTranslucent(false);
      } catch (e) {
        // Ignore
      }
    }
    return () => {
      if (Platform.OS === 'android') {
        try {
          StatusBar.setBackgroundColor('transparent');
          StatusBar.setBarStyle('dark-content');
          StatusBar.setTranslucent(true);
        } catch (e) {
          // Ignore
        }
      }
    };
  }, []);

  const runAutofillForMode = useCallback((forMode) => {
    if (!webViewRef.current) return;
    if (forMode === 'register') {
      const fields = buildRegisterFields({ details });
      if (fields.length === 0) return;
      webViewRef.current.injectJavaScript(buildRegisterAutofillScript(fields));
    } else {
      const phase1 = buildComplaintFieldsPhase1({ form });
      const phase2 = buildComplaintFieldsPhase2({ details });
      if (phase1.length === 0 && phase2.length === 0) return;
      webViewRef.current.injectJavaScript(buildComplaintAutofillScript(phase1, phase2));
    }
  }, [form, details]);

  const runAutofill = useCallback(() => {
    runAutofillForMode(mode);
  }, [runAutofillForMode, mode]);

  const goToNewCaseAndAutofill = useCallback((message) => {
    setAutofillStatus(null);
    setStepMessage(message || 'Returning to the complaint form…');
    setShowFileHelper(false);
    setMode('complaint');
    webViewRef.current?.injectJavaScript(
      `window.location.href = ${JSON.stringify(NEW_CASE_URL)}; true;`
    );
    setTimeout(() => runAutofillForMode('complaint'), 1000);
    setTimeout(() => runAutofillForMode('complaint'), 2400);
  }, [runAutofillForMode]);

  const handleLoadEnd = () => {
    setLoading(false);
    setHasLoadedOnce(true);
    webViewRef.current?.injectJavaScript(buildFileInputWatcherScript());
    webViewRef.current?.injectJavaScript(buildSaveButtonWatcherScript());

    webViewRef.current?.injectJavaScript(`
      (function() {
        function post(payload) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          }
        }
        function scan() {
          var bodyText = document.body ? document.body.innerText : '';
          var match = bodyText.match(/[A-Z]{2}\\d{6}-\\d{5}/);
          if (match) {
            post({ type: 'CF_CASE_ID', caseId: match[0] });
            return true;
          }
          return false;
        }
        if (scan()) return;
        var observer = new MutationObserver(function() {
          scan();
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      })();
    `);

    setTimeout(runAutofill, 900);
  };

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      switch (data.type) {
        case 'CF_AUTOFILL_DONE':
          setAutofillStatus((prev) => ({
            filled: [...(prev && prev.filled ? prev.filled : []), ...data.done],
            missed: [...(prev && prev.missed ? prev.missed : []), ...data.failed],
          }));
          setStepMessage(null);
          break;
        case 'CF_NEXT_CLICKED':
          setStepMessage('Moved to Additional Details…');
          break;
        case 'CF_NEXT_BLOCKED':
          setStepMessage('Could not move to page 2 — check required fields.');
          break;
        case 'CF_NEXT_NOT_FOUND':
          setStepMessage("Couldn't find the Next button — please tap it yourself.");
          break;
        case 'CF_CASE_ID':
          setMcmcCaseId(data.caseId);
          console.log('Captured MCMC Case ID:', data.caseId);
          break;
        case 'CF_SAVE_CLICKED':
          if (!currentUrlRef.current || !currentUrlRef.current.includes('/home/newcase')) {
            goToNewCaseAndAutofill('Profile saved — returning to the complaint form…');
          }
          break;
        case 'cf_autofill_error':
          setAutofillStatus('error');
          break;
        case 'cf_file_input_tapped':
          setShowFileHelper(true);
          break;
        default:
          break;
      }
    } catch (_) {}
  };

  const handleOpenBrowser = () => {
    Linking.openURL(isRegisterMode ? REGISTER_URL : NEW_CASE_URL);
  };

  const handleContinueReportingPress = () => {
    goToNewCaseAndAutofill('Returning to the complaint form…');
  };

  const handleNavigationStateChange = (navState) => {
    currentUrlRef.current = navState.url;

    if (isRegisterMode && !registered && navState.url && !navState.url.includes('/register')) {
      if (navState.url.includes('/home') || navState.url.includes('/dashboard') || navState.url.includes('/user')) {
        setRegistered(true);
        setJustRegistered(true);
        setTimeout(() => setJustRegistered(false), 5000);
        setTimeout(() => {
          goToNewCaseAndAutofill('Registered! Filling in your details…');
        }, 1400);
      }
    }
  };

  const handleFinish = () => {
    navigation.replace('ReportSubmitted', {
      form,
      details,
      result,
      reportId,
      thumbnailUri,
      mcmcCaseId,
    });
  };

  const renderAutofillStatus = () => {
    if (!hasLoadedOnce) return null;

    const isError = autofillStatus === 'error';
    const hasResult = autofillStatus && typeof autofillStatus === 'object';
    const hasMissed = hasResult && autofillStatus.missed && autofillStatus.missed.length > 0;

    let label;
    let bg;
    if (isError) {
      label = 'Auto-fill error — tap to retry';
      bg = colors.danger;
    } else if (!hasResult) {
      label = stepMessage || 'Tap to auto-fill this page';
      bg = colors.primary;
    } else if (hasMissed) {
      label = `Auto-filled ${autofillStatus.filled.length} — check: ${autofillStatus.missed.join(', ')}`;
      bg = colors.primary;
    } else {
      label = `Auto-fill complete${stepMessage ? ' – ' + stepMessage : ''}`;
      bg = colors.success;
    }

    const topInset = insets.top || (Platform.OS === 'android' ? StatusBar.currentHeight || 40 : 44);

    return (
      <View
        style={{
          position: 'absolute',
          top: justRegistered ? topInset + 34 : topInset,
          left: 0,
          right: 0,
          backgroundColor: 'white',
          paddingVertical: 2,
          paddingHorizontal: 2,
          zIndex: 10,
        }}
      >
        <TouchableOpacity
          onPress={runAutofill}
          activeOpacity={0.85}
          style={{
            backgroundColor: bg,
            paddingVertical: 8,
            paddingHorizontal: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: 6,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 12, flex: 1 }}>{label}</Text>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', marginLeft: 8 }}>
            Tap to fill
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Calculate the top offset for WebView to start below the autofill status bar
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 40 : 44;
  // Autofill status bar height: ~50px (padding + TouchableOpacity height)
  const autofillBarHeight = hasLoadedOnce ? 50 : 0;
  const webViewTopOffset = statusBarHeight + autofillBarHeight + (justRegistered ? 34 : 0);

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={{ flex: 1 }}>
        {justRegistered && !isRegisterMode && (
          <View style={{ backgroundColor: colors.success, padding: 10, marginTop: 0 }}>
            <Text style={{ color: '#fff', textAlign: 'center', fontSize: 12 }}>
              Registered! Opening the complaint form and filling in your details…
            </Text>
          </View>
        )}

        {/* WebView with top padding to push it below the autofill status bar */}
        <View style={{ flex: 1, paddingTop: webViewTopOffset }}>
          <WebView
            ref={webViewRef}
            source={{ uri: targetUri }}
            onLoadEnd={handleLoadEnd}
            onNavigationStateChange={handleNavigationStateChange}
            onMessage={handleMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            androidHardwareAccelerationDisabled={true}
            renderLoading={() => (
              <View
                style={[
                  globalStyles.centered,
                  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
                ]}
              >
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[globalStyles.subtitle, { marginTop: 16 }]}>
                  {isRegisterMode ? 'Loading Registration...' : 'Loading MCMC Portal...'}
                </Text>
              </View>
            )}
          />
        </View>

        {renderAutofillStatus()}

        {showFileHelper && (pdfFileName || screenshotFileName) && (
          <View
            style={{
              position: 'absolute',
              bottom: 80,
              left: 16,
              right: 16,
              backgroundColor: colors.white,
              borderRadius: 12,
              padding: 14,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="paperclip" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={{ fontWeight: '700', color: colors.primary, fontSize: 13 }}>
                  Two files to attach
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowFileHelper(false)}>
                <Feather name="x" size={16} color={colors.gray} />
              </TouchableOpacity>
            </View>
            {screenshotFileName && (
              <Text style={{ color: colors.gray, fontSize: 12, marginTop: 4 }}>
                "Screenshot of Content" box: {screenshotFileName}
              </Text>
            )}
            {pdfFileName && (
              <Text style={{ color: colors.gray, fontSize: 12, marginTop: 2 }}>
                "Others" box: {pdfFileName}
              </Text>
            )}
            <Text style={{ color: colors.gray, fontSize: 11, marginTop: 6 }}>
              Apps cannot auto-attach files to web upload fields — a security rule.
            </Text>
          </View>
        )}

        {/* Bottom Toolbar */}
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
            <Text style={{ color: colors.primary }}>Back</Text>
          </TouchableOpacity>

          <View style={{ width: 1, backgroundColor: colors.lightGray, marginHorizontal: 4 }} />

          <TouchableOpacity
            style={{ flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
            onPress={handleOpenBrowser}
          >
            <Image source={MCMCIcon} style={{ width: 18, height: 18, marginRight: 6 }} />
            <Text style={{ color: colors.primary }}>Browser</Text>
          </TouchableOpacity>

          <View style={{ width: 1, backgroundColor: colors.lightGray, marginHorizontal: 4 }} />

          <TouchableOpacity
            style={{ flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
            onPress={handleContinueReportingPress}
          >
            <Feather name="refresh-cw" size={18} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={{ color: colors.primary, fontWeight: '500' }}>Continue Reporting</Text>
          </TouchableOpacity>

          <View style={{ width: 1, backgroundColor: colors.lightGray, marginHorizontal: 4 }} />

          {!isRegisterMode && (
            <TouchableOpacity
              style={{ flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
              onPress={handleFinish}
            >
              <Feather name="check-circle" size={18} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Finish</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}