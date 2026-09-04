import React from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from './types';
import { DashboardScreen } from '../screens/DashboardScreen';
import { StatementScreen } from '../screens/StatementScreen';
import { CardsScreen } from '../screens/CardsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useTheme } from '../contexts/ThemeContext';
import { CreditCard, Plus, Receipt, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '../components/common/Logo';
import { ThemeColors } from '../theme/colors';
import { typography } from '../theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

type FloatingTabBarProps = BottomTabBarProps & {
  colors: ThemeColors;
  isDarkMode: boolean;
  width: number;
  bottomInset: number;
  openAddTransaction: () => void;
};

const FloatingTabBar: React.FC<FloatingTabBarProps> = ({
  state,
  navigation,
  colors,
  isDarkMode,
  width,
  bottomInset,
  openAddTransaction,
}) => {
  const tabBarBottom = Math.max(bottomInset, 12);
  const tabBarMargin = Math.max(18, Math.min(28, Math.round(width * 0.05)));
  const tabBarBackground = isDarkMode ? colors.card : '#FFFFFF';

  const renderIcon = (routeName: string, focused: boolean) => {
    const color = focused ? colors.primary : colors.textMuted;

    if (routeName === 'Dashboard') {
      return <Logo size={22} showText={false} tintColor={focused ? undefined : colors.textMuted} />;
    }

    if (routeName === 'Statement') {
      return <Receipt size={22} color={color} />;
    }

    if (routeName === 'AddAction') {
      return (
        <View style={[styles.addIconFrame, { borderColor: color }]}>
          <Plus size={16} color={color} strokeWidth={2.6} />
        </View>
      );
    }

    if (routeName === 'Cards') {
      return <CreditCard size={22} color={color} />;
    }

    return <User size={22} color={color} />;
  };

  return (
    <View
      style={[
        styles.floatingTabBar,
        {
          left: tabBarMargin,
          right: tabBarMargin,
          bottom: tabBarBottom,
          backgroundColor: tabBarBackground,
          borderColor: isDarkMode ? colors.border : '#EEF1F8',
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;

        const onPress = () => {
          if (route.name === 'AddAction') {
            openAddTransaction();
            return;
          }

          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            onPress={onPress}
            style={styles.tabButton}
          >
            <View style={styles.iconSlot}>
              {renderIcon(route.name, focused)}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

export const TabNavigator: React.FC = () => {
  const { colors, isDarkMode } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  return (
    <View style={styles.container}>
      <Tab.Navigator
        tabBar={(props) => (
          <FloatingTabBar
            {...props}
            colors={colors}
            isDarkMode={isDarkMode}
            width={width}
            bottomInset={insets.bottom}
            openAddTransaction={() => navigation.navigate('AddTransactionModal')}
          />
        )}
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.card,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
          headerTitleStyle: {
            color: colors.text,
            fontWeight: '700',
            fontSize: 18,
          },
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            title: 'Inicio',
            headerShown: false,
          }}
        />

        <Tab.Screen
          name="Statement"
          component={StatementScreen}
          options={{
            title: 'Extrato',
            headerShown: false,
          }}
        />

        <Tab.Screen
          name="AddAction"
          component={DashboardScreen}
          options={{
            title: 'Adicionar',
            headerShown: false,
          }}
        />

        <Tab.Screen
          name="Cards"
          component={CardsScreen}
          options={{
            title: 'Cartoes',
            headerShown: false,
          }}
        />

        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            title: 'Perfil',
            headerShown: false,
          }}
        />
      </Tab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  floatingTabBar: {
    position: 'absolute',
    height: 58,
    borderRadius: 32,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 0,
    elevation: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSlot: {
    width: 48,
    height: 42,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIconFrame: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

