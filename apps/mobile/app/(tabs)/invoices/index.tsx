import { useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";
import { type MercuryInvoicesResponse, mercuryApi } from "@/lib/mercury";
import { getAppColors } from "@/lib/theme";

const loadInvoices = () => mercuryApi.getInvoices();

export default function InvoicesScreen() {
  const colorScheme = useColorScheme();
  const colors = getAppColors(colorScheme);
  const styles = getStyles(colors);
  const [data, setData] = useState<MercuryInvoicesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(true);

  const refresh = async () => {
    try {
      setError(null);
      setIsRefreshing(true);
      setData(await loadInvoices());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load invoices.",
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const items = data?.data.items ?? [];

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
        <Text style={styles.eyebrow}>Invoices</Text>
        <Text style={styles.heroTitle}>
          Receivables, when the profile supports them.
        </Text>
        <Text style={styles.copy}>
          The API already distinguishes between supported and unsupported
          Mercury profiles, so this stays clean even before invoices are
          enabled.
        </Text>
      </View>

      {error ? (
        <View style={[styles.card, styles.noticeCard]}>
          <Text style={styles.cardTitle}>Unable to load invoices</Text>
          <Text style={styles.copy}>{error}</Text>
        </View>
      ) : null}

      {items.length > 0
        ? items.map((invoice) => (
            <View key={invoice.id ?? invoice.invoiceNumber} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.rowCopy}>
                  <Text style={styles.itemTitle}>
                    {invoice.customer?.name ?? invoice.profile.label}
                  </Text>
                  <Text style={styles.itemMeta}>
                    #{invoice.invoiceNumber ?? "—"} · Due{" "}
                    {formatDate(invoice.dueDate)}
                  </Text>
                </View>
                <Text style={styles.amount}>
                  {formatCurrency(invoice.amount)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailText}>{invoice.profile.label}</Text>
                <Text style={styles.detailText}>
                  {titleCase(invoice.status)}
                </Text>
              </View>
            </View>
          ))
        : data?.data.profiles.map((profile) => (
            <View key={profile.profile.id} style={styles.card}>
              <Text style={styles.cardTitle}>{profile.profile.label}</Text>
              <Text style={styles.copy}>
                {profile.invoices.supported
                  ? "Invoices are enabled, but nothing is currently outstanding."
                  : (profile.invoices.error?.message ??
                    "Invoices are not available for this profile.")}
              </Text>
            </View>
          ))}

      {data?.meta.note ? (
        <Text style={styles.footer}>{data.meta.note}</Text>
      ) : null}
    </ScrollView>
  );
}

const getStyles = (colors: ReturnType<typeof getAppColors>) =>
  StyleSheet.create({
    screen: {
      backgroundColor: colors.canvas,
    },
    content: {
      gap: 14,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 28,
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
      color: colors.text,
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
    footer: {
      color: colors.meta,
      fontSize: 13,
      lineHeight: 18,
      paddingHorizontal: 4,
    },
  });
