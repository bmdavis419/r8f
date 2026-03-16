import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";

import { appColors } from "@/lib/theme";

const colors = appColors.dark;

/**
 * Frosted-glass card using native BlurView.
 * Falls back to a semi-transparent background on Android/web.
 */
export function GlassCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  if (Platform.OS === "ios") {
    return (
      <BlurView intensity={24} tint="dark" style={[glassStyles.card, style]}>
        <View style={glassStyles.inner}>{children}</View>
      </BlurView>
    );
  }

  // Android / web fallback — no BlurView, just translucent bg
  return (
    <View style={[glassStyles.card, glassStyles.fallback, style]}>
      <View style={glassStyles.inner}>{children}</View>
    </View>
  );
}

const glassStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  fallback: {
    backgroundColor: "rgba(28, 28, 30, 0.78)",
  },
  inner: {
    gap: 12,
    padding: 16,
  },
});

/**
 * Subtle green glow that sits behind all screen content.
 * A radial-ish gradient from a dim green at top-center
 * fading to pure black. Positioned absolutely, meant to
 * be placed as the first child of a screen wrapper.
 */
export function ScreenGlow() {
  return (
    <View style={glowStyles.container} pointerEvents="none">
      <LinearGradient
        colors={[
          "rgba(52, 199, 89, 0.15)",
          "rgba(52, 199, 89, 0.06)",
          "transparent",
        ]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={glowStyles.gradient}
      />
    </View>
  );
}

const glowStyles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
  gradient: {
    height: 500,
    width: "100%",
  },
});
