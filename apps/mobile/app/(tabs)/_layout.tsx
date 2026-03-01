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
      <NativeTabs.Trigger
        name="dashboard"
        contentStyle={{ backgroundColor: colors.canvas }}
      >
        <NativeTabs.Trigger.Icon
          sf={{ default: "chart.bar", selected: "chart.bar.fill" }}
          md="home"
        />
        <NativeTabs.Trigger.Label>Overview</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="activity"
        contentStyle={{ backgroundColor: colors.canvas }}
      >
        <NativeTabs.Trigger.Icon
          sf={{
            default: "list.bullet.rectangle",
            selected: "list.bullet.rectangle.fill",
          }}
          md="article"
        />
        <NativeTabs.Trigger.Label>Activity</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="invoices"
        contentStyle={{ backgroundColor: colors.canvas }}
      >
        <NativeTabs.Trigger.Icon
          sf={{ default: "doc.text", selected: "doc.text.fill" }}
          md="receipt_long"
        />
        <NativeTabs.Trigger.Label>Invoices</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
