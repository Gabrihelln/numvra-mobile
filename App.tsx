import React, { useEffect } from 'react';
import { Alert, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { CategoryProvider } from './src/contexts/CategoryContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { pushNotificationService } from './src/services/pushNotificationService';
import { configureTypography } from './src/theme/configureTypography';

configureTypography();

const AppContent: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const unsubscribeTokenRefresh = pushNotificationService.listenToTokenRefresh(user.uid);
    const unsubscribeForeground = pushNotificationService.listenToForegroundMessages((message) => {
      const title = message.notification?.title || message.data?.title;
      const body = message.notification?.body || message.data?.body || message.data?.message;

      if (title || body) {
        Alert.alert(String(title || 'Notificacao'), String(body || ''));
      }
    });
    const unsubscribeOpened = pushNotificationService.listenToNotificationOpens(() => {});

    pushNotificationService.getInitialNotification().catch((err) => {
      console.warn('Unable to read initial push notification:', err);
    });

    return () => {
      unsubscribeTokenRefresh();
      unsubscribeForeground();
      unsubscribeOpened();
    };
  }, [user]);

  return (
    <>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <RootNavigator />
    </>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <CategoryProvider>
            <AppContent />
          </CategoryProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

