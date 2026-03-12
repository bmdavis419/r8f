import { Stack } from "expo-router";

import { PasscodeLockButton } from "@/lib/passcode";
import { getTopBarOptions } from "@/lib/theme";

export default function InvoicesLayout() {
  return (
    <Stack screenOptions={getTopBarOptions()}>
      <Stack.Screen
        name="index"
        options={{
          headerRight: () => <PasscodeLockButton />,
          title: "Invoices",
        }}
      />
    </Stack>
  );
}
