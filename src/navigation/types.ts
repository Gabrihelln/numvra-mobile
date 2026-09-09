import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  GoalDetail: { goalId: string; title?: string };
  TransactionDetail: { transactionId: string };
  Budget: undefined;
  Plan: undefined;
  Settings: undefined;
  Help: undefined;
  AddAccount: undefined;
  Categories: undefined;
  CategoryLimits: undefined;
  Subscriptions: undefined;
  Goals: undefined;
  AddTransactionModal: { transaction?: import('../types').Transaction } | undefined;
  AddCardModal: undefined;
  AddGoalModal: undefined;
  AddSubscriptionModal: undefined;
  AddBudgetCategoryModal: undefined;
  NotificationsModal: undefined;
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
