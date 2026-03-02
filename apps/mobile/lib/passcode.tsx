import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Feather } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  ApiUnauthorizedError,
  onApiUnauthorized,
  setApiPasscode,
  verifyApiPasscode,
} from "@/lib/api";
import { getAppColors } from "@/lib/theme";

const PasscodeContext = createContext<{
  clearError: () => void;
  error: string | null;
  isReady: boolean;
  isSubmitting: boolean;
  isUnlocked: boolean;
  lock: (message?: string) => void;
  unlock: (passcode: string) => Promise<boolean>;
} | null>(null);

const passcodeStoreKey = "r8f.app-passcode";
let secureStoreAvailability: boolean | null = null;

const canUseSecureStore = async () => {
  if (secureStoreAvailability !== null) {
    return secureStoreAvailability;
  }

  try {
    secureStoreAvailability = await SecureStore.isAvailableAsync();
  } catch {
    secureStoreAvailability = false;
  }

  return secureStoreAvailability;
};

const getSavedPasscode = async () => {
  if (!(await canUseSecureStore())) {
    return null;
  }

  try {
    return await SecureStore.getItemAsync(passcodeStoreKey);
  } catch {
    return null;
  }
};

const savePasscode = async (passcode: string) => {
  if (!(await canUseSecureStore())) {
    return;
  }

  try {
    await SecureStore.setItemAsync(passcodeStoreKey, passcode);
  } catch {}
};

const clearSavedPasscode = async () => {
  if (!(await canUseSecureStore())) {
    return;
  }

  try {
    await SecureStore.deleteItemAsync(passcodeStoreKey);
  } catch {}
};

export function PasscodeProvider({ children }: { children: ReactNode }) {
  const [passcode, setPasscode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onApiUnauthorized(() => {
      void clearSavedPasscode();
      setPasscode(null);
      setError("Session expired. Enter the passcode again.");
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const restorePasscode = async () => {
      try {
        const savedPasscode = await getSavedPasscode();

        if (!savedPasscode) {
          return;
        }

        await verifyApiPasscode(savedPasscode);

        if (!isMounted) {
          return;
        }

        setApiPasscode(savedPasscode);
        setPasscode(savedPasscode);
      } catch {
        await clearSavedPasscode();

        if (!isMounted) {
          return;
        }

        setApiPasscode(null);
        setPasscode(null);
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    };

    void restorePasscode();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = {
    clearError: () => setError(null),
    error,
    isReady,
    isSubmitting,
    isUnlocked: passcode !== null,
    lock: (message?: string) => {
      void clearSavedPasscode();
      setApiPasscode(null);
      setPasscode(null);
      setError(message ?? null);
    },
    unlock: async (nextPasscode: string) => {
      const normalizedPasscode = nextPasscode.trim();

      if (!normalizedPasscode) {
        setError("Enter the app passcode.");
        return false;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        await verifyApiPasscode(normalizedPasscode);
        await savePasscode(normalizedPasscode);
        setApiPasscode(normalizedPasscode);
        setPasscode(normalizedPasscode);
        return true;
      } catch (authError) {
        void clearSavedPasscode();
        setApiPasscode(null);
        setPasscode(null);
        setError(
          authError instanceof ApiUnauthorizedError
            ? "Incorrect passcode."
            : authError instanceof Error
              ? authError.message
              : "Unable to unlock the app.",
        );
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
  };

  return (
    <PasscodeContext.Provider value={value}>
      {children}
    </PasscodeContext.Provider>
  );
}

export const usePasscode = () => {
  const context = useContext(PasscodeContext);

  if (!context) {
    throw new Error("usePasscode must be used within PasscodeProvider.");
  }

  return context;
};

export function PasscodeGate() {
  const colorScheme = useColorScheme();
  const colors = getAppColors(colorScheme);
  const styles = getStyles(colors);
  const { clearError, error, isSubmitting, unlock } = usePasscode();
  const [value, setValue] = useState("");

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Protected</Text>
          <Text style={styles.title}>Enter passcode to open r8f.</Text>
          <Text style={styles.copy}>
            This app now requires the shared server passcode before loading any
            Mercury data.
          </Text>

          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSubmitting}
            onChangeText={(nextValue) => {
              if (error) {
                clearError();
              }

              setValue(nextValue);
            }}
            onSubmitEditing={() => void unlock(value)}
            placeholder="Passcode"
            placeholderTextColor={colors.meta}
            secureTextEntry
            selectionColor={colors.accent}
            style={styles.input}
            textContentType="password"
            value={value}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={() => void unlock(value)}
            style={({ pressed }) => [
              styles.button,
              isSubmitting && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>
              {isSubmitting ? "Checking..." : "Unlock app"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

export function PasscodeBootScreen() {
  const colorScheme = useColorScheme();
  const colors = getAppColors(colorScheme);
  const styles = getStyles(colors);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Protected</Text>
          <Text style={styles.title}>Checking saved passcode.</Text>
          <Text style={styles.copy}>
            Reconnecting to the API before opening the app.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

export function PasscodeLockButton() {
  const colorScheme = useColorScheme();
  const colors = getAppColors(colorScheme);
  const { lock } = usePasscode();

  return (
    <Pressable
      accessibilityLabel="Lock app"
      accessibilityRole="button"
      hitSlop={12}
      onPress={() => lock("App locked. Enter the passcode to continue.")}
      style={({ pressed }) => ({
        alignItems: "center",
        flexDirection: "row",
        gap: 6,
        opacity: pressed ? 0.72 : 1,
        paddingHorizontal: 4,
        paddingVertical: 2,
      })}
    >
      <Feather color={colors.text} name="lock" size={18} />
      <Text
        style={{
          color: colors.text,
          fontSize: 14,
          fontWeight: "600",
        }}
      >
        Lock
      </Text>
    </Pressable>
  );
}

const getStyles = (colors: ReturnType<typeof getAppColors>) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.canvas,
    },
    container: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingVertical: 32,
    },
    card: {
      gap: 16,
      padding: 24,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    eyebrow: {
      color: colors.meta,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 1.4,
      textTransform: "uppercase",
    },
    title: {
      color: colors.text,
      fontSize: 30,
      fontWeight: "700",
      lineHeight: 34,
    },
    copy: {
      color: colors.meta,
      fontSize: 16,
      lineHeight: 24,
    },
    input: {
      minHeight: 54,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.canvas,
      color: colors.text,
      fontSize: 18,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    error: {
      color: colors.danger,
      fontSize: 14,
      lineHeight: 20,
    },
    button: {
      minHeight: 52,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 999,
      backgroundColor: colors.accent,
      paddingHorizontal: 18,
    },
    buttonDisabled: {
      opacity: 0.72,
    },
    buttonPressed: {
      opacity: 0.84,
    },
    buttonText: {
      color: colors.canvas,
      fontSize: 16,
      fontWeight: "700",
    },
  });
