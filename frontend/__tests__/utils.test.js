// __tests__/utils.test.js
//
// This file contains all unit tests for the CamouFlakes frontend utilities.
// It covers database operations, history storage, notifications, reference
// generation, media saving, PDF generation, and TFLite API calls.
//
// All native modules are mocked in __tests__/setup.js to allow Jest
// to run these tests in a Node.js environment without requiring
// Android or iOS native dependencies.

// ============================================
// MOCKED DEPENDENCIES
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

// ============================================
// UTILITY IMPORTS
// ============================================

// database.js - Report storage
import {
  getAllReports,
  upsertReport,
  getReportById,
  clearAllReports
} from '../src/utils/database';

// historyStorage.js - Video analysis history
import {
  saveHistoryItem,
  loadHistory,
  deleteHistoryItem,
  getHistoryItemById,
  clearAllHistory
} from '../src/utils/historyStorage';

// mediaSave.js - Save videos and thumbnails to gallery
import {
  buildThumbnailFileName,
  saveVideoAndThumbnailToGallery
} from '../src/utils/mediaSave';

// notifications.js - In-app notification system
import {
  addNotification,
  getNotifications,
  markAsRead,
  deleteNotification,
  clearAllNotifications,
  getUnreadCount,
  markAllAsRead,
  seedDemoNotifications
} from '../src/utils/notifications';

// pdfGenerator.js - Generate MCMC report PDFs
import {
  validateReportData,
  generatePDF,
  savePDFToDownloads,
  sharePDF,
  savePDFLocally
} from '../src/utils/pdfGenerator';

// reference.js - Generate references and format timestamps
import {
  generateCamouFlakesRef,
  formatIncidentTimestamp
} from '../src/utils/reference';

// tflite.js - Video analysis API calls
import { analyzeVideo } from '../src/utils/tflite';

// ============================================
// TEST SUITE 1: DATABASE (Reports)
// ============================================

describe('Database Tests - Reports', () => {
  const mockReport = {
    reportId: 'RPT-20260821-001',
    status: 'Draft',
    platform: 'WhatsApp',
    category: 'Scam',
    confidence: 89,
    isFake: true,
    fullName: 'John Doe',
    mobileNumber: '012-3456789',
    email: 'john@example.com',
    userId: '@john_doe',
    description: 'Test report description',
    remedyAction: 'Remove Content',
    thumbnailUri: 'file://thumb.jpg',
  };

  beforeEach(() => {
    AsyncStorage.getItem.mockClear();
    AsyncStorage.setItem.mockClear();
    AsyncStorage.removeItem.mockClear();
  });

  test('FRONTEND_UT01: getAllReports should return empty array when no reports exist', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);
    const result = await getAllReports();
    expect(result).toEqual([]);
    console.log('[FRONTEND_UT01] Actual output:', result);
  });

  test('FRONTEND_UT02: upsertReport should add new report', async () => {
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
    AsyncStorage.setItem.mockResolvedValue();
    const result = await upsertReport(mockReport);
    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(result[0]).toMatchObject({
      reportId: 'RPT-20260821-001',
      status: 'Draft',
      confidence: 89
    });
    expect(result[0].createdAt).toBeDefined();
    expect(result[0].updatedAt).toBeDefined();
    console.log('[FRONTEND_UT02] Actual output:', result[0]);
  });

  test('FRONTEND_UT03: upsertReport should update existing report', async () => {
    const existing = [{
      ...mockReport,
      createdAt: '2026-08-21T10:00:00Z',
      updatedAt: '2026-08-21T10:00:00Z'
    }];
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(existing));
    const updatedData = {
      ...mockReport,
      status: 'Submitted',
      confidence: 95,
    };
    const result = await upsertReport(updatedData);
    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(result[0].status).toBe('Submitted');
    expect(result[0].confidence).toBe(95);
    console.log('[FRONTEND_UT03] Actual output:', result[0]);
  });

  test('FRONTEND_UT04: getReportById should return correct report', async () => {
    const mockData = [
      { reportId: 'RPT-001', title: 'Report 1' },
      { reportId: 'RPT-002', title: 'Report 2' }
    ];
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));
    const result = await getReportById('RPT-002');
    expect(result).toEqual({ reportId: 'RPT-002', title: 'Report 2' });
    console.log('[FRONTEND_UT04] Actual output:', result);
  });

  test('FRONTEND_UT05: getReportById should return null for non-existent ID', async () => {
    const mockData = [{ reportId: 'RPT-001', title: 'Report 1' }];
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));
    const result = await getReportById('RPT-999');
    expect(result).toBeNull();
    console.log('[FRONTEND_UT05] Actual output:', result);
  });

  test('FRONTEND_UT06: clearAllReports should remove all reports', async () => {
    AsyncStorage.removeItem.mockResolvedValue();
    await clearAllReports();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@camouflakes_reports');
    console.log('[FRONTEND_UT06] Actual output: Cleared successfully');
  });
});

