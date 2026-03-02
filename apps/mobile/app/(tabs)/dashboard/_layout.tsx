import { Stack } from "expo-router";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { PasscodeLockButton } from "@/lib/passcode";
import { getTopBarOptions } from "@/lib/theme";

export default function DashboardLayout() {
  const colorScheme = useColorScheme();

  return (
    <Stack screenOptions={getTopBarOptions(colorScheme)}>
      <Stack.Screen
        name="index"
        options={{
          headerRight: () => <PasscodeLockButton />,
          title: "Overview",
        }}
      />
    </Stack>
  );
}
