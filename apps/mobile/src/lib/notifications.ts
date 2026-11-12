import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { api } from './api';

// New web order alerts (DECISIONS.md D20). The server sends through Expo's push service, which hands the
// message to Firebase Cloud Messaging; Android shows it even when the app is closed.
// In React web you'd use the Push API with a service worker; on a phone the OS owns delivery, and the app
// only registers a token and decides what a tap does.

// A channel is Android's per-app notification category: its importance and sound are fixed when created, and the
// user can change them in system settings. 1.2.0 moved to 'new-orders' for the custom order chime (the file is
// bundled by the expo-notifications plugin in app.json); the phone tells the server which channel it has.
const CHANNEL_ID = 'new-orders';
const OLD_CHANNEL_ID = 'orders';
const ORDER_SOUND = 'new_order.wav';

// While the app is open, still show the banner and play the sound: a parent may be on another screen.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// The token this phone registered, kept so logout can unregister it.
let registeredToken: string | null = null;

// Asks for permission (Android 13+ shows a dialog once) and sends this phone's push token to the server.
// Quietly does nothing on an emulator, when permission is refused, or when Firebase isn't configured:
// the app works the same without alerts, and requests still show on the Orders tab.
async function register(): Promise<void> {
  if (!Device.isDevice) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'New orders',
      importance: AndroidImportance.HIGH,
      sound: ORDER_SOUND,
      vibrationPattern: [0, 300, 200, 300],
    });
    // Otherwise Settings would list two "New orders" categories after updating from 1.1.0.
    await Notifications.deleteNotificationChannelAsync(OLD_CHANNEL_ID);
  }
  const current = await Notifications.getPermissionsAsync();
  const { granted } = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!granted) return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await api('/push-tokens', { method: 'POST', body: JSON.stringify({ token, channelId: CHANNEL_ID }) });
  registeredToken = token;
}

// Called by logout before the auth token is cleared, so this phone stops getting order alerts.
export function unregisterPushToken(): void {
  if (!registeredToken) return;
  api('/push-tokens', { method: 'DELETE', body: JSON.stringify({ token: registeredToken }) }).catch(() => {});
  registeredToken = null;
}

// Mounted once while logged in (root layout).
export function usePushNotifications(isLoggedIn: boolean) {
  const qc = useQueryClient();
  const response = Notifications.useLastNotificationResponse();

  // Registers on every login and app start: the server upserts, and a token can change after a reinstall.
  useEffect(() => {
    if (isLoggedIn) register().catch(() => {});
  }, [isLoggedIn]);

  // A notification arriving while the app is open: refresh requests so the badge and list update.
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() =>
      qc.invalidateQueries({ queryKey: ['orders', 'requests'] }),
    );
    return () => sub.remove();
  }, [qc]);

  // Tapping a notification (also when it started the app) opens that request.
  useEffect(() => {
    const orderId = response?.notification.request.content.data?.orderId;
    if (!isLoggedIn || typeof orderId !== 'number') return;
    Notifications.clearLastNotificationResponse();
    qc.invalidateQueries({ queryKey: ['orders', 'requests'] });
    router.push({ pathname: '/order/[id]', params: { id: String(orderId) } });
  }, [response, isLoggedIn, qc]);
}
