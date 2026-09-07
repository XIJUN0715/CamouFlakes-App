// src/screens/ReportDetailScreen.js
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { globalStyles, colors } from '../styles/globalStyles';
import Header from '../components/Header';

export default function ReportDetailScreen({ route, navigation }) {
  const { report } = route.params || {};

  if (!report) {
    return (
      <View style={globalStyles.centered}>
        <Text style={{ color: colors.gray }}>Report not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatDate = (iso) => {
    if (!iso) return 'N/A';
    try { return new Date(iso).toLocaleString(); } catch (_) { return 'N/A'; }
  };

  const isSubmitted = report.status === 'Submitted';

  const handleContinueDraft = () => {
    // Navigate to MCMCReport (matches the name in AppNavigator.js)
    // Pass the full draft report including thumbnailUri
    navigation.navigate('MCMCReport', {
      draftReport: {
        ...report,
        thumbnailUri: report.thumbnailUri || null,
        videoUri: report.videoUri || null,
        incidentTimestamp: report.incidentTimestamp || null,
      }
    });
  };

  return (
    <View style={globalStyles.container}>
      <Header navigation={navigation} title="Report Details" showBack />

      <ScrollView
        style={globalStyles.contentContainer}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Thumbnail */}
        {report.thumbnailUri && (
          <View style={[globalStyles.card, { padding: 0, overflow: 'hidden', marginBottom: 16 }]}>
            <Image
              source={{ uri: report.thumbnailUri }}
              style={{ width: '100%', height: 180 }}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Status Banner */}
        <View style={{
          backgroundColor: isSubmitted ? colors.success : colors.warning,
          borderRadius: 10,
          padding: 12,
          alignItems: 'center',
          marginBottom: 16,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather
              name={isSubmitted ? 'check-circle' : 'edit'}
              size={16}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
              {isSubmitted ? 'Submitted' : 'Draft'}
            </Text>
          </View>
        </View>

        {/* Case ID */}
        <View style={globalStyles.card}>
          <Text style={[globalStyles.label, { color: colors.primary }]}>Case ID</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.black, marginTop: 4 }}>
            {report.reportId || 'N/A'}
          </Text>
          {report.mcmcCaseId && (
            <Text style={{ fontSize: 14, color: colors.gray, marginTop: 2 }}>
              MCMC Case: {report.mcmcCaseId}
            </Text>
          )}
        </View>

        {/* Detection Result */}
        <View style={globalStyles.card}>
          <Text style={[globalStyles.label, { color: colors.primary }]}>Detection Result</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Feather
              name={report.isFake ? 'alert-triangle' : 'check-circle'}
              size={20}
              color={report.isFake ? colors.danger : colors.success}
              style={{ marginRight: 8 }}
            />
            <Text style={{
              fontSize: 18,
              fontWeight: '700',
              color: report.isFake ? colors.danger : colors.success,
            }}>
              {report.isFake ? 'Deepfake Detected' : 'Genuine'}
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: colors.gray, marginTop: 4 }}>
            Confidence: {report.confidence || 0}%
          </Text>
        </View>

        {/* Complaint Details */}
        <View style={globalStyles.card}>
          <Text style={[globalStyles.label, { color: colors.primary }]}>Complaint Details</Text>
          <View style={{ marginTop: 4 }}>
            <Text style={{ fontSize: 14, color: colors.gray }}>Platform</Text>
            <Text style={{ fontSize: 15, fontWeight: '500', color: colors.black, marginBottom: 4 }}>
              {report.platform || 'N/A'}
            </Text>
            <Text style={{ fontSize: 14, color: colors.gray }}>Category</Text>
            <Text style={{ fontSize: 15, fontWeight: '500', color: colors.black, marginBottom: 4 }}>
              {report.category || 'N/A'}
            </Text>
            <Text style={{ fontSize: 14, color: colors.gray }}>User ID</Text>
            <Text style={{ fontSize: 15, fontWeight: '500', color: colors.black, marginBottom: 4 }}>
              {report.userId || 'N/A'}
            </Text>
            <Text style={{ fontSize: 14, color: colors.gray }}>URL Link</Text>
            <Text style={{ fontSize: 15, fontWeight: '500', color: colors.black }}>
              {report.urlLink || 'Not provided'}
            </Text>
          </View>
        </View>

        {/* User Details */}
        <View style={globalStyles.card}>
          <Text style={[globalStyles.label, { color: colors.primary }]}>User Details</Text>
          <View style={{ marginTop: 4 }}>
            <Text style={{ fontSize: 14, color: colors.gray }}>Full Name</Text>
            <Text style={{ fontSize: 15, fontWeight: '500', color: colors.black, marginBottom: 4 }}>
              {report.fullName || 'N/A'}
            </Text>
            <Text style={{ fontSize: 14, color: colors.gray }}>Mobile</Text>
            <Text style={{ fontSize: 15, fontWeight: '500', color: colors.black, marginBottom: 4 }}>
              {report.mobileNumber || 'N/A'}
            </Text>
            <Text style={{ fontSize: 14, color: colors.gray }}>Email</Text>
            <Text style={{ fontSize: 15, fontWeight: '500', color: colors.black }}>
              {report.email || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Description */}
        <View style={globalStyles.card}>
          <Text style={[globalStyles.label, { color: colors.primary }]}>Description</Text>
          <Text style={{ fontSize: 14, color: colors.gray, marginTop: 4, lineHeight: 20 }}>
            {report.description || 'No description provided'}
          </Text>
        </View>

        {/* Remedy */}
        <View style={globalStyles.card}>
          <Text style={[globalStyles.label, { color: colors.primary }]}>Remedy Requested</Text>
          <Text style={{ fontSize: 14, color: colors.gray, marginTop: 4 }}>
            {report.remedyAction || 'N/A'}
          </Text>
          {report.remedyOther && (
            <Text style={{ fontSize: 14, color: colors.gray, marginTop: 4 }}>
              Other: {report.remedyOther}
            </Text>
          )}
        </View>

        {/* Timestamp */}
        <View style={globalStyles.card}>
          <Text style={[globalStyles.label, { color: colors.primary }]}>Report Details</Text>
          <View style={{ marginTop: 4 }}>
            <Text style={{ fontSize: 14, color: colors.gray }}>Created At</Text>
            <Text style={{ fontSize: 14, color: colors.black, marginBottom: 4 }}>
              {formatDate(report.incidentTimestamp || report.createdAt)}
            </Text>
            <Text style={{ fontSize: 14, color: colors.gray }}>Last Updated</Text>
            <Text style={{ fontSize: 14, color: colors.black }}>
              {formatDate(report.updatedAt)}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        {!isSubmitted && (
          <TouchableOpacity
            style={[globalStyles.primaryBtn, { marginTop: 8 }]}
            onPress={handleContinueDraft}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="edit" size={18} color={colors.white} style={{ marginRight: 8 }} />
              <Text style={globalStyles.primaryBtnText}>Continue Draft</Text>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[globalStyles.outlineBtn, { marginTop: 8 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={globalStyles.outlineBtnText}>Go Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}