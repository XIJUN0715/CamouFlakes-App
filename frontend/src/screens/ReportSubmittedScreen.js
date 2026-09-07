// src/screens/ReportSubmittedScreen.js
import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { globalStyles, colors } from '../styles/globalStyles';
import { addNotification } from '../utils/notifications';
import { upsertReport } from '../utils/database';

export default function ReportSubmittedScreen({ route, navigation }) {
  const {
    form,
    details,
    result,
    reportId,
    mcmcCaseId,
    thumbnailUri,
  } = route.params || {};

  const displayId = mcmcCaseId || reportId || `MCMC-${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;

  useEffect(() => {
    const persistSubmission = async () => {
      await upsertReport({
        reportId: displayId,
        status: 'Submitted',
        platform: form?.platform,
        category: form?.category,
        confidence: result?.confidence,
        isFake: result?.isFake,
        fullName: details?.fullName,
        mcmcCaseId: mcmcCaseId || null,
        thumbnailUri: thumbnailUri || null,
        userId: details?.userId,
        urlLink: details?.urlLink,
        description: details?.description,
        remedyAction: details?.remedyAction,
        remedyOther: details?.remedyOther,
        mobileNumber: details?.mobileNumber,
        email: details?.email,
        isPwd: details?.isPwd || false,
        isAcknowledged: details?.isAcknowledged || false,
        incidentTimestamp: new Date().toISOString(),
      });
      
      await AsyncStorage.removeItem('temp_report_details').catch(() => {});
      
      await addNotification(
        'MCMC Report Submitted',
        `Your report for case #${displayId} has been successfully submitted to MCMC.`,
        'success'
      );
    };
    persistSubmission();
  }, [displayId, form, details, result, mcmcCaseId, thumbnailUri]);

  return (
    <ScrollView style={[globalStyles.container, { backgroundColor: colors.background }]}>
      <View style={{ alignItems: 'center', paddingTop: 20, paddingBottom: 40 }}>
        <View
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: colors.success,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20,
            shadowColor: colors.success,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Feather name="check" size={50} color={colors.white} />
        </View>

        <Text style={[globalStyles.header, { textAlign: 'center', fontSize: 28 }]}>
          Report Submitted
        </Text>
        <Text style={[globalStyles.subtitle, { textAlign: 'center', marginBottom: 24 }]}>
          Thank you for helping protect the community
        </Text>

        <View style={[globalStyles.card, {
          width: '100%',
          alignItems: 'center',
          backgroundColor: colors.white,
          borderColor: colors.primary,
          borderWidth: 1,
        }]}>
          <Text style={{ color: colors.gray, fontSize: 14, fontWeight: '500' }}>
            {mcmcCaseId ? 'MCMC Case ID' : 'Report ID'}
          </Text>
          <Text style={{
            fontSize: 24,
            fontWeight: '700',
            color: colors.primary,
            marginVertical: 4,
            letterSpacing: 1,
          }}>
            {displayId}
          </Text>
        </View>

        <View style={[globalStyles.card, { width: '100%', marginTop: 12 }]}>
          <Text style={globalStyles.label}>Summary</Text>
          <View style={{ marginTop: 4 }}>
            <Text style={{ fontSize: 14, color: colors.gray }}>Platform</Text>
            <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 8 }}>
              {form?.platform || 'N/A'}
            </Text>
            <Text style={{ fontSize: 14, color: colors.gray }}>Result</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather
                name={result?.isFake ? 'alert-triangle' : 'check-circle'}
                size={16}
                color={result?.isFake ? colors.danger : colors.success}
                style={{ marginRight: 6 }}
              />
              <Text style={{ fontSize: 16, fontWeight: '600', color: result?.isFake ? colors.danger : colors.success }}>
                {result?.isFake ? 'Deepfake Detected' : 'Genuine'} – {result?.confidence || 0}%
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[globalStyles.outlineBtn, { width: '100%', marginTop: 20 }]}
          onPress={() => navigation.navigate('Reports')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="file-text" size={18} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={globalStyles.outlineBtnText}>View My Reports</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[globalStyles.secondaryBtn, { width: '100%', marginTop: 12 }]}
          onPress={() => navigation.navigate('Home')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="home" size={18} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={globalStyles.secondaryBtnText}>Back to Home</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}