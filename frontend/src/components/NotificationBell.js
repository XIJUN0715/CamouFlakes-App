// src/components/NotificationBell.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { globalStyles, colors } from '../styles/globalStyles';
import {
  getNotifications,
  deleteNotification,
  markAsRead,
  clearAllNotifications,
  getUnreadCount,
  markAllAsRead,
} from '../utils/notifications';

const MAX_DISPLAYED_COUNT = 99;

export default function NotificationBell({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const slideAnim = useRef(new Animated.Value(-300)).current;

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    const data = await getNotifications();
    setNotifications(data);
    const count = await getUnreadCount();
    setUnreadCount(Math.max(0, count));
  };

  const toggleDropdown = () => {
    if (showDropdown) {
      closeDropdown();
    } else {
      setShowDropdown(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }).start();
    }
  };

  const closeDropdown = () => {
    Animated.timing(slideAnim, {
      toValue: -300,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowDropdown(false);
    });
  };

  const handleDelete = async (id) => {
    const updated = await deleteNotification(id);
    if (updated) {
      setNotifications(updated);
      const count = await getUnreadCount();
      setUnreadCount(Math.max(0, count));
    }
  };

  const handleClearAll = async () => {
    await clearAllNotifications();
    setNotifications([]);
    setUnreadCount(0);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    await loadNotifications();
  };

  const handleNotificationPress = async (item) => {
    if (!item.read) {
      await markAsRead(item.id);
      await loadNotifications();
    }
    closeDropdown();
    if (item.type === 'alert') {
      navigation.navigate('History');
    } else if (item.type === 'success') {
      navigation.navigate('Reports');
    }
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[
        globalStyles.notificationItem,
        !item.read && globalStyles.notificationItemUnread,
      ]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={globalStyles.notificationContent}>
        <Text style={globalStyles.notificationTitleText}>{item.title}</Text>
        <Text style={globalStyles.notificationMessage}>{item.message}</Text>
        <Text style={globalStyles.notificationTime}>{formatTime(item.createdAt)}</Text>
      </View>
      <TouchableOpacity
        style={globalStyles.notificationDelete}
        onPress={() => handleDelete(item.id)}
      >
        <Feather name="x" size={16} color={colors.danger} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity style={globalStyles.bellContainer} onPress={toggleDropdown}>
        <Feather name="bell" size={22} color={colors.black} />
        {unreadCount > 0 && (
          <View style={globalStyles.badge}>
            <Text style={globalStyles.badgeText}>
              {unreadCount > MAX_DISPLAYED_COUNT ? `${MAX_DISPLAYED_COUNT}+` : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {showDropdown && (
        <>
          <TouchableWithoutFeedback onPress={closeDropdown}>
            <View style={globalStyles.notificationOverlay} />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              globalStyles.notificationModal,
              {
                transform: [{ translateY: slideAnim }],
                opacity: slideAnim.interpolate({
                  inputRange: [-300, 0],
                  outputRange: [0, 1],
                }),
              },
            ]}
          >
            <View style={globalStyles.notificationHeader}>
              <Text style={globalStyles.notificationTitle}>Notifications</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {notifications.length > 0 && (
                  <>
                    <TouchableOpacity onPress={handleMarkAllRead} style={{ marginRight: 12 }}>
                      <Text style={globalStyles.notificationClearAll}>Mark all read</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleClearAll} style={{ marginRight: 12 }}>
                      <Text style={globalStyles.notificationClearAll}>Clear all</Text>
                    </TouchableOpacity>
                  </>
                )}
                {/* Close button */}
                <TouchableOpacity onPress={closeDropdown}>
                  <Feather name="x" size={22} color={colors.black} />
                </TouchableOpacity>
              </View>
            </View>

            {notifications.length === 0 ? (
              <View style={globalStyles.notificationEmpty}>
                <Feather name="bell-off" size={36} color={colors.gray} style={{ marginBottom: 8 }} />
                <Text style={globalStyles.notificationEmptyText}>No notifications</Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                renderItem={renderNotification}
                keyExtractor={item => item.id}
                style={globalStyles.notificationList}
                showsVerticalScrollIndicator={false}
              />
            )}
          </Animated.View>
        </>
      )}
    </>
  );
}