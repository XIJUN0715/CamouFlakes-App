// src/navigation/AppNavigator.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import HomeScreen from '../screens/HomeScreen';
import UploadScreen from '../screens/UploadScreen';
import CameraScreen from '../screens/CameraScreen';
import AnalysingScreen from '../screens/AnalysingScreen';
import ResultScreen from '../screens/ResultScreen';
// HighRiskScreen removed – warning now shown inside AnalysisDetailScreen
import MCMCReportScreen from '../screens/MCMCReportScreen';
import MCMCReportDetailsScreen from '../screens/MCMCReportDetailsScreen';
import MCMCReportPreviewScreen from '../screens/MCMCReportPreviewScreen';
import MCMCReportFlowScreen from '../screens/MCMCReportFlowScreen';
import MCMCWebViewScreen from '../screens/MCMCWebViewScreen';
import ReportSubmittedScreen from '../screens/ReportSubmittedScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ReportsScreen from '../screens/ReportsScreen';
import ReportDetailScreen from '../screens/ReportDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SettingsPreferencesScreen from '../screens/SettingsPreferencesScreen';
import ReportIssueScreen from '../screens/ReportIssueScreen';
import AboutUsScreen from '../screens/AboutUsScreen';
import LiveOverlayScreen from '../screens/LiveOverlayScreen';
import TrimVideoScreen from '../screens/TrimVideoScreen';
import MCMCSignUpWebViewScreen from '../screens/MCMCSignUpWebViewScreen';
import AnalysisDetailScreen from '../screens/AnalysisDetailScreen';

import { colors } from '../styles/globalStyles';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Upload" component={UploadScreen} />
      <Stack.Screen name="LiveOverlay" component={LiveOverlayScreen} />
      <Stack.Screen name="Camera" component={CameraScreen} />
      <Stack.Screen name="Analysing" component={AnalysingScreen} />
      <Stack.Screen name="Result" component={ResultScreen} />
      {/* HighRisk screen removed – warning is now a banner in AnalysisDetailScreen */}
      <Stack.Screen name="MCMCReport" component={MCMCReportScreen} />
      <Stack.Screen name="MCMCReportDetails" component={MCMCReportDetailsScreen} />
      <Stack.Screen name="MCMCReportPreview" component={MCMCReportPreviewScreen} />
      <Stack.Screen name="MCMCReportFlow" component={MCMCReportFlowScreen} />
      <Stack.Screen name="MCMCWebView" component={MCMCWebViewScreen} />
      <Stack.Screen name="ReportSubmitted" component={ReportSubmittedScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="SettingsPreferences" component={SettingsPreferencesScreen} />
      <Stack.Screen name="ReportIssue" component={ReportIssueScreen} />
      <Stack.Screen name="AboutUs" component={AboutUsScreen} />
      <Stack.Screen name="TrimVideo" component={TrimVideoScreen} />
      <Stack.Screen name="MCMCSignUpWebView" component={MCMCSignUpWebViewScreen} />
      <Stack.Screen name="AnalysisDetail" component={AnalysisDetailScreen} />
    </Stack.Navigator>
  );
}