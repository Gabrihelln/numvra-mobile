import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AuthProvider>{children}</AuthProvider>;
};

export const useFirebase = () => {
  return useAuth();
};
