// src/utils/tflite.js
import * as FileSystem from 'expo-file-system/legacy';

// Replace with your actual IP
const API_URL = 'http://172.25.223.105:8000/analyze';

export const analyzeVideo = async (videoUri, startTime = 0) => {
  try {
    const base64 = await FileSystem.readAsStringAsync(videoUri, {
      encoding: 'base64'
    });

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: base64, startTime: startTime }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return {
      probability: result.probability,
      isFake: result.isFake,
      confidence: result.confidence,
      processingTime: result.processing_time,
      trimmedUri: result.trimmedUri,
      thumbnailUri: result.thumbnailUri,
      reasoning: result.reasoning,
      segments: result.segments,
      jobId: result.jobId,        // ← NEW: job ID for polling evidence
    };
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// ─── NEW: Poll for evidence (trimmed video + thumbnail) ───
export const pollEvidence = async (jobId, baseUrl = 'http://172.25.223.105:8000') => {
  try {
    const response = await fetch(`${baseUrl}/evidence/${jobId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch evidence: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Evidence polling failed:', error);
    return { ready: false, trimmedUri: null, thumbnailUri: null };
  }
};