import { NativeTabs } from "expo-router/unstable-native-tabs";
import { DynamicColorIOS, Platform } from "react-native";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { appColors, getAppColors } from "@/lib/theme";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = getAppColors(colorScheme);
  const liquidGlassTextColor =
    Platform.OS === "ios"
      ? DynamicColorIOS({
          dark: appColors.dark.text,
          light: appColors.light.text,
        })
      : colors.text;

  return (
    <NativeTabs
      disableTransparentOnScrollEdge
      labelStyle={{ color: liquidGlassTextColor }}
      tintColor={liquidGlassTextColor}
    >
      <NativeTabs.Trigger name="dashboard">
        <NativeTabs.Trigger.Icon
          sf={{ default: "chart.bar", selected: "chart.bar.fill" }}
        />
        <NativeTabs.Trigger.Label>Overview</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="activity">
        <NativeTabs.Trigger.Icon
          sf={{
            default: "list.bullet.rectangle",
            selected: "list.bullet.rectangle.fill",
          }}
        />
        <NativeTabs.Trigger.Label>Activity</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cards">
        <NativeTabs.Trigger.Icon
          sf={{ default: "creditcard", selected: "creditcard.fill" }}
        />
        <NativeTabs.Trigger.Label>Cards</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="invoices">
        <NativeTabs.Trigger.Icon
          sf={{ default: "doc.text", selected: "doc.text.fill" }}
        />
        <NativeTabs.Trigger.Label>Invoices</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
