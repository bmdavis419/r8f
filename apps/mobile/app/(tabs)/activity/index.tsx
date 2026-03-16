import { FlashList } from "@shopify/flash-list";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BarChart } from "@/components/ui/charts";
import { GlassCard, ScreenGlow } from "@/components/ui/glass";
import { formatCurrency, formatDateTime, titleCase } from "@/lib/format";
import {
  type MercuryTransaction,
  type MercuryTransactionsResponse,
  mercuryApi,
} from "@/lib/mercury";
import { appColors } from "@/lib/theme";

const colors = appColors.dark;
const styles = getStyles();

const fetchLimit = 120;
const pageSize = 24;
const statusOptions = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Posted", value: "sent" },
  { label: "Failed", value: "failed" },
] as const;
const directionOptions = [
  { label: "All", value: "all" },
  { label: "Inflow", value: "inflow" },
  { label: "Outflow", value: "outflow" },
] as const;

const monthShort = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Group transactions into recent weeks and compute inflow/outflow per week. */
function buildWeeklyCashFlow(items: MercuryTransaction[]) {
  const validItems = items.filter(
    (t) => t.amount != null && t.status !== "failed",
  );

  if (validItems.length === 0) return [];

  // Determine the date range — group into calendar weeks (Mon–Sun)
  const now = new Date();
  const weeks: {
    label: string;
    positive: number;
    negative: number;
    start: Date;
  }[] = [];

  // Build 6 weeks going back from current week
  for (let w = 5; w >= 0; w--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() - w * 7 + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const label =
      w === 0
        ? "This wk"
        : w === 1
          ? "Last wk"
          : `${monthShort[weekStart.getMonth()]} ${weekStart.getDate()}`;

    weeks.push({
      label,
      positive: 0,
      negative: 0,
      start: weekStart,
    });
  }

  for (const tx of validItems) {
    const txDate = new Date(tx.postedAt ?? tx.createdAt ?? "");
    if (Number.isNaN(txDate.getTime())) continue;

    for (let w = 0; w < weeks.length; w++) {
      const weekStart = weeks[w].start;
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      if (txDate >= weekStart && txDate < weekEnd) {
        const amount = Math.abs(tx.amount ?? 0);
        if (tx.direction === "inflow") {
          weeks[w].positive += amount;
        } else if (tx.direction === "outflow") {
          weeks[w].negative += amount;
        }
        break;
      }
    }
  }

  // Only return weeks that have any data, but keep surrounding empty weeks for context
  const firstWithData = weeks.findIndex(
    (w) => w.positive > 0 || w.negative > 0,
  );
  if (firstWithData === -1) return [];

  return weeks.slice(firstWithData).map(({ label, positive, negative }) => ({
    label,
    positive,
    negative,
  }));
}

