import { useEffect, useEffectEvent, useState } from "react";
import { FlashList } from "@shopify/flash-list";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatCurrency, formatDateTime, titleCase } from "@/lib/format";
import {
  type MercuryTransaction,
  type MercuryTransactionsResponse,
  mercuryApi,
} from "@/lib/mercury";
import { getAppColors } from "@/lib/theme";

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
  const colorScheme = useColorScheme();
  const colors = getAppColors(colorScheme);
  const styles = getStyles(colors);
  const [data, setData] = useState<MercuryTransactionsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [selectedProfile, setSelectedProfile] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedDirection, setSelectedDirection] = useState("all");

  const loadTransactions = useEffectEvent(
    async (mode: "initial" | "refresh") => {
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
    },
  );

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
      contentContainerStyle={[
        styles.content,
        visibleItems.length === 0 && styles.contentEmpty,
      ]}
      contentInsetAdjustmentBehavior="automatic"
      data={visibleItems}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
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
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Loading activity</Text>
            <Text style={styles.copy}>
              Pulling your latest Mercury transactions now.
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No activity yet</Text>
            <Text style={styles.copy}>
              Recent Mercury transactions will show up here once they settle.
            </Text>
          </View>
        )
      }
      ListFooterComponent={
        !error && filteredItems.length > 0 ? (
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Showing {visibleItems.length} of {filteredItems.length} recent
              transactions
            </Text>
            {filteredItems.length !== items.length ? (
              <Text style={styles.footerSubtle}>
                Filtered from {items.length} loaded transactions
              </Text>
            ) : null}
            {isLoading ? (
              <Text style={styles.footerHint}>Loading</Text>
            ) : canLoadMore ? (
              <Text style={styles.footerHint}>Scroll for more</Text>
            ) : null}
          </View>
        ) : null
      }
      ListHeaderComponent={
        <>
          <View style={[styles.card, styles.heroCard]}>
            <Text style={styles.eyebrow}>Recent activity</Text>
            <Text style={styles.heroTitle}>
              Money movement across all profiles.
            </Text>
            <Text style={styles.copy}>
              A simple running list of the latest Mercury transactions, ordered
              newest first.
            </Text>
          </View>

          <View style={[styles.card, styles.filterCard]}>
            <Text style={styles.filterEyebrow}>Filters</Text>
            <FilterChips
              label="Profile"
              onSelect={setSelectedProfile}
              options={profileOptions}
              selectedValue={selectedProfile}
            />
            <FilterChips
              label="Status"
              onSelect={setSelectedStatus}
              options={statusOptions}
              selectedValue={selectedStatus}
            />
            <FilterChips
              label="Direction"
              onSelect={setSelectedDirection}
              options={directionOptions}
              selectedValue={selectedDirection}
            />
          </View>

          {error ? (
            <View style={[styles.card, styles.noticeCard]}>
              <Text style={styles.cardTitle}>Unable to load activity</Text>
              <Text style={styles.copy}>{error}</Text>
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

function FilterChips({
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
  const colorScheme = useColorScheme();
  const colors = getAppColors(colorScheme);
  const styles = getStyles(colors);

  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterLabel}>{label}</Text>
      <View style={styles.filterOptions}>
        {options.map((option) => {
          const isSelected = option.value === selectedValue;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={`${label}-${option.value}`}
              onPress={() => onSelect(option.value)}
              style={({ pressed }) => [
                styles.filterChip,
                isSelected && styles.filterChipSelected,
                pressed && styles.filterChipPressed,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.filterChipText,
                  isSelected && styles.filterChipTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TransactionRow({ item }: { item: MercuryTransaction }) {
  const colorScheme = useColorScheme();
  const colors = getAppColors(colorScheme);
  const styles = getStyles(colors);
  const amountColor =
    item.direction === "inflow"
      ? colors.positive
      : item.direction === "outflow"
        ? colors.danger
        : colors.text;
  const title =
    item.counterparty.name ??
    item.bankDescription ??
    item.category.user ??
    item.category.mercury ??
    "Transaction";

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.rowCopy}>
          <Text style={styles.itemTitle}>{title}</Text>
          <Text style={styles.itemMeta}>
            {item.profile.label} ·{" "}
            {formatDateTime(item.postedAt ?? item.createdAt)}
          </Text>
        </View>
        <Text style={[styles.amount, { color: amountColor }]}>
          {formatCurrency(item.amount)}
        </Text>
      </View>

      <View style={styles.detailRow}>
        <Text
          numberOfLines={1}
          style={[styles.detailText, styles.detailTextPrimary]}
        >
          {titleCase(item.kind)} · {titleCase(item.status)}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.detailText, styles.detailTextSecondary]}
        >
          {item.category.user ?? item.category.mercury ?? "Uncategorized"}
        </Text>
      </View>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof getAppColors>) =>
  StyleSheet.create({
    screen: {
      backgroundColor: colors.canvas,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 28,
    },
    contentEmpty: {
      flexGrow: 1,
    },
    listHeader: {
      marginBottom: 14,
    },
    card: {
      gap: 10,
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
    filterCard: {
      gap: 14,
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
    filterEyebrow: {
      color: colors.meta,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 1.2,
      textTransform: "uppercase",
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
    filterGroup: {
      gap: 8,
    },
    filterLabel: {
      color: colors.meta,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    filterOptions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    filterChip: {
      minHeight: 36,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.canvas,
      justifyContent: "center",
    },
    filterChipSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentMuted,
    },
    filterChipPressed: {
      opacity: 0.82,
    },
    filterChipText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
      flexShrink: 1,
    },
    filterChipTextSelected: {
      color: colors.accent,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    rowCopy: {
      flex: 1,
      gap: 4,
    },
    itemTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700",
    },
    itemMeta: {
      color: colors.meta,
      fontSize: 13,
      lineHeight: 18,
    },
    amount: {
      fontSize: 16,
      fontWeight: "700",
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    detailText: {
      color: colors.meta,
      fontSize: 13,
      lineHeight: 18,
    },
    detailTextPrimary: {
      flex: 1,
    },
    detailTextSecondary: {
      flexShrink: 1,
      maxWidth: "44%",
      textAlign: "right",
    },
    separator: {
      height: 14,
    },
    footer: {
      alignItems: "center",
      paddingVertical: 8,
      gap: 4,
    },
    footerText: {
      color: colors.meta,
      fontSize: 13,
      lineHeight: 18,
    },
    footerSubtle: {
      color: colors.meta,
      fontSize: 12,
      lineHeight: 16,
    },
    footerHint: {
      color: colors.meta,
      fontSize: 12,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 1,
    },
  });
