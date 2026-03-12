import { DarkTheme } from "@react-navigation/native";

/**
 * Dark-only palette. True neutral grays with green accents.
 * No warm/cool tint in the neutrals — just pure gray scale.
 */
export const appColors = {
  dark: {
    accent: "#34c759", // iOS system green
    accentMuted: "rgba(52, 199, 89, 0.12)",
    border: "#2c2c2e", // iOS dark separator
    canvas: "#000000", // pure black — native iOS dark
    card: "#1c1c1e", // iOS dark elevated
    cardAlt: "#2c2c2e", // iOS dark grouped
    danger: "#ff453a", // iOS system red
    meta: "#8e8e93", // iOS secondary label
    positive: "#30d158", // iOS system green (bright)
    text: "#ffffff",
    warning: "#ffd60a", // iOS system yellow
  },
  // Keep light around for the type but force dark everywhere
  light: {
    accent: "#34c759",
    accentMuted: "rgba(52, 199, 89, 0.12)",
    border: "#2c2c2e",
    canvas: "#000000",
    card: "#1c1c1e",
    cardAlt: "#2c2c2e",
    danger: "#ff453a",
    meta: "#8e8e93",
    positive: "#30d158",
    text: "#ffffff",
    warning: "#ffd60a",
  },
};

export const getAppColors = (_colorScheme?: string | null) => appColors.dark;

export const getNavigationTheme = (_colorScheme?: string | null) => ({
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: appColors.dark.canvas,
    border: appColors.dark.border,
    card: appColors.dark.canvas,
    notification: appColors.dark.accent,
    primary: appColors.dark.accent,
    text: appColors.dark.text,
  },
});

export const getTopBarOptions = (_colorScheme?: string | null) => {
  const colors = appColors.dark;

  return {
    contentStyle: {
      backgroundColor: colors.canvas,
    },
    headerBackTitleVisible: false,
    headerLargeTitle: true,
    headerLargeStyle: {
      backgroundColor: colors.canvas,
    },
    headerShadowVisible: false,
    headerStyle: {
      backgroundColor: colors.canvas,
    },
    headerTintColor: colors.accent,
    headerTitleStyle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "600" as const,
    },
  };
};
