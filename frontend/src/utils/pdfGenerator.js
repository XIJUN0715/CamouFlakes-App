// src/utils/pdfGenerator.js - with full-page watermark
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import * as base64js from 'base64-js';
import { formatIncidentTimestamp } from './reference';

const DOWNLOADS_DIR_KEY = 'cf_downloads_dir_uri';
const DOWNLOADS_URI_HINT =
  'content://com.android.externalstorage.documents/document/primary%3ADownload';

export const validateReportData = (data) => {
  const { form, details } = data;
  const errors = [];
  if (!form?.complaintFor || form.complaintFor === 'Select') errors.push('Complaint For');
  if (!form?.category || form.category === 'Select') errors.push('Category');
  if (!form?.typeOfService || form.typeOfService === 'Select') errors.push('Type of Service');
  if (!form?.platform || form.platform === 'Select') errors.push('Platform');
  if (!details?.fullName || details.fullName.trim() === '') errors.push('Full Name');
  if (!details?.mobileNumber || details.mobileNumber.trim() === '') errors.push('Mobile Number');
  if (!details?.email || details.email.trim() === '') errors.push('Email Address');
  if (!details?.userId || details.userId.trim() === '') errors.push('User ID/Account');
  if (!details?.description || details.description.trim() === '') errors.push('Complaint Description');
  if (!details?.remedyAction || details.remedyAction === 'Select') errors.push('Remedy Action');
  return errors;
};

const wrapText = (text, maxChars = 55) => {
  if (!text) return ['N/A'];
  const words = text.split(' ');
  const lines = [];
  let line = '';
  words.forEach(word => {
    const testLine = line + (line ? ' ' : '') + word;
    if (testLine.length <= maxChars) {
      line = testLine;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  });
  if (line) lines.push(line);
  return lines;
};

async function fetchImageBytes(uri) {
  if (/^https?:\/\//i.test(uri)) {
    const res = await fetch(uri);
    if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  }
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  return base64js.toByteArray(base64);
}

function drawFullPageWatermark(page, width, height, font, isFake) {
  const statusText = isFake ? 'DEEPFAKE DETECTED' : 'GENUINE VERIFIED';
  const statusColor = isFake ? rgb(1, 0.2, 0.15) : rgb(0.15, 0.7, 0.3);
  const orange = rgb(1, 0.42, 0);
  
  // Centered grid: 3 columns x 5 rows
  const cols = 4;
  const rows = 5;
  const spacingX = 270;
  const spacingY = 200;
  const offsetX = -60; 
  const offsetY = 30;
  const pairGap = 45;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * spacingX + offsetX;
      const y = row * spacingY + offsetY;
      
      // CamouFlakes - orange, prominent
      page.drawText('CamouFlakes', {
        x: x,
        y: y,
        size: 48,
        font: font,
        color: orange,
        opacity: 0.13,
        rotate: degrees(45),
      });
      
      // Status text - subtle, below CamouFlakes
      page.drawText(statusText, {
        x: x + 10,
        y: y - pairGap,
        size: 28,
        font: font,
        color: statusColor,
        opacity: 0.09,
        rotate: degrees(45),
      });
    }
  }
}

