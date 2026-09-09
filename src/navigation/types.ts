import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  GoalDetail: { goalId: string; title?: string };
  TransactionDetail: { transactionId: string };
  Budget: undefined;
  Plan: undefined;
  Settings: { section?: 'appearance' | 'notifications' | 'language' | 'security' } | undefined;
  Help: undefined;
  Accounts: undefined;
  AddAccount: { accountId?: string } | undefined;
  Categories: undefined;
  CategoryLimits: undefined;
  Subscriptions: undefined;
  Goals: undefined;
  AddTransactionModal: { transaction?: import('../types').Transaction } | undefined;
AddGoalModal: undefined;
  AddSubscriptionModal: undefined;
UpgradeModal: { featureName?: string };
};

export type AuthStackParamList = {
  Landing: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Statement: undefined;
  AddAction: undefined;
  Cards: undefined;
  Profile: undefined;
};

