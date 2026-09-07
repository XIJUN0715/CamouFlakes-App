// src/screens/LiveOverlayScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  NativeModules,
  BackHandler,
  DeviceEventEmitter,
  AppState,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { globalStyles, colors } from '../styles/globalStyles';

const { ScreenRecorderModule } = NativeModules;

export default function LiveOverlayScreen({ navigation }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [initError, setInitError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const timerInterval = useRef(null);
  const startTimeRef = useRef(null);
  const isMounted = useRef(true);
  const initializationCompleted = useRef(false);

  const clearTimer = () => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  };

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      clearTimer();
    };
  }, []);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isRecording) {
        Alert.alert(
          'Recording in Progress',
          'Stop recording and go back?',
          [
            { text: 'Continue', style: 'cancel' },
            { text: 'Stop and Go Back', style: 'destructive', onPress: stopRecordingAndTrim },
          ]
        );
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [isRecording]);

  // Handle recording stopped event
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      'onRecordingStopped',
      async (event) => {
        console.log('Recording stopped event:', event);

        if (!isMounted.current) return;

        setIsRecording(false);
        setIsProcessing(false);
        clearTimer();

        if (event.success && event.filePath) {
          let filePath = event.filePath;
          if (!filePath.startsWith('file://')) {
            filePath = 'file://' + filePath;
          }
          try {
            const info = await FileSystem.getInfoAsync(filePath);
            if (info.exists && info.size > 1000) {
              navigation.replace('TrimVideo', { videoUri: filePath, source: 'screen_recording' });
            } else {
              Alert.alert('Error', 'Recording file is missing or empty.');
            }
          } catch (e) {
            Alert.alert('Error', 'Could not access recording file.');
          }
        } else {
          Alert.alert('Error', 'Recording stopped but no video was saved.');
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [navigation]);

  // Enhanced module initialization with proper state handling
  const initializeModule = async (attempt = 0) => {
    // Don't initialize again if already completed successfully
    if (initializationCompleted.current && isAvailable) {
      setIsChecking(false);
      return;
    }

    try {
      console.log(`[LiveOverlay] Initializing module, attempt ${attempt + 1}`);
      
      // Wait for module to be available
      let moduleAvailable = false;
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts && !moduleAvailable) {
        if (ScreenRecorderModule && typeof ScreenRecorderModule.startRecording === 'function') {
          moduleAvailable = true;
          console.log('[LiveOverlay] ScreenRecorderModule loaded successfully');
          break;
        }
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      if (!isMounted.current) return;

      if (moduleAvailable) {
        setIsAvailable(true);
        setInitError(null);
        setRetryCount(0);
        initializationCompleted.current = true;
        console.log('[LiveOverlay] Module ready');
      } else {
        console.warn('[LiveOverlay] ScreenRecorderModule not available');
        setIsAvailable(false);
        setInitError('Screen recording module not available. Please restart the app.');
      }
    } catch (e) {
      console.error('[LiveOverlay] Check error:', e);
      if (isMounted.current) {
        setIsAvailable(false);
        setInitError(e.message || 'Failed to initialize screen recording.');
      }
    } finally {
      if (isMounted.current) {
        setIsChecking(false);
      }
    }
  };

  // Auto-initialize on mount - only once
  useEffect(() => {
    const init = async () => {
      await initializeModule(0);
    };
    init();
  }, []);

  // Listen for app state changes to re-initialize only when needed
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && !isAvailable && !isChecking && isMounted.current && !initializationCompleted.current) {
        console.log('[LiveOverlay] App returned to foreground, re-initializing...');
        setIsChecking(true);
        initializeModule(0);
      }
    });
    return () => subscription.remove();
  }, [isAvailable, isChecking]);

  const retryInitialization = () => {
    // Reset the completed flag to allow retry
    initializationCompleted.current = false;
    setRetryCount(prev => prev + 1);
    setIsChecking(true);
    setInitError(null);
    initializeModule(retryCount + 1);
  };

  const startScreenRecording = async () => {
    if (isRecording || isProcessing) return;

    // Double-check module is available
    if (!ScreenRecorderModule) {
      Alert.alert('Error', 'Screen recording module not available. Please restart the app.');
      setIsChecking(true);
      initializeModule(0);
      return;
    }

    try {
      setIsProcessing(true);

      console.log('Starting foreground service...');
      await ScreenRecorderModule.startForegroundService();

      console.log('Requesting screen capture permission...');
      await ScreenRecorderModule.startRecording();

      let active = false;
      for (let i = 0; i < 15; i++) {
        try {
          const isActive = await ScreenRecorderModule.isScreenSharingActive();
          if (isActive) {
            active = true;
            break;
          }
        } catch (_) {}
        await new Promise(r => setTimeout(r, 500));
      }

      if (!isMounted.current) return;

      if (!active) {
        Alert.alert('Permission Denied', 'Screen recording permission was not granted.');
        await ScreenRecorderModule.releaseResources().catch(() => {});
        setIsProcessing(false);
        return;
      }

      console.log('Screen sharing active, starting media recorder...');
      await ScreenRecorderModule.startScreenRecording();

      let recorderStarted = false;
      for (let i = 0; i < 5; i++) {
        try {
          const isRecActive = await ScreenRecorderModule.isRecordingActive();
          if (isRecActive) {
            recorderStarted = true;
            break;
          }
        } catch (_) {}
        await new Promise(r => setTimeout(r, 300));
      }

      if (!isMounted.current) return;

      if (!recorderStarted) {
        Alert.alert('Error', 'Media recorder failed to start.');
        await ScreenRecorderModule.releaseResources().catch(() => {});
        setIsProcessing(false);
        return;
      }

      setIsRecording(true);
      setRecordingTime(0);
      startTimeRef.current = Date.now();

      clearTimer();
      timerInterval.current = setInterval(() => {
        if (isMounted.current) {
          const elapsed = (Date.now() - startTimeRef.current) / 1000;
          setRecordingTime(elapsed);
        }
      }, 100);

      Alert.alert('Recording Started', 'Tap "Stop Recording" when suspicious.', [{ text: 'OK' }]);
      setIsProcessing(false);

    } catch (error) {
      console.error('Start error:', error);
      if (!isMounted.current) return;
      
      try { await ScreenRecorderModule.releaseResources(); } catch (_) {}
      setIsRecording(false);
      setIsProcessing(false);
      
      if (error.message && (error.message.includes('null') || error.message.includes('undefined'))) {
        Alert.alert(
          'Module Not Ready',
          'The screen recording module is not ready. Please restart the app and try again.',
          [
            { text: 'Retry', onPress: () => {
              initializationCompleted.current = false;
              setIsChecking(true);
              initializeModule(0);
            }},
            { text: 'Go Back', onPress: () => navigation.goBack() }
          ]
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to start screen recording.');
      }
    }
  };

  const stopRecordingAndTrim = async () => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      if (isRecording) {
        setIsRecording(false);
        clearTimer();
      }
      await ScreenRecorderModule.stopScreenRecording();
    } catch (error) {
      console.error('Stop error:', error);
      if (isMounted.current) {
        setIsProcessing(false);
        Alert.alert('Error', 'Failed to stop recording: ' + error.message);
      }
    }
  };

  const handleCancel = () => {
    if (isRecording) {
      Alert.alert(
        'Cancel Recording',
        'The recording will be discarded.',
        [
          { text: 'Continue', style: 'cancel' },
          {
            text: 'Cancel',
            style: 'destructive',
            onPress: async () => {
              try {
                await ScreenRecorderModule.stopScreenRecording();
              } catch (_) {}
              setIsRecording(false);
              clearTimer();
              navigation.goBack();
            },
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  // Show checking state
  if (isChecking) {
    return (
      <View style={globalStyles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[globalStyles.subtitle, { marginTop: 16 }]}>
          {retryCount > 0 ? 'Retrying initialization...' : 'Initializing...'}
        </Text>
        {retryCount > 0 && (
          <Text style={{ fontSize: 12, color: colors.gray, marginTop: 8 }}>
            Attempt {retryCount + 1}
          </Text>
        )}
      </View>
    );
  }

  // Show error with retry option
  if (!isAvailable) {
    return (
      <View style={globalStyles.centered}>
        <Feather name="alert-circle" size={48} color={colors.danger} style={{ marginBottom: 16 }} />
        <Text style={globalStyles.header}>Not Available</Text>
        <Text style={[globalStyles.subtitle, { textAlign: 'center', paddingHorizontal: 20 }]}>
          {initError || 'Screen recording is not available on this device.'}
        </Text>
        <View style={{ flexDirection: 'row', marginTop: 16 }}>
          <TouchableOpacity 
            style={[globalStyles.primaryBtn, { marginRight: 8 }]} 
            onPress={retryInitialization}
          >
            <Text style={globalStyles.primaryBtnText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[globalStyles.outlineBtn, { marginLeft: 8 }]} 
            onPress={() => navigation.goBack()}
          >
            <Text style={globalStyles.outlineBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 11, color: colors.gray, marginTop: 12, textAlign: 'center' }}>
          If this persists, try restarting the app
        </Text>
      </View>
    );
  }

  const canStop = recordingTime >= 3;

  return (
    <View style={[globalStyles.container, { paddingTop: 0 }]}>
      <View style={{ paddingTop: 20, paddingBottom: 12, paddingHorizontal: 24 }}>
        <Text style={[globalStyles.headerOrange, { fontSize: 24 }]}>CamouFlakes</Text>
        <Text style={[globalStyles.subtitle, { fontSize: 14 }]}>Unmask the Fake</Text>
      </View>

      <View style={[globalStyles.card, {
        backgroundColor: isRecording ? '#FFF0ED' : colors.lightGray,
        alignItems: 'center',
        paddingVertical: 20,
        marginHorizontal: 24,
      }]}>
        <View style={{ marginBottom: 8 }}>
          {isRecording ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: colors.danger,
                marginRight: 10,
              }} />
              <Feather name="monitor" size={36} color={colors.danger} />
            </View>
          ) : isProcessing ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <Feather name="monitor" size={36} color={colors.primary} />
          )}
        </View>

        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.black }}>
          {isRecording ? 'Recording screen...' :
           isProcessing ? 'Processing...' :
           'Live Overlay Detection'}
        </Text>

        {isRecording && (
          <Text style={{ fontSize: 14, color: colors.gray, marginTop: 4 }}>
            Recording {recordingTime.toFixed(1)}s {recordingTime < 3 ? '(min 3s)' : ''} {recordingTime > 27 ? '(auto-stops at 30s)' : ''}
          </Text>
        )}

        {isRecording && (
          <Text style={{ fontSize: 12, color: colors.gray, marginTop: 4 }}>
            Tap "Stop Recording" when suspicious
          </Text>
        )}

        {!isRecording && !isProcessing && (
          <Text style={{ fontSize: 14, color: colors.gray, marginTop: 4 }}>
            Press start to begin screen recording
          </Text>
        )}

        {isProcessing && !isRecording && (
          <Text style={{ fontSize: 14, color: colors.gray, marginTop: 4 }}>
            Please wait...
          </Text>
        )}
      </View>

      <View style={{ paddingHorizontal: 24 }}>
        {!isRecording && !isProcessing && (
          <TouchableOpacity
            style={[globalStyles.primaryBtn, { marginTop: 16 }]}
            onPress={startScreenRecording}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="play" size={18} color={colors.white} style={{ marginRight: 10 }} />
              <Text style={[globalStyles.primaryBtnText, { fontSize: 16 }]}>
                Start Screen Recording
              </Text>
            </View>
            <Text style={{ color: '#fff', opacity: 0.7, fontSize: 12, marginTop: 2 }}>
              Share screen to detect deepfakes
            </Text>
          </TouchableOpacity>
        )}

        {isRecording && !isProcessing && (
          <TouchableOpacity
            style={[globalStyles.dangerBtn, { marginTop: 16, opacity: canStop ? 1 : 0.5 }]}
            onPress={stopRecordingAndTrim}
            disabled={!canStop}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="square" size={18} color={colors.white} style={{ marginRight: 10 }} />
              <Text style={globalStyles.dangerBtnText}>
                {canStop ? 'Stop Recording' : `Stop (min ${(3 - recordingTime).toFixed(1)}s)`}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {isProcessing && (
          <View style={{ marginTop: 16 }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {!isRecording && !isProcessing && (
          <TouchableOpacity style={globalStyles.secondaryBtn} onPress={handleCancel}>
            <Text style={globalStyles.secondaryBtnText}>Back to Home</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}