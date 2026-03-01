import { Stack } from "expo-router";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { getTopBarOptions } from "@/lib/theme";

export default function InvoicesLayout() {
  const colorScheme = useColorScheme();

  return (
    <Stack screenOptions={getTopBarOptions(colorScheme)}>
      <Stack.Screen name="index" options={{ title: "Invoices" }} />
    </Stack>
  );
}
