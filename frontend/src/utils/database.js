// src/utils/database.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const REPORTS_KEY = '@camouflakes_reports';

export const getAllReports = async () => {
  try {
    const data = await AsyncStorage.getItem(REPORTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load reports:', error);
    return [];
  }
};

export const upsertReport = async (report) => {
  try {
    const existing = await getAllReports();
    const index = existing.findIndex(r => r.reportId === report.reportId);
    
    const updatedReport = {
      ...report,
      updatedAt: new Date().toISOString(),
      // Ensure thumbnail is preserved
      thumbnailUri: report.thumbnailUri || null,
    };
    
    if (index >= 0) {
      // Update existing report - preserve thumbnail if not provided
      if (!updatedReport.thumbnailUri && existing[index].thumbnailUri) {
        updatedReport.thumbnailUri = existing[index].thumbnailUri;
      }
      existing[index] = updatedReport;
    } else {
      // Add new report
      existing.unshift({
        ...updatedReport,
        createdAt: new Date().toISOString(),
      });
    }
    
    await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(existing));
    return existing;
  } catch (error) {
    console.error('Failed to upsert report:', error);
    throw error;
  }
};

export const getReportById = async (reportId) => {
  try {
    const reports = await getAllReports();
    return reports.find(r => r.reportId === reportId) || null;
  } catch (error) {
    console.error('Failed to get report:', error);
    return null;
  }
};

export const clearAllReports = async () => {
  try {
    await AsyncStorage.removeItem(REPORTS_KEY);
  } catch (error) {
    console.error('Failed to clear reports:', error);
  }
};