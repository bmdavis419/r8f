import { useEffect, useMemo, useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { GlassCard, ScreenGlow } from "@/components/ui/glass";
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
        {/* Summary */}
        <GlassCard>
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
        </GlassCard>

        {error ? (
          <GlassCard>
            <Text style={styles.errorText}>{error}</Text>
          </GlassCard>
        ) : null}

        {/* Apple Card note */}
        <GlassCard>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Apple Card</Text>
            <Text style={styles.badge}>Unavailable</Text>
          </View>
          <Text style={styles.footnote}>
            {Platform.OS === "ios"
              ? "Requires a production build with FinanceKit entitlement."
              : "Apple Card data is iPhone-only via FinanceKit."}
          </Text>
        </GlassCard>

        {/* Mercury cards */}
        {mercuryCards.length > 0 ? (
          <GlassCard>
            <Text style={styles.sectionTitle}>Mercury</Text>
            {mercuryCards.map(
              ({ account, organizationName, profile }, index) => (
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
              ),
            )}
          </GlassCard>
        ) : (
          <GlassCard>
            <Text style={styles.sectionTitle}>Mercury</Text>
            <Text style={styles.footnote}>
              No Mercury credit accounts found across connected profiles.
            </Text>
          </GlassCard>
        )}

        {unsupportedProfiles.map((profile) => (
          <GlassCard key={profile.profile.id}>
            <Text style={styles.sectionTitle}>{profile.profile.label}</Text>
            <Text style={styles.footnote}>
              {profile.capabilities.credit.error?.message ??
                "Credit data is not enabled for this profile."}
            </Text>
          </GlassCard>
        ))}
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
      backgroundColor: "rgba(255, 255, 255, 0.08)",
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