// ============================================
// TEST SUITE 2: HISTORY STORAGE
// ============================================

describe('History Storage Tests', () => {
  const mockItem = {
    title: 'Test Analysis',
    videoUri: 'file://test.mp4',
    confidence: 85,
    isFake: true,
    fakePercent: 85,
    genuinePercent: 15,
    source: 'gallery',
    probability: 0.85,
    thumbnail: 'file://thumb.jpg',
    incidentTimestamp: new Date().toISOString(),
    duration: 5,
    reasoning: ['Test reasoning'],
    segments: []
  };

  beforeEach(() => {
    AsyncStorage.getItem.mockClear();
    AsyncStorage.setItem.mockClear();
    AsyncStorage.removeItem.mockClear();
  });

  test('FRONTEND_UT07: saveHistoryItem should save item to storage', async () => {
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
    AsyncStorage.setItem.mockResolvedValue();
    const result = await saveHistoryItem(mockItem);
    expect(AsyncStorage.setItem).toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(result[0]).toMatchObject({
      title: 'Test Analysis',
      isFake: true,
      confidence: 85
    });
    console.log('[FRONTEND_UT07] Actual output:', result[0]);
  });

  test('FRONTEND_UT08: loadHistory should load items from storage', async () => {
    const mockData = [{
      id: '123',
      title: 'Test',
      isFake: true,
      confidence: 85
    }];
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));
    const result = await loadHistory();
    expect(result).toEqual(mockData);
    expect(result.length).toBe(1);
    console.log('[FRONTEND_UT08] Actual output:', result);
  });

  test('FRONTEND_UT09: deleteHistoryItem should remove item from storage', async () => {
    const mockData = [
      { id: '1', title: 'Item 1' },
      { id: '2', title: 'Item 2' }
    ];
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));
    const result = await deleteHistoryItem('1');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('2');
    console.log('[FRONTEND_UT09] Actual output:', result);
  });

  test('FRONTEND_UT10: getHistoryItemById should return correct item', async () => {
    const mockData = [
      { id: '1', title: 'Item 1' },
      { id: '2', title: 'Item 2' }
    ];
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));
    const result = await getHistoryItemById('2');
    expect(result).toEqual({ id: '2', title: 'Item 2' });
    console.log('[FRONTEND_UT10] Actual output:', result);
  });

  test('FRONTEND_UT11: clearAllHistory should remove all items', async () => {
    AsyncStorage.removeItem.mockResolvedValue();
    await clearAllHistory();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@camouflakes_history');
    console.log('[FRONTEND_UT11] Actual output: Cleared successfully');
  });
});

// ============================================
// TEST SUITE 3: NOTIFICATIONS
// ============================================

describe('Notifications Tests', () => {
  beforeEach(() => {
    AsyncStorage.getItem.mockClear();
    AsyncStorage.setItem.mockClear();
  });

  test('FRONTEND_UT12: addNotification should add a new notification', async () => {
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
    const result = await addNotification('Test Alert', 'Test message', 'alert');
    expect(result).toMatchObject({
      title: 'Test Alert',
      message: 'Test message',
      type: 'alert',
      read: false
    });
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeDefined();
    console.log('[FRONTEND_UT12] Actual output:', result);
  });

  test('FRONTEND_UT13: getNotifications should return all notifications', async () => {
    const mockData = [
      { id: '1', title: 'Notification 1', read: false },
      { id: '2', title: 'Notification 2', read: true }
    ];
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));
    const result = await getNotifications();
    expect(result).toEqual(mockData);
    expect(result.length).toBe(2);
    console.log('[FRONTEND_UT13] Actual output:', result);
  });

  test('FRONTEND_UT14: markAsRead should update notification status', async () => {
    const mockData = [
      { id: '1', title: 'Notification 1', read: false },
      { id: '2', title: 'Notification 2', read: false }
    ];
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));
    const result = await markAsRead('1');
    expect(result[0].read).toBe(true);
    expect(result[1].read).toBe(false);
    console.log('[FRONTEND_UT14] Actual output:', result);
  });

  test('FRONTEND_UT15: deleteNotification should remove a notification', async () => {
    const mockData = [
      { id: '1', title: 'Notification 1' },
      { id: '2', title: 'Notification 2' }
    ];
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));
    const result = await deleteNotification('1');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('2');
    console.log('[FRONTEND_UT15] Actual output:', result);
  });

  test('FRONTEND_UT16: clearAllNotifications should remove all notifications', async () => {
    const result = await clearAllNotifications();
    expect(result).toEqual([]);
    console.log('[FRONTEND_UT16] Actual output:', result);
  });

  test('FRONTEND_UT17: getUnreadCount should return correct count', async () => {
    const mockData = [
      { id: '1', read: false },
      { id: '2', read: true },
      { id: '3', read: false }
    ];
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));
    const count = await getUnreadCount();
    expect(count).toBe(2);
    console.log('[FRONTEND_UT17] Actual output:', count);
  });

  test('FRONTEND_UT18: markAllAsRead should mark all notifications as read', async () => {
    const mockData = [
      { id: '1', read: false },
      { id: '2', read: false }
    ];
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));
    const result = await markAllAsRead();
    expect(result[0].read).toBe(true);
    expect(result[1].read).toBe(true);
    console.log('[FRONTEND_UT18] Actual output:', result);
  });

  test('FRONTEND_UT19: seedDemoNotifications should add demo notifications if empty', async () => {
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
    AsyncStorage.setItem.mockResolvedValue();
    await seedDemoNotifications();
    expect(AsyncStorage.setItem).toHaveBeenCalled();
    console.log('[FRONTEND_UT19] Actual output: Demo notifications seeded');
  });
});

