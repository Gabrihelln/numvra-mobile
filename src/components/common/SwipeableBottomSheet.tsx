import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, borderRadius } from '../../theme';

const CLOSE_DISTANCE = 96;
const CLOSE_VELOCITY = 1.05;

interface SwipeableBottomSheetProps {
  isOpen?: boolean;
  onClose: () => void;
  children: React.ReactNode;
  useModal?: boolean;
  maxHeight?: ViewStyle['maxHeight'];
  backgroundColor: string;
  borderColor?: string;
  handleColor: string;
  backdropColor?: string;
  contentStyle?: StyleProp<ViewStyle>;
  scrollContentStyle?: StyleProp<ViewStyle>;
  keyboardBehavior?: 'height' | 'padding' | undefined;
  showsVerticalScrollIndicator?: boolean;
}

export const SwipeableBottomSheet: React.FC<SwipeableBottomSheetProps> = ({
  isOpen = true,
  onClose,
  children,
  useModal = true,
  maxHeight = '88%',
  backgroundColor,
  borderColor,
  handleColor,
  backdropColor = 'rgba(9, 9, 11, 0.5)',
  contentStyle,
  scrollContentStyle,
  keyboardBehavior = Platform.OS === 'ios' ? 'padding' : undefined,
  showsVerticalScrollIndicator = false,
}) => {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(0)).current;
  const scrollOffsetY = useRef(0);
  const closing = useRef(false);

  useEffect(() => {
    if (isOpen) {
      closing.current = false;
      translateY.setValue(0);
    }
  }, [isOpen, translateY]);

  const closeWithAnimation = () => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(translateY, {
      toValue: height,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onClose();
    });
  };

  const panResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gesture) => {
        const isVerticalPull = gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.15;
        return scrollOffsetY.current <= 0 && isVerticalPull;
      },
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        const shouldClose = gesture.dy > CLOSE_DISTANCE || gesture.vy > CLOSE_VELOCITY;
        if (shouldClose) {
          closeWithAnimation();
          return;
        }

        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 90,
          friction: 12,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 90,
          friction: 12,
        }).start();
      },
    }),
    [height, onClose, translateY],
  );

  const sheet = (
    <KeyboardAvoidingView behavior={keyboardBehavior} style={styles.overlay}>
      <TouchableWithoutFeedback onPress={closeWithAnimation}>
        <View style={[styles.backdrop, { backgroundColor: backdropColor }]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor,
            borderColor: borderColor || 'transparent',
            paddingBottom: Math.max(spacing.lg, insets.bottom + spacing.sm),
            transform: [{ translateY }],
          },
          { maxHeight } as ViewStyle,
          contentStyle,
        ]}
        {...panResponder.panHandlers}
      >
        <View style={[styles.handle, { backgroundColor: handleColor }]} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={scrollContentStyle}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          bounces
          scrollEventThrottle={16}
          onScroll={(event) => {
            scrollOffsetY.current = event.nativeEvent.contentOffset.y;
          }}
        >
          {children}
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );

  if (!useModal) return sheet;

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={closeWithAnimation}>
      {sheet}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
});
