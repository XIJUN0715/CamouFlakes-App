// __tests__/setup.js

// 1. Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  mergeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
}));

// 2. Mock expo-file-system
jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  downloadAsync: jest.fn(),
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(),
  cacheDirectory: '/mock/cache/',
  documentDirectory: '/mock/documents/',
  StorageAccessFramework: {
    requestDirectoryPermissionsAsync: jest.fn(),
    createFileAsync: jest.fn(),
  },
}));

// 3. Mock expo-media-library
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  createAssetAsync: jest.fn().mockResolvedValue({ uri: 'mock://asset.mp4' }),
  getAssetsAsync: jest.fn().mockResolvedValue({ assets: [] }),
  MediaType: { video: 'video', photo: 'photo' },
  SortBy: { creationTime: 'creationTime' },
}));

// 4. Mock expo-sharing
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(),
}));

// 5. Mock expo-device
jest.mock('expo-device', () => ({
  modelName: 'Test Device',
  osName: 'Android Test',
}));

// 6. Mock expo-constants
jest.mock('expo-constants', () => ({
  expoConfig: { version: '1.0.0' },
  default: { expoConfig: { version: '1.0.0' } },
}));

// 7. Mock expo-av
jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn().mockResolvedValue({
        sound: { playAsync: jest.fn(), unloadAsync: jest.fn() },
        status: { durationMillis: 5000 },
      }),
    },
  },
}));

// 8. Mock expo-video-thumbnails
jest.mock('expo-video-thumbnails', () => ({
  getThumbnailAsync: jest.fn().mockResolvedValue({ uri: 'mock://thumbnail.jpg' }),
}));

// 9. Mock pdf-lib
jest.mock('pdf-lib', () => ({
  PDFDocument: {
    create: jest.fn(),
  },
  rgb: jest.fn(),
  StandardFonts: { Helvetica: 'Helvetica', HelveticaBold: 'HelveticaBold' },
}));

// 10. Mock base64-js
jest.mock('base64-js', () => ({
  fromByteArray: jest.fn(),
  toByteArray: jest.fn(),
}));