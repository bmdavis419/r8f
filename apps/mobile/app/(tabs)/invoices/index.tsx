import { useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { GlassCard, ScreenGlow } from "@/components/ui/glass";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";
import { type MercuryInvoicesResponse, mercuryApi } from "@/lib/mercury";
import { appColors } from "@/lib/theme";

const colors = appColors.dark;
const styles = getStyles();

const loadInvoices = () => mercuryApi.getInvoices();

export default function InvoicesScreen() {
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
    <View style={styles.screen}>
      <ScreenGlow />
      <ScrollView
        automaticallyAdjustContentInsets
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            onRefresh={() => void refresh()}
            refreshing={isRefreshing}
            tintColor={colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <GlassCard>
            <Text style={styles.errorText}>{error}</Text>
          </GlassCard>
        ) : null}

        {items.length > 0 ? (
          <GlassCard>
            {items.map((invoice, index) => (
              <View key={invoice.id ?? invoice.invoiceNumber}>
                {index > 0 ? <View style={styles.rowDivider} /> : null}
                <View style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowTitle}>
                      {invoice.customer?.name ?? invoice.profile.label}
                    </Text>
                    <Text style={styles.rowSubtitle}>
                      #{invoice.invoiceNumber ?? "—"} · Due{" "}
                      {formatDate(invoice.dueDate)}
                    </Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={styles.rowValue}>
                      {formatCurrency(invoice.amount)}
                    </Text>
                    <Text style={styles.rowStatus}>
                      {titleCase(invoice.status)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </GlassCard>
        ) : (
          data?.data.profiles.map((profile) => (
            <GlassCard key={profile.profile.id}>
              <Text style={styles.sectionTitle}>{profile.profile.label}</Text>
              <Text style={styles.footnote}>
                {profile.invoices.supported
                  ? "No outstanding invoices."
                  : (profile.invoices.error?.message ??
                    "Invoices are not available for this profile.")}
              </Text>
            </GlassCard>
          ))
        )}

        {data?.meta.note ? (
          <Text style={styles.footerNote}>{data.meta.note}</Text>
        ) : null}
      </ScrollView>
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
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 32,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "600",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingVertical: 2,
    },
    rowLeft: {
      flex: 1,
      gap: 1,
    },
    rowRight: {
      alignItems: "flex-end",
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
    rowStatus: {
      color: colors.meta,
      fontSize: 12,
    },
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: "rgba(255, 255, 255, 0.08)",
    },
    footnote: {
      color: colors.meta,
      fontSize: 13,
      lineHeight: 18,
    },
    footerNote: {
      color: colors.meta,
      fontSize: 13,
      lineHeight: 18,
      paddingHorizontal: 4,
    },
    errorText: {
      color: colors.danger,
      fontSize: 15,
    },
  });
}
