// src/screens/HistoryScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Feather } from '@expo/vector-icons';
import { globalStyles, colors } from '../styles/globalStyles';
import Header from '../components/Header';
import BottomNavBar from '../components/BottomNavBar';
import { loadHistory, deleteHistoryItem } from '../utils/historyStorage';

export default function HistoryScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('All');
  const [history, setHistory] = useState([]);
  const [thumbnails, setThumbnails] = useState({});

  const loadData = async () => {
    try {
      const data = await loadHistory();
      setHistory(data);
      const newThumbnails = {};
      for (const item of data) {
        if (!item.thumbnail && item.videoUri) {
          try {
            const { uri } = await VideoThumbnails.getThumbnailAsync(item.videoUri, {
              time: 0,
              quality: 0.2,
            });
            newThumbnails[item.id] = uri;
          } catch (_) {
            // ignore thumbnail generation errors
          }
        } else if (item.thumbnail) {
          newThumbnails[item.id] = item.thumbnail;
        }
      }
      setThumbnails(newThumbnails);
    } catch (error) {
      // ignore loading errors
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const tabs = ['All', 'Real', 'Deepfake'];

  const filteredHistory = history.filter(item => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Real') return !item.isFake;
    if (activeTab === 'Deepfake') return item.isFake;
    return true;
  });

  const handleItemPress = (item) => {
    navigation.navigate('AnalysisDetail', { id: item.id, item });
  };

  const handleLongPress = (item) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this history entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHistoryItem(item.id);
              await loadData();
            } catch (_) {
              Alert.alert('Error', 'Failed to delete entry.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[globalStyles.card, { marginHorizontal: 0 }]}
      onPress={() => handleItemPress(item)}
      onLongPress={() => handleLongPress(item)}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {thumbnails[item.id] ? (
          <Image
            source={{ uri: thumbnails[item.id] }}
            style={{ width: 60, height: 60, borderRadius: 8, marginRight: 12 }}
            resizeMode="cover"
          />
        ) : (
          <View style={{
            width: 60,
            height: 60,
            borderRadius: 8,
            marginRight: 12,
            backgroundColor: colors.lightGray,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Feather name="film" size={24} color={colors.gray} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '600', fontSize: 16 }}>{item.title || 'Analysis'}</Text>
          <Text style={{ color: colors.gray, fontSize: 12 }}>{item.date || 'Unknown date'}</Text>
          {item.source && (
            <Text style={{ color: colors.gray, fontSize: 10, marginTop: 2 }}>
              Source: {item.source}
            </Text>
          )}
          <View style={{ flexDirection: 'row', marginTop: 4 }}>
            <Text style={{ fontSize: 12, color: colors.success, marginRight: 8 }}>
              Genuine: {item.genuinePercent || (100 - (item.fakePercent || 0))}%
            </Text>
            <Text style={{ fontSize: 12, color: colors.danger }}>
              Fake: {item.fakePercent || 0}%
            </Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
            backgroundColor: item.isFake ? colors.danger : colors.success,
          }}>
            <Feather
              name={item.isFake ? 'alert-triangle' : 'check-circle'}
              size={12}
              color={colors.white}
              style={{ marginRight: 4 }}
            />
            <Text style={{ color: colors.white, fontSize: 12, fontWeight: '600' }}>
              {item.isFake ? 'Deepfake' : 'Real'}
            </Text>
          </View>
          <Text style={{ color: colors.gray, fontSize: 12, marginTop: 4 }}>
            {item.confidence}% Confidence
          </Text>
          <Feather name="chevron-right" size={16} color={colors.gray} style={{ marginTop: 2 }} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={globalStyles.container}>
      <Header navigation={navigation} />

      <View style={globalStyles.contentContainer}>
        <Text style={globalStyles.header}>History</Text>
        <Text style={globalStyles.subtitle}>Your previous video analyses</Text>

        <View style={{
          flexDirection: 'row',
          marginVertical: 16,
          backgroundColor: colors.lightGray,
          borderRadius: 12,
          padding: 4,
        }}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: activeTab === tab ? colors.primary : 'transparent',
              }}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={{
                textAlign: 'center',
                fontWeight: activeTab === tab ? '600' : '400',
                color: activeTab === tab ? colors.white : colors.gray,
              }}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredHistory.length === 0 ? (
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: 60,
          }}>
            <Feather name="clock" size={56} color={colors.lightGray} style={{ marginBottom: 16 }} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.black }}>
              No {activeTab.toLowerCase()} items found
            </Text>
            <Text style={{ color: colors.gray, fontSize: 14, marginTop: 8, textAlign: 'center' }}>
              Your verification results will appear here after analysis.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredHistory}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <BottomNavBar navigation={navigation} active="History" />
    </View>
  );
}