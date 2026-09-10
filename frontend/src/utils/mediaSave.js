// src/utils/mediaSave.js
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

function safeName(ref, suffix, ext) {
  const cleanRef = (ref || `CamouFlakes-${Date.now()}`).replace(/[^A-Za-z0-9_-]/g, '');
  return `${cleanRef}_${suffix}.${ext}`;
}

export function buildThumbnailFileName(isFake) {
  const resultLabel = isFake ? 'DeepFakeDetected' : 'Genuine';
  const now = new Date();
  const dateStr = now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const timeStr = String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0');
  return `${resultLabel}_${dateStr}_${timeStr}_CamouFlakes.jpg`;
}

async function ensureLocalFile(uri, targetFileName) {
  console.log('[MediaSave] ensureLocalFile:', uri, '->', targetFileName);
  if (/^https?:\/\//i.test(uri)) {
    const dest = FileSystem.cacheDirectory + targetFileName;
    try {
      const { uri: downloadedUri } = await FileSystem.downloadAsync(uri, dest);
      console.log('[MediaSave] Downloaded to:', downloadedUri);
      return downloadedUri;
    } catch (e) {
      console.warn('[MediaSave] Download failed, using original URI:', e.message);
      return uri;
    }
  }

  const uriParts = uri.split('/');
  const originalName = uriParts[uriParts.length - 1];
  if (originalName !== targetFileName) {
    try {
      const destPath = FileSystem.cacheDirectory + targetFileName;
      await FileSystem.copyAsync({ from: uri, to: destPath });
      console.log('[MediaSave] Copied to new name:', destPath);
      return destPath;
    } catch (e) {
      console.warn('[MediaSave] Copy failed, using original URI:', e.message);
      return uri;
    }
  }

  console.log('[MediaSave] Already local with correct name:', uri);
  return uri;
}

async function saveOneToGallery(sourceUri, fileName) {
  console.log('[MediaSave] saveOneToGallery:', sourceUri, 'as', fileName);
  try {
    const perm = await MediaLibrary.requestPermissionsAsync();
    if (perm.status !== 'granted') {
      console.warn('[MediaSave] MediaLibrary permission not granted');
      return null;
    }
    const localUri = await ensureLocalFile(sourceUri, fileName);
    console.log('[MediaSave] Creating asset from:', localUri);
    const asset = await MediaLibrary.createAssetAsync(localUri);
    console.log('[MediaSave] Asset created:', asset.uri);
    return asset.uri;
  } catch (e) {
    console.warn('[MediaSave] Could not save', fileName, 'to gallery:', e.message);
    return null;
  }
}

// Now also returns the FILE NAMES actually used to save each asset -- once
// MediaLibrary.createAssetAsync() hands back its own asset URI, the pretty
// name we gave the file is not reliably recoverable from that URI alone, so
// the only correct fix is to hand it back here, at the point it's known, for
// the caller to carry forward.
export async function saveVideoAndThumbnailToGallery({
  videoUrl,
  thumbnailUrl,
  reportRef,
  isFake,
}) {
  console.log('[MediaSave] Called with:', { videoUrl, thumbnailUrl, reportRef, isFake });
  const results = {
    videoLocalUri: null,
    thumbnailLocalUri: null,
    videoFileName: null,
    thumbnailFileName: null,
  };

  if (videoUrl) {
    const videoFileName = safeName(reportRef, 'video', 'mp4');
    results.videoLocalUri = await saveOneToGallery(videoUrl, videoFileName);
    results.videoFileName = videoFileName;
  }

  if (thumbnailUrl) {
    const thumbName = buildThumbnailFileName(isFake);
    console.log('[MediaSave] Generated thumbnail name:', thumbName);
    results.thumbnailLocalUri = await saveOneToGallery(thumbnailUrl, thumbName);
    results.thumbnailFileName = thumbName;
  }

  console.log('[MediaSave] Results:', results);
  return results;
}