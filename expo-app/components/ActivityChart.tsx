/**
 * ActivityChart Component
 * Line chart showing session activity over time
 */

import React from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import { LineChart } from 'victory-native';
import { colors } from '../lib/tokens/colors';

interface ActivityChartProps {
  data: Array<{ date: string; count: number }>;
  color?: string;
  height?: number;
}

export function ActivityChart({ data, color = colors.primary, height = 120 }: ActivityChartProps) {
  if (data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.emptyText}>No activity data</Text>
      </View>
    );
  }

  const chartData = data.map((d, i) => ({ x: i, y: d.count }));
  const width = Dimensions.get('window').width - 32;

  return (
    <View style={[styles.container, { height }]}>
      <LineChart
        data={chartData}
        width={width}
        height={height}
        theme={{
          axis: {
            stroke: colors.border,
          },
          grid: {
            stroke: colors.border,
          },
        }}
        style={styles.chart}
        animate
        animationConfig={{ duration: 300 }}
        curve="monotoneX"
        chartConfig={{
          color: (opacity = 1) => `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chart: {
    flex: 1,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: 14,
  },
});
