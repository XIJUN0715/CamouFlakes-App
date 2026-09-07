// src/screens/UploadScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Audio } from 'expo-av';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { globalStyles, colors } from '../styles/globalStyles';
import Header from '../components/Header';
import BottomNavBar from '../components/BottomNavBar';

const MIN_DURATION = 3;
const MAX_DURATION = 30;

export default function UploadScreen({ navigation }) {
  const [recentVideos, setRecentVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permission, requestPermission] = MediaLibrary.usePermissions();

  useFocusEffect(
    useCallback(() => {
      const loadRecentVideos = async () => {
        try {
          if (!permission?.granted) {
            const { status } = await requestPermission();
            if (status !== 'granted') return;
          }
          const media = await MediaLibrary.getAssetsAsync({
            mediaType: 'video',
            sortBy: ['creationTime'],
            first: 12,
          });
          setRecentVideos(media.assets);
        } catch (error) {
          console.warn('Error loading recent videos:', error);
        } finally {
          setLoading(false);
        }
      };
      loadRecentVideos();
    }, [permission])
  );

  const validateVideoDuration = async (uri) => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false }
      );
      const status = await sound.getStatusAsync();
      const duration = status.durationMillis / 1000;
      await sound.unloadAsync();

      if (duration < MIN_DURATION) {
        Alert.alert(
          'Video Too Short',
          `Please upload a video at least ${MIN_DURATION} seconds long.\nCurrent duration: ${duration.toFixed(1)}s.`,
          [{ text: 'Retry', onPress: () => {} }]
        );
        return false;
      }
      if (duration > MAX_DURATION) {
        Alert.alert(
          'Video Too Long',
          `Please upload a video up to ${MAX_DURATION} seconds long.\nCurrent duration: ${duration.toFixed(1)}s.\nYou can trim it later.`,
          [{ text: 'Retry', onPress: () => {} }]
        );
        return false;
      }
      return true;
    } catch (error) {
      Alert.alert(
        'Duration Check Failed',
        `We could not read the video duration. Please ensure the video is valid and between ${MIN_DURATION} and ${MAX_DURATION} seconds.`,
        [{ text: 'Retry', onPress: () => {} }]
      );
      return false;
    }
  };

  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 0.8,
      });
      if (result.canceled) return;

      const uri = result.assets[0].uri;
      const isValid = await validateVideoDuration(uri);
      if (!isValid) return;

      navigation.navigate('TrimVideo', { videoUri: uri, source: 'gallery' });
    } catch (error) {
      Alert.alert(
        'Error',
        'Could not open gallery. Please try again.',
        [{ text: 'Retry', onPress: pickVideo }]
      );
    }
  };

  const handleRecentVideoPress = async (uri) => {
    const isValid = await validateVideoDuration(uri);
    if (!isValid) return;
    navigation.navigate('TrimVideo', { videoUri: uri, source: 'gallery' });
  };

  const renderRecentItem = ({ item }) => (
    <TouchableOpacity
      style={{
        width: '31%',
        margin: '1%',
        aspectRatio: 1,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: colors.lightGray,
      }}
      onPress={() => handleRecentVideoPress(item.uri)}
    >
      {item.uri ? (
        <Image source={{ uri: item.uri }} style={{ width: '100%', height: '100%' }} />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Feather name="film" size={20} color={colors.gray} />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={globalStyles.container}>
      <Header navigation={navigation} title="Upload Video" showBack />

      <View style={globalStyles.contentContainer}>
        <Text style={globalStyles.subtitle}>Select a video from your gallery</Text>

        <View style={[globalStyles.card, { backgroundColor: colors.lightGray, marginVertical: 8 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Feather name="clock" size={16} color={colors.darkGray} style={{ marginRight: 8, marginTop: 2 }} />
            <Text style={{ fontSize: 14, color: colors.darkGray, flex: 1 }}>
              Video must be between <Text style={{ fontWeight: 'bold', color: colors.primary }}>{MIN_DURATION}s</Text>
              {' '}and{' '}
              <Text style={{ fontWeight: 'bold', color: colors.primary }}>{MAX_DURATION}s</Text>
              {'\n'}Longer videos can be trimmed later.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[globalStyles.primaryBtn, globalStyles.actionBtn, { marginBottom: 16, justifyContent: 'center' }]}
          onPress={pickVideo}
        >
          <Feather name="folder" size={20} color={colors.white} style={globalStyles.actionBtnIcon} />
          <Text style={globalStyles.primaryBtnText}>Open Gallery</Text>
        </TouchableOpacity>

        {recentVideos.length > 0 && (
          <>
            <Text style={[globalStyles.subtitle, { fontSize: 14, marginTop: 8 }]}>
              Recent Videos
            </Text>
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                data={recentVideos}
                renderItem={renderRecentItem}
                keyExtractor={(item) => item.id}
                numColumns={3}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
              />
            )}
          </>
        )}
      </View>

      <BottomNavBar navigation={navigation} active="Upload" />
    </View>
  );
}