export default function ActivityScreen() {
  const [data, setData] = useState<MercuryTransactionsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [selectedProfile, setSelectedProfile] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedDirection, setSelectedDirection] = useState("all");

  const loadTransactions = useCallback(async (mode: "initial" | "refresh") => {
    try {
      setError(null);
      if (mode === "refresh") {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setVisibleCount(pageSize);
      setData(await mercuryApi.getTransactions({ limit: fetchLimit }));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load activity.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadTransactions("initial");
  }, [loadTransactions]);

  const items = useMemo(() => data?.data.items ?? [], [data]);

  const weeklyCashFlow = useMemo(() => buildWeeklyCashFlow(items), [items]);

  // Compute summary stats
  const flowSummary = useMemo(() => {
    const posted = items.filter(
      (t) => t.amount != null && t.status !== "failed",
    );
    const inflow = posted
      .filter((t) => t.direction === "inflow")
      .reduce((s, t) => s + Math.abs(t.amount ?? 0), 0);
    const outflow = posted
      .filter((t) => t.direction === "outflow")
      .reduce((s, t) => s + Math.abs(t.amount ?? 0), 0);
    return { inflow, outflow, net: inflow - outflow };
  }, [items]);

  const profileOptions = [
    { label: "All", value: "all" },
    ...Array.from(
      new Map(items.map((item) => [item.profile.id, item.profile])).values(),
    ).map((profile) => ({
      label: profile.label,
      value: profile.id,
    })),
  ];
  const filteredItems = items.filter((item) => {
    if (selectedProfile !== "all" && item.profile.id !== selectedProfile) {
      return false;
    }
    if (selectedStatus !== "all" && item.status !== selectedStatus) {
      return false;
    }
    if (selectedDirection !== "all" && item.direction !== selectedDirection) {
      return false;
    }
    return true;
  });
  const visibleItems = filteredItems.slice(0, visibleCount);
  const canLoadMore = visibleCount < filteredItems.length;

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [selectedDirection, selectedProfile, selectedStatus]);

  return (
    <View style={styles.screen}>
      <ScreenGlow />
      <FlashList
        automaticallyAdjustContentInsets
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        data={visibleItems}
        ItemSeparatorComponent={() => (
          <View style={styles.separatorWrapper}>
            <View style={styles.separator} />
          </View>
        )}
        keyExtractor={(item, index) =>
          item.id ??
          [
            item.accountId,
            item.createdAt,
            item.amount,
            item.status,
            item.kind,
            index,
          ].join("-")
        }
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          error ? null : isLoading ? (
            <GlassCard>
              <Text style={styles.emptyTitle}>Loading activity...</Text>
            </GlassCard>
          ) : (
            <GlassCard>
              <Text style={styles.emptyTitle}>No activity yet</Text>
              <Text style={styles.emptyBody}>
                Recent transactions will appear here.
              </Text>
            </GlassCard>
          )
        }
        ListFooterComponent={
          !error && filteredItems.length > 0 ? (
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {visibleItems.length} of {filteredItems.length}
                {filteredItems.length !== items.length
                  ? ` (${items.length} total)`
                  : ""}
              </Text>
              {canLoadMore ? (
                <Text style={styles.footerHint}>Scroll for more</Text>
              ) : null}
            </View>
          ) : null
        }
        ListHeaderComponent={
          <>
            {/* Cash flow chart */}
            {weeklyCashFlow.length > 0 ? (
              <GlassCard>
                <Text style={styles.chartTitle}>Cash flow</Text>
                <View style={styles.flowStats}>
                  <View style={styles.flowStat}>
                    <Text style={styles.flowStatLabel}>In</Text>
                    <Text
                      style={[styles.flowStatValue, { color: colors.positive }]}
                    >
                      {formatCurrency(flowSummary.inflow)}
                    </Text>
                  </View>
                  <View style={styles.flowStat}>
                    <Text style={styles.flowStatLabel}>Out</Text>
                    <Text style={styles.flowStatValue}>
                      {formatCurrency(flowSummary.outflow)}
                    </Text>
                  </View>
                  <View style={styles.flowStat}>
                    <Text style={styles.flowStatLabel}>Net</Text>
                    <Text
                      style={[
                        styles.flowStatValue,
                        {
                          color:
                            flowSummary.net >= 0
                              ? colors.positive
                              : colors.danger,
                        },
                      ]}
                    >
                      {flowSummary.net >= 0 ? "+" : ""}
                      {formatCurrency(flowSummary.net)}
                    </Text>
                  </View>
                </View>
                <BarChart
                  data={weeklyCashFlow}
                  height={100}
                  positiveColor={colors.positive}
                  negativeColor="rgba(255, 255, 255, 0.18)"
                  positiveLabel="Inflow"
                  negativeLabel="Outflow"
                />
              </GlassCard>
            ) : null}

            {/* Filters */}
            <GlassCard
              style={weeklyCashFlow.length > 0 ? { marginTop: 12 } : undefined}
            >
              <FilterRow
                label="Profile"
                onSelect={setSelectedProfile}
                options={profileOptions}
                selectedValue={selectedProfile}
              />
              <View style={styles.filterSeparator} />
              <FilterRow
                label="Status"
                onSelect={setSelectedStatus}
                options={statusOptions}
                selectedValue={selectedStatus}
              />
              <View style={styles.filterSeparator} />
              <FilterRow
                label="Direction"
                onSelect={setSelectedDirection}
                options={directionOptions}
                selectedValue={selectedDirection}
              />
            </GlassCard>

            {error ? (
              <GlassCard style={{ marginTop: 12 }}>
                <Text style={styles.errorText}>{error}</Text>
              </GlassCard>
            ) : null}
          </>
        }
        ListHeaderComponentStyle={styles.listHeader}
        onEndReached={() => {
          if (canLoadMore) {
            setVisibleCount((count) =>
              Math.min(count + pageSize, filteredItems.length),
            );
          }
        }}
        onEndReachedThreshold={0.4}
        onRefresh={
          Platform.OS === "web"
            ? undefined
            : () => void loadTransactions("refresh")
        }
        renderItem={({ item }) => <TransactionRow item={item} />}
        refreshing={isRefreshing}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function FilterRow({
  label,
  onSelect,
  options,
  selectedValue,
}: {
  label: string;
  onSelect: (value: string) => void;
  options: readonly { label: string; value: string }[];
  selectedValue: string;
}) {
  return (
    <View style={styles.filterRow}>
      <Text style={styles.filterLabel}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {options.map((option) => {
          const active = option.value === selectedValue;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={`${label}-${option.value}`}
              onPress={() => onSelect(option.value)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function TransactionRow({ item }: { item: MercuryTransaction }) {
  const amountColor =
    item.direction === "inflow" ? colors.positive : colors.text;
  const sign = item.direction === "inflow" ? "+" : "";
  const title =
    item.counterparty.name ??
    item.bankDescription ??
    item.category.user ??
    item.category.mercury ??
    "Transaction";

  return (
    <View style={styles.txRow}>
      <View style={styles.txLeft}>
        <Text style={styles.txTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.txMeta} numberOfLines={1}>
          {item.profile.label} ·{" "}
          {formatDateTime(item.postedAt ?? item.createdAt)}
        </Text>
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: amountColor }]}>
          {sign}
          {formatCurrency(item.amount)}
        </Text>
        <Text style={styles.txStatus}>{titleCase(item.status)}</Text>
      </View>
    </View>
  );
}

function getStyles() {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.canvas,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 32,
    },
    listHeader: {
      marginBottom: 12,
    },

    // Chart header
    chartTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "600",
    },
    flowStats: {
      flexDirection: "row",
      gap: 16,
    },
    flowStat: {
      gap: 2,
    },
    flowStatLabel: {
      color: colors.meta,
      fontSize: 12,
      fontWeight: "500",
    },
    flowStatValue: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },

    // Filters (inside GlassCard, so no background needed)
    filterRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    filterLabel: {
      color: colors.meta,
      fontSize: 13,
      fontWeight: "500",
      width: 60,
    },
    filterSeparator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: "rgba(255, 255, 255, 0.08)",
    },
    chipRow: {
      gap: 6,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: "rgba(255, 255, 255, 0.06)",
    },
    chipActive: {
      backgroundColor: colors.accentMuted,
    },
    chipText: {
      color: colors.meta,
      fontSize: 13,
      fontWeight: "500",
    },
    chipTextActive: {
      color: colors.accent,
      fontWeight: "600",
    },

    // Transaction rows — these sit inside a continuous glass band
    txRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      backgroundColor: "rgba(28, 28, 30, 0.65)",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    txLeft: {
      flex: 1,
      gap: 2,
    },
    txRight: {
      alignItems: "flex-end",
      gap: 2,
    },
    txTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "500",
    },
    txMeta: {
      color: colors.meta,
      fontSize: 13,
    },
    txAmount: {
      fontSize: 15,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
    txStatus: {
      color: colors.meta,
      fontSize: 12,
    },

    // Separator
    separatorWrapper: {
      backgroundColor: "rgba(28, 28, 30, 0.65)",
      paddingLeft: 16,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: "rgba(255, 255, 255, 0.08)",
    },

    // Empty / error
    emptyTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "500",
    },
    emptyBody: {
      color: colors.meta,
      fontSize: 13,
    },
    errorText: {
      color: colors.danger,
      fontSize: 15,
    },

    // Footer
    footer: {
      alignItems: "center",
      paddingVertical: 16,
      gap: 2,
    },
    footerText: {
      color: colors.meta,
      fontSize: 12,
    },
    footerHint: {
      color: colors.meta,
      fontSize: 11,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
  });
}
