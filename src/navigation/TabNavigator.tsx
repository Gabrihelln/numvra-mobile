import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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

const Tab = createBottomTabNavigator<MainTabParamList>();

type FloatingTabBarProps = BottomTabBarProps & {
  colors: ThemeColors;
  isDarkMode: boolean;
  width: number;
  bottomInset: number;
  openAddTransaction: () => void;
};

const TAB_LABELS: Record<string, string> = {
  Dashboard: 'Início',
  Statement: 'Extrato',
  AddAction: '',
  Cards: 'Cartões',
  Profile: 'Perfil',
};

const FloatingTabBar: React.FC<FloatingTabBarProps> = ({
  state,
  navigation,
  colors,
  isDarkMode,
  bottomInset,
  openAddTransaction,
}) => {
  const tabBarBottom = Math.max(bottomInset, 0);
  const tabBarBackground = isDarkMode ? colors.card : '#FFFFFF';

  const renderIcon = (routeName: string, focused: boolean) => {
    const color = focused ? colors.primary : '#8B92A6';

    if (routeName === 'Dashboard') {
      return <Logo size={22} showText={false} tintColor={focused ? undefined : '#8B92A6'} />;
    }

    if (routeName === 'Statement') {
      return <Receipt size={22} color={color} strokeWidth={2.4} />;
    }

    if (routeName === 'Cards') {
      return <CreditCard size={23} color={color} strokeWidth={2.3} />;
    }

    return <User size={23} color={color} strokeWidth={2.3} />;
  };

  return (
    <View
      style={[
        styles.floatingTabBar,
        {
          left: 0,
          right: 0,
          bottom: tabBarBottom,
          backgroundColor: tabBarBackground,
          borderColor: isDarkMode ? colors.border : '#EEF1F8',
          height: 78,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const isAdd = route.name === 'AddAction';

        const onPress = () => {
          if (isAdd) {
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

        if (isAdd) {
          return (
            <Pressable key={route.key} accessibilityRole="button" onPress={onPress} style={styles.addButtonSlot}>
              <View style={styles.addFloatingButton}>
                <Plus size={38} color="#FFFFFF" strokeWidth={2.2} />
              </View>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            onPress={onPress}
            style={styles.tabButton}
          >
            <View style={styles.iconSlot}>{renderIcon(route.name, focused)}</View>
            <Text style={[styles.tabLabel, { color: focused ? colors.primary : '#8B92A6' }]} numberOfLines={1}>
              {TAB_LABELS[route.name]}
            </Text>
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
          headerShown: false,
        }}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Início' }} />
        <Tab.Screen name="Statement" component={StatementScreen} options={{ title: 'Extrato' }} />
        <Tab.Screen name="AddAction" component={DashboardScreen} options={{ title: 'Adicionar' }} />
        <Tab.Screen name="Cards" component={CardsScreen} options={{ title: 'Cartões' }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 4,
    elevation: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -3 },
  },
  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconSlot: {
    width: 34,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Inter-Regular',
  },
  addButtonSlot: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  addFloatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5748FF',
    marginTop: -14,
    shadowColor: '#5748FF',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
});