export const generatePDF = async (data) => {
  try {
    const { reportId, form, details, result, thumbnailUri, incidentTimestamp } = data;
    const validationErrors = validateReportData({ form, details });
    if (validationErrors.length > 0) {
      throw new Error(`Please fill in: ${validationErrors.join(', ')}`);
    }

    const PAGE_WIDTH = 595.28;
    const PAGE_HEIGHT = 841.89;
    const margin = 50;
    const labelWidth = 165;
    const contentWidth = PAGE_WIDTH - margin * 2;
    const topStart = PAGE_HEIGHT - 41;
    const bottomLimit = 50;

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = topStart;

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const orange = rgb(1, 0.42, 0);
    const darkText = rgb(0.1, 0.1, 0.1);
    const grayText = rgb(0.4, 0.4, 0.4);
    const lightGray = rgb(0.95, 0.95, 0.95);
    const danger = rgb(1, 0.23, 0.19);
    const success = rgb(0.2, 0.78, 0.35);

    const isFake = result?.isFake ?? false;
    const confidence = result?.confidence ?? 0;

    // ─── DRAW FULL PAGE WATERMARK ───
    drawFullPageWatermark(page, PAGE_WIDTH, PAGE_HEIGHT, fontBold, isFake);

    const startNewPage = () => {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = topStart;
      // ─── DRAW WATERMARK ON EACH NEW PAGE ───
      drawFullPageWatermark(page, PAGE_WIDTH, PAGE_HEIGHT, fontBold, isFake);
    };

    const ensureSpace = (needed) => {
      if (y - needed < bottomLimit) {
        startNewPage();
      }
    };

    const drawText = (text, x, yPos, size = 12, color = darkText, fontToUse = font) => {
      page.drawText(text, { x, y: yPos, size, font: fontToUse, color });
    };
    const drawLine = (yPos, color = lightGray) => {
      page.drawLine({
        start: { x: margin, y: yPos },
        end: { x: PAGE_WIDTH - margin, y: yPos },
        thickness: 1,
        color,
      });
    };
    const drawDivider = () => {
      ensureSpace(42);
      y -= 12;
      drawLine(y + 10);
      y -= 18;
    };
    const drawSectionHeader = (text) => {
      ensureSpace(40);
      drawText(text, margin, y, 14, orange, fontBold);
      y -= 24;
    };

    const renderField = (label, value) => {
      ensureSpace(20);
      drawText(label, margin, y, 11, grayText);
      drawText(value || 'N/A', margin + labelWidth, y, 11, darkText);
      y -= 20;
    };

    const renderDescription = (label, text) => {
      ensureSpace(20);
      drawText(label, margin, y, 11, grayText);
      y -= 16;
      const descLines = wrapText(text || 'N/A');
      descLines.forEach((line) => {
        ensureSpace(18);
        drawText(line, margin + labelWidth, y, 11, darkText);
        y -= 18;
      });
      y -= 6;
    };

    const renderRemedyAction = (label, value) => {
      ensureSpace(20);
      drawText(label, margin, y, 11, grayText);
      const valueX = margin + labelWidth;
      drawText(value || 'N/A', valueX, y, 11, darkText);
      const textWidth = (value || 'N/A').length * 5.5;
      page.drawLine({
        start: { x: valueX, y: y - 2 },
        end: { x: valueX + textWidth, y: y - 2 },
        thickness: 2,
        color: orange,
      });
      y -= 20;
    };

    const renderYesNo = (label, value) => {
      ensureSpace(20);
      drawText(label, margin, y, 11, grayText);
      drawText(value ? 'Yes' : 'No', margin + labelWidth, y, 11, darkText);
      y -= 20;
    };

    // ============ HEADER ============
    drawText('Camou', margin, y, 32, orange, fontBold);
    drawText('Flakes', margin + 108.5, y, 32, darkText, fontBold);
    y -= 34;
    drawText('MCMC INCIDENT REPORT', margin, y, 16, grayText);
    y -= 30;
    drawLine(y + 10, orange);
    y -= 30;

    // ============ THUMBNAIL ============
    if (thumbnailUri) {
      try {
        const imgBytes = await fetchImageBytes(thumbnailUri);
        const isJpg = /\.jpe?g(\?|$)/i.test(thumbnailUri);
        const embeddedImg = isJpg ? await pdfDoc.embedJpg(imgBytes) : await pdfDoc.embedPng(imgBytes);
        const dims = embeddedImg.scaleToFit(contentWidth, 260);

        const captionBlock = 26;
        const padding = 6;
        const blockHeight = captionBlock + dims.height + padding * 2 + 16;

        ensureSpace(blockHeight);

        drawText('Screenshot captured at time of detection:', margin, y, 14, grayText, fontBold);
        y -= captionBlock;

        const imgX = margin + (contentWidth - dims.width) / 2;
        const rectX = imgX - padding;
        const rectY = y - dims.height - padding;
        const rectW = dims.width + 2 * padding;
        const rectH = dims.height + 2 * padding;

        page.drawRectangle({
          x: rectX, y: rectY, width: rectW, height: rectH,
          borderColor: orange, borderWidth: 2,
        });
        page.drawImage(embeddedImg, { x: imgX, y: y - dims.height, width: dims.width, height: dims.height });
        y -= dims.height + 2 * padding + 16;
      } catch (e) {
        console.warn('Could not embed thumbnail into PDF:', e.message);
      }
    }

    // ============ CAMOUFLAKES REF + INCIDENT TIMESTAMP ============
    ensureSpace(80);
    drawText('CamouFlakes Reference No.', margin, y, 11, grayText);
    y -= 18;
    drawText(reportId, margin, y, 20, orange, fontBold);
    y -= 20;
    const incidentLabel = formatIncidentTimestamp(incidentTimestamp);
    if (incidentLabel) {
      drawText(`Incident occurred on: ${incidentLabel}`, margin, y, 11, grayText, fontBold);
    } else {
      drawText(`${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, y, 11, grayText);
    }
    y -= 30;
    drawDivider();

    // ============ BASIC DETAILS ============
    drawSectionHeader('BASIC DETAILS');
    renderField('Complaint For:', form?.complaintFor || 'N/A');
    renderField('Category:', form?.category || 'N/A');
    renderField('Type of Service:', form?.typeOfService || 'N/A');
    renderField('Platform:', form?.platform || 'N/A');
    drawDivider();

    // ============ COMPLAINT DETAILS ============
    drawSectionHeader('COMPLAINT DETAILS');
    renderField('Full Name:', details?.fullName || 'N/A');
    renderField('Mobile Number:', details?.mobileNumber || 'N/A');
    renderField('Email Address:', details?.email || 'N/A');
    renderField('URL Link:', details?.urlLink || 'N/A');
    renderField('User ID/Account:', details?.userId || 'N/A');
    renderDescription('Description:', details?.description || 'N/A');
    renderRemedyAction('Remedy Action:', details?.remedyAction || 'N/A');

    if (details?.remedyAction === 'Other (please specify) i.e. Monitor.' && details?.remedyOther) {
      renderField('Remedy Other:', details.remedyOther);
    }
    if (details?.isPwd !== undefined) {
      renderYesNo('Person With Disabilities (PWD):', details.isPwd);
    }
    if (details?.isAcknowledged !== undefined) {
      renderYesNo('Acknowledged:', details.isAcknowledged);
    }
    drawDivider();

    // ============ DETECTION RESULT ============
    ensureSpace(40 + 90);
    drawText('DETECTION RESULT', margin, y, 14, orange, fontBold);
    y -= 24;

    const statusColor = isFake ? danger : success;
    const statusText = isFake ? 'DEEPFAKE DETECTED' : 'GENUINE';
    const bgColor = isFake ? rgb(1, 0.95, 0.95) : rgb(0.95, 1, 0.95);

    page.drawRectangle({
      x: margin, y: y - 50, width: contentWidth, height: 70,
      color: bgColor, borderColor: statusColor, borderWidth: 2,
    });
    drawText(statusText, margin + 30, y - 10, 24, statusColor, fontBold);
    y -= 36;
    drawText(`Confidence: ${confidence}%`, margin + 30, y - 8, 16, darkText);
    y -= 80;

    // ============ FOOTER ============
    ensureSpace(60);
    drawLine(y + 20);
    y -= 30;
    drawText('Generated by CamouFlakes — AI-Driven Deepfake Detection', margin, y, 10, grayText);
    y -= 18;
    drawText('Thank you for helping protect the community.', margin, y, 10, grayText);

    // ============ SAVE PDF ============
    const pdfBytes = await pdfDoc.save();
    const base64 = base64js.fromByteArray(pdfBytes);

    const documentDirectory = FileSystem.documentDirectory;
    const reportsDir = `${documentDirectory}reports/`;
    const dirInfo = await FileSystem.getInfoAsync(reportsDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(reportsDir, { intermediates: true });
    }

    const fullName = (details?.fullName || 'User').replace(/\s/g, '').toUpperCase();
    const resultLabel = isFake ? 'DeepFakeDetected' : 'Genuine';
    const now = new Date();
    const dateStr = now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');
    const timeStr = String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0');
    const fileName = `${fullName}_${resultLabel}_${dateStr}_${timeStr}_CamouFlakes_MCMC.pdf`;
    const filePath = `${reportsDir}${fileName}`;
    await FileSystem.writeAsStringAsync(filePath, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log('PDF saved at:', filePath);
    return filePath;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
};

async function shareLocalFile(filePath, reportId) {
  if (!(await Sharing.isAvailableAsync())) {
    return { success: false, error: 'Sharing not available' };
  }
  try {
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/pdf',
      dialogTitle: `MCMC Report ${reportId}`,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function writeToDownloads(filePath, reportId) {
  const fileName = filePath.split('/').pop() || `CamouFlakes_${reportId || 'Report'}.pdf`;
  if (Platform.OS !== 'android') {
    return { needsShareFallback: true, fileName };
  }

  let dirUri = null;
  try {
    dirUri = await AsyncStorage.getItem(DOWNLOADS_DIR_KEY);
  } catch (_) {}

  if (!dirUri) {
    try {
      const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(
        DOWNLOADS_URI_HINT
      );
      if (!perm.granted) {
        return { success: false, cancelled: true };
      }
      dirUri = perm.directoryUri;
      await AsyncStorage.setItem(DOWNLOADS_DIR_KEY, dirUri);
    } catch (e) {
      return { success: false, error: 'Permission error: ' + e.message };
    }
  }

  try {
    const base64 = await FileSystem.readAsStringAsync(filePath, { encoding: FileSystem.EncodingType.Base64 });
    const destUri = await FileSystem.StorageAccessFramework.createFileAsync(dirUri, fileName, 'application/pdf');
    await FileSystem.writeAsStringAsync(destUri, base64, { encoding: FileSystem.EncodingType.Base64 });
    return { success: true, fileName, uri: destUri };
  } catch (e) {
    await AsyncStorage.removeItem(DOWNLOADS_DIR_KEY).catch(() => {});
    return { success: false, error: e.message || 'Write failed' };
  }
}

export const savePDFToDownloads = async (data) => {
  const validationErrors = validateReportData(data);
  if (validationErrors.length > 0) {
    return { success: false, error: `Missing: ${validationErrors.join(', ')}` };
  }
  let filePath;
  try {
    filePath = await generatePDF(data);
  } catch (error) {
    return { success: false, error: error.message };
  }

  const outcome = await writeToDownloads(filePath, data.reportId);
  if (outcome.needsShareFallback) {
    const shareResult = await shareLocalFile(filePath, data.reportId);
    return { ...shareResult, localUri: filePath, viaShare: true, fileName: outcome.fileName };
  }
  if (outcome.success) {
    return { success: true, fileName: outcome.fileName, uri: outcome.uri, localUri: filePath };
  }
  if (outcome.cancelled) {
    return { success: false, cancelled: true, localUri: filePath };
  }
  const shareResult = await shareLocalFile(filePath, data.reportId);
  return { ...shareResult, localUri: filePath, viaShare: true, downloadsError: outcome.error };
};

export const sharePDF = async (data) => {
  const validationErrors = validateReportData(data);
  if (validationErrors.length > 0) {
    Alert.alert('Incomplete Form', `Please fill in:\n• ${validationErrors.join('\n• ')}`);
    return { success: false, error: 'Missing fields' };
  }
  let filePath;
  try {
    filePath = await generatePDF(data);
  } catch (error) {
    Alert.alert('Error', error.message);
    return { success: false, error: error.message };
  }
  const shareOutcome = await shareLocalFile(filePath, data.reportId);
  if (!shareOutcome.success) Alert.alert('Error', shareOutcome.error || 'Share failed');
  return { ...shareOutcome, localUri: filePath };
};

export const savePDFLocally = async (data) => {
  const result = await savePDFToDownloads(data);
  if (result.success) {
    Alert.alert('Success', `PDF saved as ${result.fileName || 'document'}`);
  } else if (result.cancelled) {
    Alert.alert('Folder Access Needed', 'Pick a folder (e.g. Downloads) to save into.');
  } else {
    Alert.alert('Error', result.error || 'Save failed');
  }
  return result.success;
};

export const generateAndSharePDF = async (data) => sharePDF(data);

export default {
  validateReportData,
  generatePDF,
  savePDFLocally,
  savePDFToDownloads,
  sharePDF,
  generateAndSharePDF,
};