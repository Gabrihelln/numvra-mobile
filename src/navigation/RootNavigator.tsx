import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { TabNavigator } from './TabNavigator';
import { AuthNavigator } from './AuthNavigator';
import { AddScreen } from '../screens/AddScreen';
import { AddSubscriptionScreen } from '../screens/AddSubscriptionScreen';
import { SubscriptionsScreen, GoalsScreen } from '../screens/StatementScreen';
import { BudgetScreen } from '../screens/BudgetScreen';
import { GoalDetailScreen } from '../screens/GoalDetailScreen';
import { PlanScreen } from '../screens/PlanScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { HelpScreen } from '../screens/HelpScreen';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import { AddGoalScreen } from '../screens/AddGoalScreen';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { SplashVisual } from '../screens/SplashScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
export const RootNavigator: React.FC = () => {
  const { colors, isDarkMode } = useTheme();
  const { user, loading } = useAuth();

  const navigationTheme = isDarkMode
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: colors.background,
          card: colors.card,
          text: colors.text,
          border: colors.border,
          primary: colors.primary,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: colors.background,
          card: colors.card,
          text: colors.text,
          border: colors.border,
          primary: colors.primary,
        },
      };

  if (loading) {
    return <SplashVisual />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        key={user ? 'authenticated' : 'unauthenticated'}
        initialRouteName={user ? 'MainTabs' : 'Auth'}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        {user ? (
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} options={{ headerShown: false }} />
            <Stack.Screen name="Budget" component={BudgetScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Plan" component={PlanScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Help" component={HelpScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Subscriptions" component={SubscriptionsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Goals" component={GoalsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="GoalDetail" component={GoalDetailScreen} options={{ headerShown: false }} />
            <Stack.Group screenOptions={{ presentation: 'modal', animation: 'slide_from_bottom' }}>
            <Stack.Screen
              name="AddTransactionModal"
              component={AddScreen}
              options={{
                headerShown: false,
                presentation: 'transparentModal',
                animation: 'slide_from_bottom',
                gestureEnabled: true,
                contentStyle: { backgroundColor: 'transparent' },
              }}
            />
              <Stack.Screen name="AddSubscriptionModal" component={AddSubscriptionScreen} options={{ headerShown: false }} />
              <Stack.Screen name="AddGoalModal" component={AddGoalScreen} options={{ title: 'Nova Meta', headerShown: false }} />
              <Stack.Screen name="UpgradeModal" options={{ title: 'Limite Atingido', headerShown: false }}>
                {() => <PlaceholderScreen title="Upgrade do Plano" subtitle="Desbloqueie limites ilimitados com o plano Pro ou Premium." />}
              </Stack.Screen>
            </Stack.Group>
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

