// src/screens/PDFGeneratorScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { globalStyles, colors } from '../styles/globalStyles';
import {
  validateReportData,
  savePDFToDownloads,
  sharePDF,
} from '../utils/pdfGenerator';
import { addNotification } from '../utils/notifications';
import MCMCIcon from '../../assets/mcmc-logo.png';

export default function PDFGeneratorScreen({ route, navigation }) {
  const { reportId, form, details, result } = route.params || {};
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedFileName, setSavedFileName] = useState(null);

  const handleSavePDF = async () => {
    const data = { reportId, form, details, result };
    const validationErrors = validateReportData(data);
    if (validationErrors.length > 0) {
      Alert.alert('Incomplete Form', `Please fill in:\n• ${validationErrors.join('\n• ')}`);
      return;
    }

    setIsGenerating(true);
    try {
      const outcome = await savePDFToDownloads(data);
      if (outcome.success) {
        setSaved(true);
        setSavedFileName(outcome.fileName);
        await addNotification(
          'Report Saved',
          `PDF report for case #${reportId} saved as ${outcome.fileName}.`,
          'success'
        );
      } else if (outcome.cancelled) {
        Alert.alert('Folder Access Needed', "Pick a folder (e.g. Downloads) to save into — you'll only be asked once.");
      } else {
        Alert.alert('Error', outcome.error || 'Failed to save PDF.');
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      Alert.alert('Error', error.message || 'Failed to generate PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    const data = { reportId, form, details, result };
    setIsSharing(true);
    try {
      const shared = await sharePDF(data);
      if (shared) {
        await addNotification(
          'Report Shared',
          `PDF report for case #${reportId} shared.`,
          'success'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share PDF.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <ScrollView style={globalStyles.container}>
      <View style={{ alignItems: 'center', paddingTop: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Image source={MCMCIcon} style={{ width: 32, height: 32, marginRight: 10 }} />
          <Text style={[globalStyles.headerOrange, { fontSize: 24 }]}>MCMC Report</Text>
        </View>
        <Text style={[globalStyles.subtitle, { textAlign: 'center' }]}>
          Save or share your PDF report
        </Text>

        <View style={[globalStyles.card, { width: '100%', marginTop: 16 }]}>
          <Text style={globalStyles.label}>Report Details</Text>
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontWeight: '600' }}>Report ID</Text>
            <Text style={{ color: colors.gray, marginBottom: 8 }}>{reportId}</Text>
            <Text style={{ fontWeight: '600' }}>Platform</Text>
            <Text style={{ color: colors.gray, marginBottom: 8 }}>{form?.platform || 'N/A'}</Text>
            <Text style={{ fontWeight: '600' }}>Confidence</Text>
            <Text style={{ color: colors.danger, marginBottom: 8 }}>{result?.confidence || 0}%</Text>
            <Text style={{ fontWeight: '600' }}>Result</Text>
            <Text style={{ color: result?.isFake ? colors.danger : colors.success }}>
              {result?.isFake ? '⚠️ Deepfake' : '✅ Genuine'}
            </Text>
          </View>
        </View>

        <View style={[globalStyles.card, { width: '100%', backgroundColor: colors.lightGray }]}>
          <Text style={globalStyles.label}>This PDF includes:</Text>
          <Text style={{ color: colors.gray, marginVertical: 2 }}>• Report ID & timestamp</Text>
          <Text style={{ color: colors.gray, marginVertical: 2 }}>• All complaint details</Text>
          <Text style={{ color: colors.gray, marginVertical: 2 }}>• Detection confidence & result</Text>
        </View>

        <TouchableOpacity
          style={[globalStyles.primaryBtn, { width: '100%', marginTop: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]}
          onPress={handleSavePDF}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={{ fontSize: 18, marginRight: 8 }}>{saved ? '✅' : '⬇️'}</Text>
              <Text style={globalStyles.primaryBtnText}>{saved ? 'Saved to Device' : 'Save PDF to Device'}</Text>
            </>
          )}
        </TouchableOpacity>
        {saved && savedFileName && (
          <Text style={{ color: colors.gray, fontSize: 12, marginTop: 6 }}>Saved as {savedFileName}</Text>
        )}

        <TouchableOpacity onPress={handleShare} disabled={isSharing} style={{ marginTop: 10 }}>
          <Text style={{ color: colors.primary, fontSize: 13 }}>
            {isSharing ? 'Opening…' : 'Share instead (WhatsApp, Drive, etc.)'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[globalStyles.secondaryBtn, { width: '100%', marginTop: 16 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={globalStyles.secondaryBtnText}>Back</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}