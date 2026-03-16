import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Defs,
  Path,
  Stop,
  LinearGradient as SvgGradient,
} from "react-native-svg";

import { appColors } from "@/lib/theme";

const colors = appColors.dark;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a smooth SVG path from data points using monotone cubic interpolation. */
function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";

  let d = `M${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    // Catmull-Rom to cubic bezier conversion
    const tension = 6;
    const cp1x = p1.x + (p2.x - p0.x) / tension;
    const cp1y = p1.y + (p2.y - p0.y) / tension;
    const cp2x = p2.x - (p3.x - p1.x) / tension;
    const cp2y = p2.y - (p3.y - p1.y) / tension;

    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return d;
}

/** Map raw values to SVG coordinates. */
function mapToPoints(
  values: number[],
  width: number,
  height: number,
  paddingY = 4,
) {
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const usableHeight = height - paddingY * 2;

  return values.map((v, i) => ({
    x: values.length === 1 ? width / 2 : (i / (values.length - 1)) * width,
    y: paddingY + usableHeight - ((v - min) / range) * usableHeight,
  }));
}

// ---------------------------------------------------------------------------
// SparkLine
// ---------------------------------------------------------------------------

type SparkLineProps = {
  /** Array of numeric values to plot. */
  data: number[];
  /** Chart width. Defaults to full parent width via flex. */
  width?: number;
  /** Chart height in px. */
  height?: number;
  /** Stroke color. Defaults to accent green. */
  color?: string;
  /** Whether to show the gradient fill beneath the line. */
  showFill?: boolean;
};

/**
 * Minimal sparkline chart. Draws a smooth curve from numeric data
 * with an optional gradient fill. No axes, no labels — just the shape.
 */
export function SparkLine({
  data,
  width = 300,
  height = 64,
  color = colors.accent,
  showFill = true,
}: SparkLineProps) {
  if (data.length < 2) return null;

  const points = mapToPoints(data, width, height);
  const linePath = buildSmoothPath(points);
  const fillPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.25} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </SvgGradient>
      </Defs>
      {showFill ? <Path d={fillPath} fill="url(#sparkFill)" /> : null}
      <Path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// BarChart
// ---------------------------------------------------------------------------

type BarChartEntry = {
  label: string;
  positive: number;
  negative: number;
};

type BarChartProps = {
  data: BarChartEntry[];
  height?: number;
  positiveColor?: string;
  negativeColor?: string;
  /** Show legend row. */
  showLegend?: boolean;
  positiveLabel?: string;
  negativeLabel?: string;
};

/**
 * Stacked bar chart with positive (inflow) and negative (outflow) segments.
 * Each bar occupies equal width with subtle rounding and a clean baseline.
 */
export function BarChart({
  data,
  height = 120,
  positiveColor = colors.positive,
  negativeColor = "rgba(255, 255, 255, 0.25)",
  showLegend = true,
  positiveLabel = "In",
  negativeLabel = "Out",
}: BarChartProps) {
  if (data.length === 0) return null;

  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.positive, d.negative)),
    1,
  );

  return (
    <View>
      <View style={barStyles.chartWrapper}>
        {data.map((entry, i) => {
          const posHeight = (entry.positive / maxValue) * (height - 8);
          const negHeight = (entry.negative / maxValue) * (height - 8);

          return (
            <View key={entry.label} style={barStyles.barColumn}>
              <View style={[barStyles.barArea, { height }]}>
                {/* Positive bar */}
                <AnimatedBar
                  height={posHeight}
                  color={positiveColor}
                  align="bottom"
                />
                {/* Negative bar — stacked below as faded */}
                <AnimatedBar
                  height={negHeight}
                  color={negativeColor}
                  align="bottom"
                  style={{ position: "absolute", bottom: 0 }}
                />
              </View>
              <Text style={barStyles.barLabel}>{entry.label}</Text>
            </View>
          );
        })}
      </View>
      {showLegend ? (
        <View style={barStyles.legend}>
          <View style={barStyles.legendItem}>
            <View
              style={[barStyles.legendDot, { backgroundColor: positiveColor }]}
            />
            <Text style={barStyles.legendText}>{positiveLabel}</Text>
          </View>
          <View style={barStyles.legendItem}>
            <View
              style={[barStyles.legendDot, { backgroundColor: negativeColor }]}
            />
            <Text style={barStyles.legendText}>{negativeLabel}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function AnimatedBar({
  height: targetHeight,
  color,
  align,
  style,
}: {
  height: number;
  color: string;
  align: "bottom";
  style?: object;
}) {
  const animHeight = useSharedValue(0);
  const mounted = useRef(false);

  useEffect(() => {
    // Animate on mount or when value changes
    animHeight.value = withTiming(targetHeight, {
      duration: mounted.current ? 300 : 600,
    });
    mounted.current = true;
  }, [targetHeight, animHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: animHeight.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: "100%",
          backgroundColor: color,
          borderRadius: 4,
          position: "absolute",
          bottom: 0,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// DotRow — simple horizontal dot indicator
// ---------------------------------------------------------------------------

type DotRowProps = {
  values: { label: string; value: number; color: string }[];
  total: number;
};

/**
 * Proportional dot/bar row — shows relative sizes of categories
 * as a segmented horizontal bar.
 */
export function ProportionBar({ values, total }: DotRowProps) {
  if (total <= 0) return null;

  return (
    <View>
      <View style={proportionStyles.bar}>
        {values.map((v) => {
          const pct = Math.max((v.value / total) * 100, 1);
          return (
            <View
              key={v.label}
              style={[
                proportionStyles.segment,
                { width: `${pct}%`, backgroundColor: v.color },
              ]}
            />
          );
        })}
      </View>
      <View style={proportionStyles.labels}>
        {values.map((v) => (
          <View key={v.label} style={proportionStyles.labelItem}>
            <View
              style={[proportionStyles.dot, { backgroundColor: v.color }]}
            />
            <Text style={proportionStyles.labelText}>{v.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const barStyles = StyleSheet.create({
  chartWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  barArea: {
    width: "100%",
    justifyContent: "flex-end",
  },
  barLabel: {
    color: colors.meta,
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
  },
  legend: {
    flexDirection: "row",
    gap: 16,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: colors.meta,
    fontSize: 12,
    fontWeight: "500",
  },
});

const proportionStyles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    gap: 2,
  },
  segment: {
    height: "100%",
    borderRadius: 3,
  },
  labels: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
  },
  labelItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  labelText: {
    color: colors.meta,
    fontSize: 12,
    fontWeight: "500",
  },
});
