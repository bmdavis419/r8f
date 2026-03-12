import { useEffect, useMemo, useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  type MercuryCreditAccount,
  type MercuryOverviewProfile,
  type MercuryOverviewResponse,
  mercuryApi,
} from "@/lib/mercury";
import { appColors } from "@/lib/theme";

const colors = appColors.dark;
const styles = getStyles();

const loadOverview = () => mercuryApi.getOverview();

type CardItem = {
  account: MercuryCreditAccount;
  organizationName: string | null;
  profile: MercuryOverviewProfile["profile"];
};

export default function CardsScreen() {
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
          tintColor={colors.accent}
        />
      }
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    >
      {/* Summary */}
      <View style={styles.section}>
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Current balance</Text>
            <Text style={styles.statValue}>
              {formatCurrency(summary?.creditCurrent)}
            </Text>
          </View>
          <View style={styles.statSeparator} />
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Available</Text>
            <Text style={styles.statValue}>
              {formatCurrency(summary?.creditAvailable)}
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

      {/* Apple Card note */}
      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Apple Card</Text>
          <Text style={styles.badge}>Unavailable</Text>
        </View>
        <Text style={styles.footnote}>
          {Platform.OS === "ios"
            ? "Requires a production build with FinanceKit entitlement."
            : "Apple Card data is iPhone-only via FinanceKit."}
        </Text>
      </View>

      {/* Mercury cards */}
      {mercuryCards.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mercury</Text>
          {mercuryCards.map(({ account, organizationName, profile }, index) => (
            <View key={account.id ?? `${profile.id}-${account.createdAt}`}>
              {index > 0 ? <View style={styles.rowDivider} /> : null}
              <View style={styles.cardRow}>
                <View style={styles.cardRowLeft}>
                  <Text style={styles.rowTitle}>Mercury Card</Text>
                  <Text style={styles.rowSubtitle}>
                    {profile.label}
                    {organizationName ? ` · ${organizationName}` : ""}
                  </Text>
                </View>
                <View style={styles.cardRowRight}>
                  <Text style={styles.rowValue}>
                    {formatCurrency(account.balances.current)}
                  </Text>
                  <Text style={styles.rowSubtitle}>
                    {formatCurrency(account.balances.available)} avail.
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mercury</Text>
          <Text style={styles.footnote}>
            No Mercury credit accounts found across connected profiles.
          </Text>
        </View>
      )}

      {unsupportedProfiles.map((profile) => (
        <View key={profile.profile.id} style={styles.section}>
          <Text style={styles.sectionTitle}>{profile.profile.label}</Text>
          <Text style={styles.footnote}>
            {profile.capabilities.credit.error?.message ??
              "Credit data is not enabled for this profile."}
          </Text>
        </View>
      ))}
    </ScrollView>
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
    sectionTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "600",
    },
    rowBetween: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    badge: {
      color: colors.meta,
      fontSize: 13,
      fontWeight: "500",
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
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    cardRowLeft: {
      flex: 1,
      gap: 1,
    },
    cardRowRight: {
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
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    footnote: {
      color: colors.meta,
      fontSize: 13,
      lineHeight: 18,
    },
    errorText: {
      color: colors.danger,
      fontSize: 15,
    },
  });
}