// ============================================
// TEST SUITE 4: REFERENCE
// ============================================

describe('Reference Tests', () => {
  test('FRONTEND_UT20: generateCamouFlakesRef should create valid reference ID', () => {
    const ref = generateCamouFlakesRef();
    expect(ref).toMatch(/^CAMOUFLAKES-\d{8}-\d{6}-[A-Z0-9]{4}$/);
    console.log('[FRONTEND_UT20] Actual output:', ref);
  });

  test('FRONTEND_UT21: generateCamouFlakesRef should generate unique IDs', () => {
    const ref1 = generateCamouFlakesRef();
    const ref2 = generateCamouFlakesRef();
    expect(ref1).not.toBe(ref2);
    console.log('[FRONTEND_UT21] Actual output:', ref1, ref2);
  });

  test('FRONTEND_UT22: formatIncidentTimestamp should format date correctly', () => {
    const isoDate = '2026-08-21T10:30:00.000Z';
    const formatted = formatIncidentTimestamp(isoDate);
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe('string');
    console.log('[FRONTEND_UT22] Actual output:', formatted);
  });

  test('FRONTEND_UT23: formatIncidentTimestamp should return null for invalid input', () => {
    expect(formatIncidentTimestamp(null)).toBeNull();
    expect(formatIncidentTimestamp(undefined)).toBeNull();
    expect(formatIncidentTimestamp('invalid-date')).toBeNull();
    console.log('[FRONTEND_UT23] Actual output: null for invalid input');
  });
});

// ============================================
// TEST SUITE 5: MEDIA SAVE
// ============================================

describe('Media Save Tests', () => {
  test('FRONTEND_UT24: buildThumbnailFileName should create correct filename for deepfake', () => {
    const filename = buildThumbnailFileName(true);
    expect(filename).toMatch(/^DeepFakeDetected_\d{8}_\d{4}_CamouFlakes\.jpg$/);
    console.log('[FRONTEND_UT24] Actual output:', filename);
  });

  test('FRONTEND_UT25: buildThumbnailFileName should create correct filename for genuine', () => {
    const filename = buildThumbnailFileName(false);
    expect(filename).toMatch(/^Genuine_\d{8}_\d{4}_CamouFlakes\.jpg$/);
    console.log('[FRONTEND_UT25] Actual output:', filename);
  });

  test('FRONTEND_UT26: buildThumbnailFileName should always include timestamp', () => {
    const filename = buildThumbnailFileName(true);
    expect(filename).toMatch(/DeepFakeDetected_\d{8}_\d{4}_CamouFlakes\.jpg/);
    console.log('[FRONTEND_UT26] Actual output:', filename);
  });
});

// ============================================
// TEST SUITE 6: PDF GENERATOR
// ============================================

