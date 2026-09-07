// src/screens/MCMCReportPreviewScreen.js
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { globalStyles, colors } from '../styles/globalStyles';
import MCMCIcon from '../../assets/mcmc-logo.png';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateCamouFlakesRef, formatIncidentTimestamp } from '../utils/reference';

export default function MCMCReportPreviewScreen({ route, navigation }) {
  const { form, details, result, videoUri, thumbnailUri, incidentTimestamp, isDraft } = route.params || {};

  const [reportId, setReportId] = useState(() => generateCamouFlakesRef());
  const contentSignatureRef = useRef(JSON.stringify({ form, details }));

  useEffect(() => {
    const currentSignature = JSON.stringify({ form, details });
    if (currentSignature !== contentSignatureRef.current) {
      contentSignatureRef.current = currentSignature;
      setReportId(generateCamouFlakesRef());
    }
  }, [form, details]);

  const [fallbackTimestamp] = useState(() => new Date().toISOString());
  const effectiveIncidentTimestamp = incidentTimestamp || fallbackTimestamp;
  const formattedIncident = formatIncidentTimestamp(effectiveIncidentTimestamp);

  const isFake = result?.isFake ?? false;
  const confidence = result?.confidence || 0;

  const handleSubmit = () => {
    Alert.alert(
      'Finalise Report?',
      'Are you sure you want to finalise this report? Once submitted, it cannot be edited anymore.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: () => {
            AsyncStorage.removeItem('temp_report_details').catch(() => {});
            navigation.navigate('MCMCReportFlow', {
              form,
              details,
              result,
              reportId,
              videoUri,
              thumbnailUri,
              incidentTimestamp: effectiveIncidentTimestamp,
              isDraft: isDraft || false,
            });
          },
        },
      ]
    );
  };

  const handleEditDetails = () => {
    navigation.goBack();
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel and Remove Reporting?',
      'This report will be discarded and you will return to the home screen.',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Remove and Cancel',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('temp_report_details').catch(() => {});
            navigation.replace('Home');
          },
        },
      ]
    );
  };

  // No beforeRemove listener – back goes to Details without prompt

  return (
    <ScrollView
      style={globalStyles.container}
      contentContainerStyle={{ paddingTop: 24, paddingHorizontal: 20, paddingBottom: 40 }}
    >
      <Text style={[globalStyles.headerOrange, { fontSize: 24 }]}>Preview Report</Text>
      <Text style={globalStyles.subtitle}>Review before submitting</Text>

      {thumbnailUri && (
        <View style={globalStyles.card}>
          <Text style={[globalStyles.label, { color: colors.primary }]}>Evidence Screenshot</Text>
          <Image
            source={{ uri: thumbnailUri }}
            style={{ width: '100%', height: 180, borderRadius: 8, marginTop: 8 }}
            resizeMode="cover"
          />
        </View>
      )}

      {formattedIncident && (
        <View style={[globalStyles.card, { backgroundColor: colors.lightGray }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="clock" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[globalStyles.label, { color: colors.primary, marginBottom: 0 }]}>Incident Timestamp</Text>
          </View>
          <Text style={{ marginTop: 6, fontSize: 15, fontWeight: '600', color: colors.black }}>
            {formattedIncident}
          </Text>
          <Text style={{ marginTop: 2, fontSize: 11, color: colors.gray }}>
            Fixed at time of detection — this stays the same even if you edit details.
          </Text>
        </View>
      )}

      <View style={globalStyles.card}>
        <Text style={[globalStyles.label, { color: colors.primary }]}>Basic Details</Text>
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontWeight: '600' }}>Complaint For:</Text>
          <Text style={{ color: colors.gray, marginBottom: 4 }}>{form?.complaintFor || 'N/A'}</Text>
          <Text style={{ fontWeight: '600' }}>Category:</Text>
          <Text style={{ color: colors.gray, marginBottom: 4 }}>{form?.category || 'N/A'}</Text>
          <Text style={{ fontWeight: '600' }}>Type of Service:</Text>
          <Text style={{ color: colors.gray, marginBottom: 4 }}>{form?.typeOfService || 'N/A'}</Text>
          <Text style={{ fontWeight: '600' }}>Platform:</Text>
          <Text style={{ color: colors.gray }}>{form?.platform || 'N/A'}</Text>
        </View>
      </View>

      <View style={globalStyles.card}>
        <Text style={[globalStyles.label, { color: colors.primary }]}>Complaint Details</Text>
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontWeight: '600' }}>Full Name:</Text>
          <Text style={{ color: colors.gray, marginBottom: 4 }}>{details?.fullName || 'N/A'}</Text>
          <Text style={{ fontWeight: '600' }}>Mobile:</Text>
          <Text style={{ color: colors.gray, marginBottom: 4 }}>{details?.mobileNumber || 'N/A'}</Text>
          <Text style={{ fontWeight: '600' }}>Email:</Text>
          <Text style={{ color: colors.gray, marginBottom: 4 }}>{details?.email || 'N/A'}</Text>
          <Text style={{ fontWeight: '600' }}>URL Link:</Text>
          <Text style={{ color: colors.gray, marginBottom: 4 }}>{details?.urlLink || 'N/A'}</Text>
          <Text style={{ fontWeight: '600' }}>User ID:</Text>
          <Text style={{ color: colors.gray, marginBottom: 4 }}>{details?.userId || 'N/A'}</Text>
          <Text style={{ fontWeight: '600' }}>Description:</Text>
          <Text style={{ color: colors.gray, marginBottom: 4 }}>{details?.description || 'N/A'}</Text>
          <Text style={{ fontWeight: '600' }}>Remedy Action:</Text>
          <Text style={{ color: colors.gray, marginBottom: 4 }}>{details?.remedyAction || 'N/A'}</Text>
          {details?.remedyAction === 'Other (please specify) i.e. Monitor.' && (
            <>
              <Text style={{ fontWeight: '600', marginTop: 4 }}>Remedy Other:</Text>
              <Text style={{ color: colors.gray, marginBottom: 4 }}>{details?.remedyOther || 'N/A'}</Text>
            </>
          )}
        </View>
      </View>

      <View style={globalStyles.card}>
        <Text style={[globalStyles.label, { color: colors.primary }]}>Terms and Acknowledgment</Text>
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontWeight: '600' }}>Person With Disabilities (PWD):</Text>
          <Text style={{ color: colors.gray, marginBottom: 4 }}>{details?.isPwd ? 'Yes' : 'No'}</Text>
          <Text style={{ fontWeight: '600' }}>Acknowledged:</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Feather name={details?.isAcknowledged ? 'check-circle' : 'x-circle'} size={16} color={details?.isAcknowledged ? colors.success : colors.danger} style={{ marginRight: 4 }} />
            <Text style={{ color: colors.gray }}>{details?.isAcknowledged ? 'Yes' : 'No'}</Text>
          </View>
        </View>
      </View>

      <View style={globalStyles.card}>
        <Text style={[globalStyles.label, { color: colors.primary }]}>Attachment</Text>
        <View style={{ marginTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Feather name="check-circle" size={16} color={colors.success} style={{ marginRight: 6 }} />
            <Text style={{ color: colors.gray }}>Detected video/screenshot</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Feather name="bar-chart-2" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={{ color: colors.gray }}>Deepfake confidence: {confidence}%</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name={isFake ? 'alert-triangle' : 'check-circle'} size={16} color={isFake ? colors.danger : colors.success} style={{ marginRight: 6 }} />
            <Text style={{ color: isFake ? colors.danger : colors.success, fontWeight: '600' }}>
              Result: {isFake ? 'Deepfake Detected' : 'Genuine'}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[globalStyles.primaryBtn, { backgroundColor: colors.primary }]}
        onPress={handleSubmit}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <Image source={MCMCIcon} style={{ width: 24, height: 24, marginRight: 8 }} />
          <Text style={globalStyles.primaryBtnText}>Submit Report to MCMC</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={globalStyles.outlineBtn} onPress={handleEditDetails}>
        <Text style={globalStyles.outlineBtnText}>Edit Details</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[globalStyles.dangerBtn, { backgroundColor: colors.danger }]} onPress={handleCancel}>
        <Text style={globalStyles.dangerBtnText}>Remove and Cancel Reporting</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}