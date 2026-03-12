import { useEffect, useMemo, useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  type MercuryCreditAccount,
  type MercuryOverviewProfile,
  type MercuryOverviewResponse,
  mercuryApi,
} from "@/lib/mercury";
import { getAppColors } from "@/lib/theme";

const loadOverview = () => mercuryApi.getOverview();

type CardItem = {
  account: MercuryCreditAccount;
  organizationName: string | null;
  profile: MercuryOverviewProfile["profile"];
};

export default function CardsScreen() {
  const colorScheme = useColorScheme();
  const colors = getAppColors(colorScheme);
  const styles = getStyles(colors);
  const [data, setData] = useState<MercuryOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(true);

  const refresh = async () => {
    try {
      setError(null);
      setIsRefreshing(true);
      setData(await loadOverview());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load cards.",
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const mercuryCards = useMemo(
    () =>
      (data?.data.profiles ?? []).flatMap<CardItem>((profile) =>
        profile.data.creditAccounts.map((account) => ({
          account,
          organizationName: profile.organization?.legalBusinessName ?? null,
          profile: profile.profile,
        })),
      ),
    [data],
  );
  const unsupportedProfiles = useMemo(
    () =>
      (data?.data.profiles ?? []).filter(
        (profile) =>
          !profile.capabilities.credit.supported &&
          profile.data.creditAccounts.length === 0,
      ),
    [data],
  );
  const summary = data?.data.summary;

  return (
    <ScrollView
      automaticallyAdjustContentInsets
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl
          onRefresh={() => void refresh()}
          refreshing={isRefreshing}
        />
      }
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    >
      <View style={[styles.card, styles.heroCard]}>
        <Text style={styles.eyebrow}>Cards</Text>
        <Text style={styles.heroTitle}>
          Mercury credit balances, with Apple Card waiting on FinanceKit.
        </Text>
        <View style={styles.metricRow}>
          <View style={[styles.metricTile, styles.metricTileSoft]}>
            <Text style={styles.metricLabel}>Mercury current</Text>
            <Text style={styles.metricValue}>
              {formatCurrency(summary?.creditCurrent)}
            </Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricLabel}>Mercury available</Text>
            <Text style={styles.metricValue}>
              {formatCurrency(summary?.creditAvailable)}
            </Text>
          </View>
        </View>
        <Text style={styles.meta}>
          Updated {formatDateTime(data?.meta.asOf ?? null)}
        </Text>
      </View>

      {error ? (
        <View style={[styles.card, styles.noticeCard]}>
          <Text style={styles.cardTitle}>Unable to load cards</Text>
          <Text style={styles.copy}>{error}</Text>
        </View>
      ) : null}

      <View style={[styles.card, styles.appleCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.appleTitle}>Apple Card</Text>
          <View style={styles.appleBadge}>
            <Text style={styles.appleBadgeLabel}>Blocked in dev</Text>
          </View>
        </View>
        <Text style={styles.appleAmount}>Unavailable</Text>
        <Text style={styles.appleCopy}>
          Real Apple Card data cannot load here yet. FinanceKit needs a native
          iPhone build and Apple-granted entitlement for this bundle ID before
          the app can read Apple Card history or balances.
        </Text>
        <Text style={styles.appleMeta}>
          {Platform.OS === "ios"
            ? "iOS can host this later through a custom native module."
            : "Apple Card support will remain iPhone-only even after integration."}
        </Text>
      </View>

      {mercuryCards.length > 0 ? (
        mercuryCards.map(({ account, organizationName, profile }) => (
          <View
            key={account.id ?? `${profile.id}-${account.createdAt}`}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <View style={styles.rowCopy}>
                <Text style={styles.cardTitle}>Mercury Card</Text>
                <Text style={styles.copy}>
                  {profile.label}
                  {organizationName ? ` · ${organizationName}` : ""}
                </Text>
              </View>
              <Text style={styles.status}>{account.status ?? "Active"}</Text>
            </View>
            <View style={styles.metricRow}>
              <View style={styles.metricTile}>
                <Text style={styles.metricLabel}>Current</Text>
                <Text style={styles.metricValue}>
                  {formatCurrency(account.balances.current)}
                </Text>
              </View>
              <View style={styles.metricTile}>
                <Text style={styles.metricLabel}>Available</Text>
                <Text style={styles.metricValue}>
                  {formatCurrency(account.balances.available)}
                </Text>
              </View>
            </View>
            <Text style={styles.meta}>
              Opened {formatDateTime(account.createdAt)}
            </Text>
          </View>
        ))
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No Mercury cards yet</Text>
          <Text style={styles.copy}>
            This workspace is connected, but none of the current Mercury
            profiles returned a credit account.
          </Text>
        </View>
      )}

      {unsupportedProfiles.map((profile) => (
        <View key={profile.profile.id} style={styles.card}>
          <Text style={styles.cardTitle}>{profile.profile.label}</Text>
          <Text style={styles.copy}>
            {profile.capabilities.credit.error?.message ??
              "Credit data is not enabled for this Mercury profile."}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const getStyles = (colors: ReturnType<typeof getAppColors>) =>
  StyleSheet.create({
    screen: {
      backgroundColor: colors.canvas,
    },
    content: {
      gap: 16,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 28,
    },
    card: {
      gap: 14,
      padding: 18,
      borderRadius: 24,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    heroCard: {
      backgroundColor: colors.cardAlt,
    },
    noticeCard: {
      borderColor: colors.danger,
    },
    appleCard: {
      backgroundColor: colors.text,
      borderColor: colors.text,
    },
    eyebrow: {
      color: colors.meta,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 1.6,
      textTransform: "uppercase",
    },
    heroTitle: {
      color: colors.text,
      fontSize: 28,
      fontWeight: "700",
      lineHeight: 32,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    rowCopy: {
      flex: 1,
      gap: 4,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "700",
    },
    appleTitle: {
      color: colors.canvas,
      fontSize: 22,
      fontWeight: "700",
    },
    copy: {
      color: colors.meta,
      fontSize: 15,
      lineHeight: 22,
    },
    appleCopy: {
      color: "rgba(243, 241, 234, 0.82)",
      fontSize: 15,
      lineHeight: 22,
    },
    appleAmount: {
      color: colors.canvas,
      fontSize: 30,
      fontWeight: "700",
      letterSpacing: -0.5,
    },
    appleMeta: {
      color: "rgba(243, 241, 234, 0.62)",
      fontSize: 13,
      lineHeight: 18,
    },
    appleBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.12)",
    },
    appleBadgeLabel: {
      color: colors.canvas,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.4,
      textTransform: "uppercase",
    },
    metricRow: {
      flexDirection: "row",
      gap: 12,
    },
    metricTile: {
      flex: 1,
      gap: 6,
      padding: 14,
      borderRadius: 18,
      backgroundColor: colors.canvas,
      borderWidth: 1,
      borderColor: colors.border,
    },
    metricTileSoft: {
      backgroundColor: colors.card,
    },
    metricLabel: {
      color: colors.meta,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    metricValue: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "700",
    },
    status: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: "700",
      textTransform: "capitalize",
    },
    meta: {
      color: colors.meta,
      fontSize: 13,
      lineHeight: 18,
    },
  });
