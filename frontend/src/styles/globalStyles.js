import { StyleSheet } from 'react-native';

export const colors = {
  primary: '#FF6B00',
  primaryDark: '#E55A00',
  primaryLight: '#FF8C38',
  background: '#FFFFFF',
  black: '#1A1A1A',
  darkGray: '#333333',
  gray: '#888888',
  lightGray: '#F0F0F0',
  white: '#FFFFFF',
  // Functional status colors — kept separate from the orange/white/black
  // brand palette on purpose, since error and success states still need
  // to read as red/green regardless of brand identity.
  danger: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
  notificationBadge: '#FF3B30',
};

// Inter substitutes for SF Pro (Apple's font can't be bundled outside
// Apple's own platforms). Requires the useFonts() setup in App.js — see
// setup notes. If that hasn't been added yet, these fall back to the
// platform default font with no crash.
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const globalStyles = StyleSheet.create({
  // --- Containers ---
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },

  // --- Typography ---
  header: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.black,
    marginBottom: 4,
  },
  headerOrange: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.gray,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.black,
    marginBottom: 6,
  },
  select: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.black,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: colors.lightGray,
    borderRadius: 12,
    backgroundColor: colors.white,
    marginBottom: 16,
  },
  greetingText: {
    fontSize: 18,
    fontFamily: fonts.medium,
    color: colors.black,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 28,
    minHeight: 24,
  },

  // --- Inputs ---
  input: {
    borderWidth: 1.5,
    borderColor: colors.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: fonts.regular,
    backgroundColor: colors.white,
    color: colors.black,
    marginBottom: 16,
  },
  inputMultiline: {
    borderWidth: 1.5,
    borderColor: colors.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: fonts.regular,
    backgroundColor: colors.white,
    color: colors.black,
    marginBottom: 16,
    height: 120,
    textAlignVertical: 'top',
  },

  // --- Buttons ---
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },
  secondaryBtn: {
    backgroundColor: colors.black,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    width: '100%',
  },
  secondaryBtnText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },
  outlineBtn: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    width: '100%',
  },
  outlineBtnText: {
    color: colors.primary,
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },
  dangerBtn: {
    backgroundColor: colors.danger,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    width: '100%',
  },
  dangerBtnText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },

  // Row-style action button (icon + stacked text) — layered on top of
  // primaryBtn/secondaryBtn/outlineBtn via a second style in the array.
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
  },
  actionBtnIcon: {
    marginRight: 14,
  },
  actionBtnSubtext: {
    color: colors.white,
    opacity: 0.75,
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: 2,
  },

  // --- Cards ---
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },

  // --- Header ---
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  headerSecondRow:{
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  headerBackBtn: {
    marginRight: 10,
    padding: 2,
  },
  headerSecondTitle: {
    fontSize: 17,
    fontFamily: fonts.semiBold,
    color: colors.black,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.black,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.gray,
    marginTop: 2,
  },

  // --- Notification Bell ---
  bellContainer: {
    position: 'relative',
    padding: 4,
  },
  bellIcon: {
    fontSize: 22,
  },
  // Small circular count badge anchored to the bell — kept as the
  // canonical `badge`/`badgeText` pair (see the pillBadge note below for
  // why this used to be silently overridden).
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.notificationBadge,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontFamily: fonts.bold,
  },

  // --- Attachment ---
  attachment: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.black,
    marginTop: 8,
    marginBottom: 4,
  },
  attachmentDetail: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.gray,
    marginLeft: 8,
    marginBottom: 2,
  },

  // --- Misc ---
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spacer: {
    height: 16,
  },
  // Generic pill badge (status chips etc). Previously this was declared
  // under the SAME key as the notification-count badge above — in a plain
  // JS object literal the second definition silently wins, so the bell's
  // count badge was never actually getting its intended small-circle
  // styling. Split into its own name so both work correctly.
  pillBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginVertical: 8,
  },
  pillBadgeText: {
    color: colors.white,
    fontFamily: fonts.semiBold,
  },

  // --- Bottom Navigation ---
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
    backgroundColor: colors.white,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomNavItem: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  bottomNavIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  bottomNavText: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.gray,
  },
  bottomNavTextActive: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },

  // --- Notification Modal ---
  notificationModal: {
    position: 'absolute',
    top: 90,
    right: 12,
    left: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    maxHeight: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  notificationTitle: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.black,
  },
  notificationClearAll: {
    color: colors.primary,
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  notificationList: {
    maxHeight: 340,
  },
  notificationItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationItemUnread: {
    backgroundColor: '#FFF8F0',
  },
  notificationContent: {
    flex: 1,
    marginRight: 12,
  },
  notificationTitleText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.black,
    marginBottom: 2,
  },
  notificationMessage: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.gray,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.gray,
  },
  notificationDelete: {
    padding: 6,
  },
  notificationDeleteText: {
    fontSize: 16,
    color: colors.danger,
  },
  notificationEmpty: {
    padding: 40,
    alignItems: 'center',
  },
  notificationEmptyText: {
    color: colors.gray,
    fontSize: 14,
    fontFamily: fonts.regular,
  },
  notificationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 999,
  },
});