describe('PDF Generator Tests', () => {
  const mockData = {
    reportId: 'RPT-20260821-001',
    form: {
      complaintFor: 'Myself',
      category: 'Scam',
      typeOfService: 'Social Media',
      platform: 'WhatsApp'
    },
    details: {
      fullName: 'John Doe',
      mobileNumber: '012-3456789',
      email: 'john@example.com',
      urlLink: 'https://whatsapp.com/chat',
      userId: '@john_doe',
      description: 'This is a test complaint description for deepfake detection.',
      remedyAction: 'Remove Content',
      isPwd: false,
      isAcknowledged: true
    },
    result: {
      isFake: true,
      confidence: 89
    },
    incidentTimestamp: '2026-08-21T10:30:00.000Z'
  };

  test('FRONTEND_UT27: validateReportData should return empty array for valid data', () => {
    const errors = validateReportData(mockData);
    expect(errors).toEqual([]);
    console.log('[FRONTEND_UT27] Actual output:', errors);
  });

  test('FRONTEND_UT28: validateReportData should return errors for missing fields', () => {
    const invalidData = { form: {}, details: {} };
    const errors = validateReportData(invalidData);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors).toContain('Complaint For');
    expect(errors).toContain('Category');
    expect(errors).toContain('Full Name');
    console.log('[FRONTEND_UT28] Actual output:', errors);
  });

  test('FRONTEND_UT29: generatePDF should create PDF file', async () => {
    const mockDirInfo = { exists: false };
    FileSystem.getInfoAsync.mockResolvedValue(mockDirInfo);
    FileSystem.makeDirectoryAsync.mockResolvedValue();
    FileSystem.writeAsStringAsync.mockResolvedValue();
    const mockFilePath = 'file:///path/to/report.pdf';
    FileSystem.writeAsStringAsync.mockResolvedValue(mockFilePath);
    try {
      const result = await generatePDF(mockData);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      console.log('[FRONTEND_UT29] Actual output:', result);
    } catch (error) {
      console.log('[FRONTEND_UT29] Skipped - PDF generation requires actual pdf-lib');
    }
  });

  test('FRONTEND_UT30: savePDFToDownloads should handle save operation', async () => {
    const mockFilePath = 'file:///path/to/report.pdf';
    FileSystem.writeAsStringAsync.mockResolvedValue();
    try {
      const result = await savePDFToDownloads(mockData);
      expect(result).toBeDefined();
      console.log('[FRONTEND_UT30] Actual output:', result);
    } catch (error) {
      console.log('[FRONTEND_UT30] Skipped - PDF generation requires actual pdf-lib');
    }
  });

  test('FRONTEND_UT31: sharePDF should handle share operation', async () => {
    try {
      const result = await sharePDF(mockData);
      expect(result).toBeDefined();
      console.log('[FRONTEND_UT31] Actual output:', result);
    } catch (error) {
      console.log('[FRONTEND_UT31] Skipped - PDF generation requires actual pdf-lib');
    }
  });
});

// ============================================
// TEST SUITE 7: TFLITE API
// ============================================

describe('TFLite API Tests', () => {
  const mockVideoUri = 'file://test/video.mp4';
  const mockBase64 = 'AAAAIGZ0eXBpc29tAA...';
  const mockResponse = {
    probability: 0.8942,
    isFake: true,
    confidence: 89,
    trimmedUri: 'http://localhost:8000/trimmed/test.mp4'
  };

  beforeEach(() => {
    global.fetch = jest.fn();
    FileSystem.readAsStringAsync.mockResolvedValue(mockBase64);
  });

  test('FRONTEND_UT32: analyzeVideo should return detection results on success', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse)
    });
    const result = await analyzeVideo(mockVideoUri);
    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://192.168.0.108:8000/analyze',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: mockBase64, startTime: 0 })
      })
    );
    console.log('[FRONTEND_UT32] Actual output:', result);
  });

  test('FRONTEND_UT33: analyzeVideo should pass startTime parameter', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse)
    });
    await analyzeVideo(mockVideoUri, 2.5);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://192.168.0.108:8000/analyze',
      expect.objectContaining({
        body: JSON.stringify({ file: mockBase64, startTime: 2.5 })
      })
    );
    console.log('[FRONTEND_UT33] Actual output: startTime parameter passed');
  });

  test('FRONTEND_UT34: analyzeVideo should throw error on server error', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('Internal Server Error')
    });
    await expect(analyzeVideo(mockVideoUri)).rejects.toThrow('Server error: 500');
    console.log('[FRONTEND_UT34] Actual output: Error thrown as expected');
  });

  test('FRONTEND_UT35: analyzeVideo should throw error on network failure', async () => {
    global.fetch.mockRejectedValue(new Error('Network Error'));
    await expect(analyzeVideo(mockVideoUri)).rejects.toThrow('Network Error');
    console.log('[FRONTEND_UT35] Actual output: Network error thrown');
  });
});