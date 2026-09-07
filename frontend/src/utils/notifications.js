// src/utils/notifications.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@notifications';

// Generate a unique ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

// Get all notifications
export const getNotifications = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting notifications:', error);
    return [];
  }
};

// Add a new notification
export const addNotification = async (title, message, type = 'info') => {
  try {
    const notifications = await getNotifications();
    const newNotification = {
      id: generateId(),
      title,
      message,
      type, // 'alert', 'success', 'info'
      read: false,
      createdAt: new Date().toISOString(),
    };
    const updated = [newNotification, ...notifications];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newNotification;
  } catch (error) {
    console.error('Error adding notification:', error);
    return null;
  }
};

// Mark notification as read
export const markAsRead = async (id) => {
  try {
    const notifications = await getNotifications();
    const updated = notifications.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    );
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return null;
  }
};

// Delete a notification
export const deleteNotification = async (id) => {
  try {
    const notifications = await getNotifications();
    const updated = notifications.filter(notif => notif.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return null;
  }
};

// Clear all notifications
export const clearAllNotifications = async () => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    return [];
  } catch (error) {
    console.error('Error clearing notifications:', error);
    return null;
  }
};

// Get unread count
export const getUnreadCount = async () => {
  try {
    const notifications = await getNotifications();
    return notifications.filter(n => !n.read).length;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

// Mark all as read
export const markAllAsRead = async () => {
  try {
    const notifications = await getNotifications();
    const updated = notifications.map(notif => ({ ...notif, read: true }));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Error marking all as read:', error);
    return null;
  }
};

// Seed demo notifications
export const seedDemoNotifications = async () => {
  const existing = await getNotifications();
  if (existing.length > 0) return;

  const demos = [
    {
      id: generateId(),
      title: 'High Risk Detection Alert',
      message: 'A video you analyzed was flagged as high-risk deepfake with 94% confidence.',
      type: 'alert',
      read: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: generateId(),
      title: 'MCMC Report Submitted',
      message: 'Your report for case #2847 has been successfully submitted to MCMC.',
      type: 'success',
      read: false,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: generateId(),
      title: 'New Feature Available',
      message: 'Live overlay detection now supports WhatsApp and Zoom video calls.',
      type: 'info',
      read: false,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(demos));
};