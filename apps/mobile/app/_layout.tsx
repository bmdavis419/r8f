import { ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  PasscodeBootScreen,
  PasscodeGate,
  PasscodeProvider,
  usePasscode,
} from "@/lib/passcode";
import { getNavigationTheme } from "@/lib/theme";

function RootNavigator() {
  const { isReady, isUnlocked } = usePasscode();

  if (!isReady) {
    return <PasscodeBootScreen />;
  }

  if (!isUnlocked) {
    return <PasscodeGate />;
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <PasscodeProvider>
      <ThemeProvider value={getNavigationTheme(colorScheme)}>
        <RootNavigator />
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      </ThemeProvider>
    </PasscodeProvider>
  );
}
