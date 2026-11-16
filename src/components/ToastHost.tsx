// src/components/ToastHost.tsx — the global toast overlay (guardrail G6).
// ONLY App.tsx mounts this component; nothing else renders a toast UI.
// Components elsewhere must never import the toast emitter — only this host
// renders toasts (G6 grep gate on src/components/ stays empty, no exceptions).
// they emit intent via callbacks and the root toasts the truth.
//
// - pointerEvents 'none': the overlay never intercepts touches.
// - accessibilityLiveRegion 'polite' + accessibilityLabel = message: TalkBack
//   announces every toast (G8).
// - AccessibilityInfo.isReduceMotionEnabled honored: values snap instead of
//   animating (G8 / SPEC §17).
// - Styling comes from useTheme() tokens — no hardcoded colors (G5).
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  getLatestToast,
  subscribeToasts,
  type ToastState,
} from '../lib/toast';
import { useTheme } from '../theme/tokens';

// How long the latest message stays up before fading out (SPEC task: ~2.5 s).
const VISIBLE_MS = 2500;
const FADE_MS = 150;
const SLIDE_FROM = -8; // px above the resting position while hidden

export function ToastHost() {
  const { tokens } = useTheme();
  const [toast, setToast] = useState<ToastState | null>(null);
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(SLIDE_FROM)).current;
  const reduceMotion = useRef(false);

  // Reduce-motion preference — honored on every show/hide below (G8).
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        reduceMotion.current = enabled === true;
      })
      .catch(() => {
        reduceMotion.current = false; // API unavailable → animate normally
      });
  }, []);

  // Subscribe once. Also adopt a message emitted before this host mounted —
  // App.tsx gates its shell on theme readiness, so early toasts are not lost.
  useEffect(() => {
    const pending = getLatestToast();
    if (pending && Date.now() - pending.issuedAt < VISIBLE_MS) {
      setToast(pending);
    }
    return subscribeToasts((next) => {
      setToast(next); // latest wins — replaces whatever is on screen
    });
  }, []);

  // Every new message (or re-show) becomes visible and schedules its own hide;
  // the cleanup clears the previous timer so a rapid second toast gets a full
  // 2.5 s on screen.
  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  // Fade + slide, or a straight snap when reduce motion is on.
  useEffect(() => {
    const toOpacity = visible ? 1 : 0;
    const toTranslate = visible ? 0 : SLIDE_FROM;
    if (reduceMotion.current) {
      opacity.setValue(toOpacity);
      translateY.setValue(toTranslate);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: toOpacity,
        duration: FADE_MS,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: toTranslate,
        duration: FADE_MS,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, opacity, translateY]);

  return (
    <View pointerEvents="none" style={styles.host}>
      {toast === null ? null : (
        <Animated.View
          accessibilityLabel={toast.message}
          accessibilityLiveRegion="polite"
          style={[
            styles.toast,
            styles.toastShadow,
            {
              backgroundColor: tokens.surface,
              borderRadius: tokens.radiusCard,
              opacity,
              transform: [{ translateY }],
              shadowColor: tokens.ink,
            },
          ]}
        >
          <Text style={[styles.message, { color: tokens.ink }]}>
            {toast.message}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 24,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 999, // above map/sheet/FAB — real stacking comes from mount order
  },
  toast: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 12, // Android shadow + z-lift (color comes from the token above)
  },
  toastShadow: {
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  message: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14, // ≥ 11 floor (G8)
    textAlign: 'center',
  },
});
