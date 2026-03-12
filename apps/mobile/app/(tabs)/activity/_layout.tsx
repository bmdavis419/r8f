import { Stack } from "expo-router";

import { PasscodeLockButton } from "@/lib/passcode";
import { getTopBarOptions } from "@/lib/theme";

export default function ActivityLayout() {
  return (
    <Stack screenOptions={getTopBarOptions()}>
      <Stack.Screen
        name="index"
        options={{
          headerRight: () => <PasscodeLockButton />,
          title: "Activity",
        }}
      />
    </Stack>
  );
}
