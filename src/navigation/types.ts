import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  GoalDetail: { goalId: string; title?: string };
  Budget: undefined;
  Plan: undefined;
  Settings: undefined;
  Help: undefined;
  Subscriptions: undefined;
  Goals: undefined;
  AddTransactionModal: undefined;
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
