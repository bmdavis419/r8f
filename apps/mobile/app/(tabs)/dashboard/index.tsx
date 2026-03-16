import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ProportionBar, SparkLine } from "@/components/ui/charts";
import { GlassCard, ScreenGlow } from "@/components/ui/glass";
import {
  formatCompactCurrency,
  formatCurrency,
  formatDateTime,
  titleCase,
} from "@/lib/format";
import {
  type MercuryOverviewProfile,
  type MercuryOverviewResponse,
  type MercuryTransactionsResponse,
  mercuryApi,
} from "@/lib/mercury";
import { appColors } from "@/lib/theme";

const colors = appColors.dark;
const styles = getStyles();

const chartWidth = Dimensions.get("window").width - 64; // 16px padding + 16px card padding each side

export default function DashboardScreen() {
  const [data, setData] = useState<MercuryOverviewResponse | null>(null);
  const [transactions, setTransactions] =
    useState<MercuryTransactionsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setIsRefreshing(true);
      const [overview, txns] = await Promise.all([
        mercuryApi.getOverview(),
        mercuryApi.getTransactions({ limit: 120 }),
      ]);
      setData(overview);
      setTransactions(txns);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load balances.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const summary = data?.data.summary;
  const items = useMemo(() => transactions?.data.items ?? [], [transactions]);

  // Derive a running balance from transactions (oldest → newest).
  // We walk backwards from the current cash balance, subtracting inflows
  // and adding outflows to reconstruct approximate historical balances.
  const balanceHistory = useMemo(() => {
    if (!summary || items.length === 0) return [];

    const sorted = [...items]
      .filter((t) => t.status !== "failed" && t.amount != null)
      .sort((a, b) => {
        const da = a.postedAt ?? a.createdAt ?? "";
        const db = b.postedAt ?? b.createdAt ?? "";
        return da.localeCompare(db);
      });

    if (sorted.length < 3) return [];

    // Walk backwards from current balance
    let balance = summary.cashAvailable;
    const points: number[] = [balance];

    for (let i = sorted.length - 1; i >= 0; i--) {
      const tx = sorted[i];
      const amount = tx.amount ?? 0;
      if (tx.direction === "inflow") {
        balance -= amount;
      } else if (tx.direction === "outflow") {
        balance += amount;
      }
      points.unshift(balance);
    }

    return points;
  }, [summary, items]);

  // Compute cash vs credit allocation for the proportion bar
  const allocation = useMemo(() => {
    if (!summary) return null;

    const cash = Math.max(summary.cashAvailable, 0);
    const credit = Math.abs(summary.creditCurrent);
    const total = cash + credit;

    if (total <= 0) return null;

    return {
      values: [
        { label: "Cash", value: cash, color: colors.accent },
        { label: "Credit used", value: credit, color: colors.warning },
      ],
      total,
    };
  }, [summary]);

  return (
    <View style={styles.screen}>
      <ScreenGlow />
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
      >
        {/* Hero balance + sparkline */}
        <GlassCard>
          <Text style={styles.heroValue}>
            {formatCompactCurrency(summary?.cashAvailable)}
          </Text>
          <Text style={styles.heroLabel}>Total cash</Text>
          {balanceHistory.length >= 3 ? (
            <View style={styles.sparkContainer}>
              <SparkLine
                data={balanceHistory}
                width={chartWidth}
                height={56}
                color={colors.accent}
              />
            </View>
          ) : null}
        </GlassCard>

        {/* Quick stats */}
        <GlassCard>
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
        </GlassCard>

        {/* Allocation bar */}
        {allocation ? (
          <GlassCard>
            <Text style={styles.sectionTitle}>Allocation</Text>
            <ProportionBar
              values={allocation.values}
              total={allocation.total}
            />
          </GlassCard>
        ) : null}

        {error ? (
          <GlassCard>
            <Text style={styles.errorText}>{error}</Text>
          </GlassCard>
        ) : null}

        {data?.data.profiles.map((profile) => (
          <ProfileCard key={profile.profile.id} profile={profile} />
        ))}
      </ScrollView>
    </View>
  );
}

function ProfileCard({ profile }: { profile: MercuryOverviewProfile }) {
  return (
    <GlassCard>
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
    </GlassCard>
  );
}

function getStyles() {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.canvas,
    },
    content: {
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 32,
    },
    sparkContainer: {
      marginTop: 4,
      marginHorizontal: -16,
      marginBottom: -16,
      paddingHorizontal: 16,
      paddingBottom: 16,
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
      backgroundColor: "rgba(255, 255, 255, 0.08)",
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
      backgroundColor: "rgba(255, 255, 255, 0.08)",
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
