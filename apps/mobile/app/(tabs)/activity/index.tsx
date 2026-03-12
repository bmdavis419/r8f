import { FlashList } from "@shopify/flash-list";
import { useCallback, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

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

  const items = data?.data.items ?? [];
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
          <View style={styles.emptySection}>
            <Text style={styles.emptyTitle}>Loading activity...</Text>
          </View>
        ) : (
          <View style={styles.emptySection}>
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptyBody}>
              Recent transactions will appear here.
            </Text>
          </View>
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
          {/* Filters */}
          <View style={styles.filterSection}>
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
          </View>

          {error ? (
            <View style={styles.errorSection}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
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
      style={styles.screen}
    />
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
    item.direction === "inflow"
      ? colors.positive
      : item.direction === "outflow"
        ? colors.text
        : colors.text;
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

    // Filters
    filterSection: {
      borderRadius: 12,
      backgroundColor: colors.card,
      paddingVertical: 4,
    },
    filterRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
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
      backgroundColor: colors.border,
      marginLeft: 16,
    },
    chipRow: {
      gap: 6,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.cardAlt,
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

    // Transaction rows
    txRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      backgroundColor: colors.card,
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
      backgroundColor: colors.card,
      paddingLeft: 16,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },

    // Empty / error
    emptySection: {
      padding: 16,
      borderRadius: 12,
      backgroundColor: colors.card,
      gap: 4,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "500",
    },
    emptyBody: {
      color: colors.meta,
      fontSize: 13,
    },
    errorSection: {
      marginTop: 12,
      padding: 16,
      borderRadius: 12,
      backgroundColor: colors.card,
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
