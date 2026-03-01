import { useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  formatCompactCurrency,
  formatCurrency,
  formatDateTime,
  titleCase,
} from "@/lib/format";
import {
  type MercuryOverviewProfile,
  type MercuryOverviewResponse,
  mercuryApi,
} from "@/lib/mercury";
import { getAppColors } from "@/lib/theme";

const loadOverview = () => mercuryApi.getOverview();

export default function DashboardScreen() {
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
          : "Unable to load balances.",
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const summary = data?.data.summary;

  return (
    <ScrollView
      automaticallyAdjustContentInsets
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
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
        <Text style={styles.eyebrow}>Total cash</Text>
        <Text style={styles.heroValue}>
          {formatCompactCurrency(summary?.cashAvailable)}
        </Text>
        <Text style={styles.copy}>
          Personal and business Mercury balances in one read.
        </Text>
        <View style={styles.metricRow}>
          <View style={[styles.metricTile, styles.metricTileSoft]}>
            <Text style={styles.metricLabel}>Net position</Text>
            <Text style={styles.metricValue}>
              {formatCurrency(summary?.netCurrent)}
            </Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricLabel}>Profiles</Text>
            <Text style={styles.metricValue}>
              {data?.data.profiles.length ?? 0}
            </Text>
          </View>
        </View>
        <Text style={styles.meta}>
          Updated {formatDateTime(data?.meta.asOf ?? null)}
        </Text>
      </View>

      {error ? (
        <View style={[styles.card, styles.noticeCard]}>
          <Text style={styles.cardTitle}>Unable to load overview</Text>
          <Text style={styles.copy}>{error}</Text>
        </View>
      ) : null}

      {data?.data.profiles.map((profile) => (
        <ProfileCard key={profile.profile.id} profile={profile} />
      ))}
    </ScrollView>
  );
}

function ProfileCard({ profile }: { profile: MercuryOverviewProfile }) {
  const colorScheme = useColorScheme();
  const colors = getAppColors(colorScheme);
  const styles = getStyles(colors);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.rowCopy}>
          <Text style={styles.cardTitle}>{profile.profile.label}</Text>
          <Text style={styles.meta}>
            {profile.organization?.legalBusinessName}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>
            {titleCase(profile.organization?.kind)}
          </Text>
        </View>
      </View>

      <View style={styles.metricRow}>
        <View style={styles.metricTile}>
          <Text style={styles.metricLabel}>Cash</Text>
          <Text style={styles.metricValue}>
            {formatCurrency(profile.data.summary.cashAvailable)}
          </Text>
        </View>
        <View style={styles.metricTile}>
          <Text style={styles.metricLabel}>Cards</Text>
          <Text style={styles.metricValue}>
            {profile.capabilities.credit.supported
              ? formatCurrency(profile.data.summary.creditCurrent)
              : "Unavailable"}
          </Text>
        </View>
      </View>

      <View style={styles.accountList}>
        {profile.data.accounts.map((account) => (
          <View key={account.id ?? account.name} style={styles.accountRow}>
            <View style={styles.rowCopy}>
              <Text style={styles.accountName}>{account.name}</Text>
              <Text style={styles.accountMeta}>
                {titleCase(account.kind)} •••{account.accountNumberLast4 ?? "—"}
              </Text>
            </View>
            <Text style={styles.accountBalance}>
              {formatCurrency(account.balances.available)}
            </Text>
          </View>
        ))}
      </View>

      {profile.data.creditAccounts.length > 0 ? (
        <View style={[styles.card, styles.innerCard]}>
          <Text style={styles.cardTitle}>Credit</Text>
          {profile.data.creditAccounts.map((account) => (
            <View
              key={account.id ?? account.createdAt}
              style={styles.creditRow}
            >
              <View style={styles.rowCopy}>
                <Text style={styles.accountName}>Mercury Card</Text>
                <Text style={styles.accountMeta}>
                  Current {formatCurrency(account.balances.current)}
                </Text>
              </View>
              <Text style={styles.accountBalance}>
                {formatCurrency(account.balances.available)}
              </Text>
            </View>
          ))}
        </View>
      ) : !profile.capabilities.credit.supported ? (
        <View style={[styles.card, styles.innerCard]}>
          <Text style={styles.cardTitle}>Credit</Text>
          <Text style={styles.copy}>
            {profile.capabilities.credit.error?.message ??
              "Credit balances are not available for this profile."}
          </Text>
        </View>
      ) : null}
    </View>
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
    heroCard: {
      backgroundColor: colors.cardAlt,
    },
    card: {
      gap: 14,
      padding: 18,
      borderRadius: 24,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    innerCard: {
      padding: 16,
      borderRadius: 20,
      backgroundColor: colors.cardAlt,
    },
    noticeCard: {
      borderColor: colors.danger,
    },
    eyebrow: {
      color: colors.meta,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 1.6,
      textTransform: "uppercase",
    },
    heroValue: {
      color: colors.text,
      fontSize: 40,
      fontWeight: "700",
      lineHeight: 42,
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    rowCopy: {
      flex: 1,
      gap: 4,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.accentMuted,
    },
    badgeLabel: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: "700",
    },
    metricRow: {
      flexDirection: "row",
      gap: 12,
    },
    metricTile: {
      flex: 1,
      gap: 4,
      padding: 14,
      borderRadius: 18,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    metricTileSoft: {
      backgroundColor: colors.canvas,
    },
    metricLabel: {
      color: colors.meta,
      fontSize: 13,
      fontWeight: "600",
    },
    metricValue: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "700",
    },
    cardTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "700",
    },
    copy: {
      color: colors.meta,
      fontSize: 15,
      lineHeight: 22,
    },
    meta: {
      color: colors.meta,
      fontSize: 13,
      lineHeight: 18,
    },
    accountList: {
      gap: 10,
    },
    accountRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    creditRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    accountName: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
    },
    accountMeta: {
      color: colors.meta,
      fontSize: 13,
      lineHeight: 18,
    },
    accountBalance: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700",
    },
  });
