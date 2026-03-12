import { Stack } from "expo-router";

import { PasscodeLockButton } from "@/lib/passcode";
import { getTopBarOptions } from "@/lib/theme";

export default function DashboardLayout() {
  return (
    <Stack screenOptions={getTopBarOptions()}>
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
