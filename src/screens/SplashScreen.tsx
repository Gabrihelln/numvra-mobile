import React from 'react';
import { Image, ImageBackground, StatusBar, StyleSheet, View } from 'react-native';

const splashBackground = require('../assets/splash/splash-background.png');
const splashAnimation = require('../assets/splash/splash.gif');

/** Único visual de inicialização do app. A sessão é resolvida pelo RootNavigator enquanto ele é exibido. */
export const SplashVisual: React.FC = () => (
  <View style={styles.container}>
    <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
    <ImageBackground source={splashBackground} resizeMode="cover" style={styles.background}>
      <Image source={splashAnimation} resizeMode="contain" style={styles.animation} />
    </ImageBackground>
  </View>
);

// Mantido para compatibilidade com qualquer referência legada à tela de splash.
export const SplashScreen: React.FC = () => <SplashVisual />;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  background: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  animation: { width: '78%', height: '78%' },
});