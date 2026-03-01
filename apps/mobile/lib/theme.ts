import { DarkTheme, DefaultTheme } from "@react-navigation/native";

export const appColors = {
  dark: {
    accent: "#7ec9a7",
    accentMuted: "#2c6a52",
    border: "#2f342f",
    canvas: "#111411",
    card: "#191d18",
    cardAlt: "#212721",
    danger: "#f08d82",
    meta: "#99a89d",
    positive: "#8cd8b0",
    text: "#f4f7f3",
    warning: "#f0cb74",
  },
  light: {
    accent: "#275f4a",
    accentMuted: "#d8e6de",
    border: "#d6d7cf",
    canvas: "#f3f1ea",
    card: "#fbf8f1",
    cardAlt: "#f2ede4",
    danger: "#9b453c",
    meta: "#6b7069",
    positive: "#2b6a4d",
    text: "#181b17",
    warning: "#8a6a1a",
  },
};

export const getAppColors = (colorScheme?: string | null) =>
  appColors[colorScheme === "dark" ? "dark" : "light"];

export const getNavigationTheme = (colorScheme?: string | null) => {
  const colors = getAppColors(colorScheme);
  const baseTheme = colorScheme === "dark" ? DarkTheme : DefaultTheme;

  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: colors.canvas,
      border: colors.border,
      card: colors.canvas,
      notification: colors.accent,
      primary: colors.accent,
      text: colors.text,
    },
  };
};

export const getTopBarOptions = (colorScheme?: string | null) => {
  const colors = getAppColors(colorScheme);

  return {
    contentStyle: {
      backgroundColor: colors.canvas,
    },
    headerBackTitleVisible: false,
    headerLargeTitle: false,
    headerShadowVisible: false,
    headerStyle: {
      backgroundColor: colors.canvas,
    },
    headerTintColor: colors.text,
    headerTitleAlign: "left" as const,
    headerTitleStyle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700" as const,
    },
  };
};
