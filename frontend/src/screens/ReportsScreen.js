// src/screens/ReportsScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { globalStyles, colors } from '../styles/globalStyles';
import Header from '../components/Header';
import BottomNavBar from '../components/BottomNavBar';
import { getAllReports } from '../utils/database';

export default function ReportsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('All');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setReports(await getAllReports());
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

  const tabs = ['All', 'Draft', 'Submitted'];
  const filteredReports = reports.filter(item => activeTab === 'All' || item.status === activeTab);

  const formatDate = (iso) => {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString(); } catch (_) { return ''; }
  };

  const handleReportPress = (item) => {
    navigation.navigate('ReportDetail', { report: item });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[globalStyles.card, { marginHorizontal: 0 }]}
      onPress={() => handleReportPress(item)}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontWeight: '600', fontSize: 16 }}>{item.reportId}</Text>
          </View>
          <Text style={{ color: colors.gray, fontSize: 12, marginTop: 2 }}>
            {item.platform || 'N/A'} • {formatDate(item.updatedAt || item.incidentTimestamp)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Feather
              name={item.isFake ? 'alert-triangle' : 'check-circle'}
              size={12}
              color={item.isFake ? colors.danger : colors.success}
              style={{ marginRight: 4 }}
            />
            <Text style={{ fontSize: 12, color: item.isFake ? colors.danger : colors.success }}>
              {item.isFake ? 'Deepfake' : 'Genuine'} • {item.confidence || 0}%
            </Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 10,
            backgroundColor: item.status === 'Submitted' ? colors.success : colors.warning,
          }}>
            <Feather
              name={item.status === 'Submitted' ? 'check-circle' : 'edit-2'}
              size={12}
              color="#fff"
              style={{ marginRight: 4 }}
            />
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>
              {item.status}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.gray} style={{ marginTop: 4 }} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={globalStyles.container}>
      <Header navigation={navigation} />

      <View style={globalStyles.contentContainer}>
        <Text style={globalStyles.header}>My Reports</Text>
        <Text style={globalStyles.subtitle}>All reports submitted to MCMC</Text>

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
                color: activeTab === tab ? '#fff' : colors.gray,
              }}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredReports.length === 0 ? (
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: 60,
          }}>
            <Feather name="file-text" size={56} color={colors.lightGray} style={{ marginBottom: 16 }} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.black }}>
              No {activeTab.toLowerCase()} reports found
            </Text>
            <Text style={{ color: colors.gray, fontSize: 14, marginTop: 8, textAlign: 'center' }}>
              Your submitted reports will appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredReports}
            renderItem={renderItem}
            keyExtractor={item => item.reportId}
            contentContainerStyle={{ paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <BottomNavBar navigation={navigation} active="Reports" />
    </View>
  );
}