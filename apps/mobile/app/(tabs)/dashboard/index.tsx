import { useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

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
import { appColors } from "@/lib/theme";

const colors = appColors.dark;
const styles = getStyles();

const loadOverview = () => mercuryApi.getOverview();

export default function DashboardScreen() {
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
          tintColor={colors.accent}
        />
      }
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    >
      {/* Hero balance */}
      <View style={styles.section}>
        <Text style={styles.heroValue}>
          {formatCompactCurrency(summary?.cashAvailable)}
        </Text>
        <Text style={styles.heroLabel}>Total cash</Text>
      </View>

      {/* Quick stats */}
      <View style={styles.section}>
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Net position</Text>
            <Text style={styles.statValue}>
              {formatCurrency(summary?.netCurrent)}
            </Text>
          </View>
          <View style={styles.statSeparator} />
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Profiles</Text>
            <Text style={styles.statValue}>
              {data?.data.profiles.length ?? 0}
            </Text>
          </View>
        </View>
        <Text style={styles.footnote}>
          Updated {formatDateTime(data?.meta.asOf ?? null)}
        </Text>
      </View>

      {error ? (
        <View style={styles.section}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {data?.data.profiles.map((profile) => (
        <ProfileCard key={profile.profile.id} profile={profile} />
      ))}
    </ScrollView>
  );
}

function ProfileCard({ profile }: { profile: MercuryOverviewProfile }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{profile.profile.label}</Text>
        <Text style={styles.badge}>
          {titleCase(profile.organization?.kind)}
        </Text>
      </View>
      {profile.organization?.legalBusinessName ? (
        <Text style={styles.footnote}>
          {profile.organization.legalBusinessName}
        </Text>
      ) : null}

      {/* Balances */}
      <View style={styles.statRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Cash</Text>
          <Text style={styles.statValue}>
            {formatCurrency(profile.data.summary.cashAvailable)}
          </Text>
        </View>
        <View style={styles.statSeparator} />
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Credit</Text>
          <Text style={styles.statValue}>
            {profile.capabilities.credit.supported
              ? formatCurrency(profile.data.summary.creditCurrent)
              : "N/A"}
          </Text>
        </View>
      </View>

      {/* Account rows */}
      {profile.data.accounts.map((account, index) => (
        <View key={account.id ?? account.name}>
          {index > 0 ? <View style={styles.rowSeparator} /> : null}
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{account.name}</Text>
              <Text style={styles.rowSubtitle}>
                {titleCase(account.kind)} •••
                {account.accountNumberLast4 ?? "—"}
              </Text>
            </View>
            <Text style={styles.rowValue}>
              {formatCurrency(account.balances.available)}
            </Text>
          </View>
        </View>
      ))}

      {/* Credit accounts */}
      {profile.data.creditAccounts.map((account, index) => (
        <View key={account.id ?? `${profile.profile.id}-credit-${index}`}>
          <View style={styles.rowSeparator} />
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Mercury Card</Text>
              <Text style={styles.rowSubtitle}>
                Current {formatCurrency(account.balances.current)}
              </Text>
            </View>
            <Text style={styles.rowValue}>
              {formatCurrency(account.balances.available)}
            </Text>
          </View>
        </View>
      ))}

      {!profile.capabilities.credit.supported &&
      profile.data.creditAccounts.length === 0 ? (
        <>
          <View style={styles.rowSeparator} />
          <Text style={styles.footnote}>
            {profile.capabilities.credit.error?.message ??
              "Credit not available for this profile."}
          </Text>
        </>
      ) : null}
    </View>
  );
}

function getStyles() {
  return StyleSheet.create({
    screen: {
      backgroundColor: colors.canvas,
    },
    content: {
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 32,
    },
    section: {
      gap: 12,
      padding: 16,
      borderRadius: 12,
      backgroundColor: colors.card,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "600",
      flex: 1,
    },
    badge: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: "600",
    },
    heroValue: {
      color: colors.text,
      fontSize: 42,
      fontWeight: "700",
      letterSpacing: -1,
    },
    heroLabel: {
      color: colors.meta,
      fontSize: 13,
      fontWeight: "500",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    statRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    stat: {
      flex: 1,
      gap: 2,
    },
    statSeparator: {
      width: 1,
      height: 28,
      backgroundColor: colors.border,
      marginHorizontal: 16,
    },
    statLabel: {
      color: colors.meta,
      fontSize: 13,
      fontWeight: "500",
    },
    statValue: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "600",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingVertical: 2,
    },
    rowText: {
      flex: 1,
      gap: 1,
    },
    rowTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "500",
    },
    rowSubtitle: {
      color: colors.meta,
      fontSize: 13,
    },
    rowValue: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
    rowSeparator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    footnote: {
      color: colors.meta,
      fontSize: 13,
    },
    errorText: {
      color: colors.danger,
      fontSize: 15,
    },
  });
}
