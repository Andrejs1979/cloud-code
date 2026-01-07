import { View, StyleSheet } from 'react-native';
import { colors, statusColors } from '../lib/styles';

type Status = 'pending' | 'running' | 'completed' | 'failed' | 'starting';

interface StatusDotProps {
  status: Status;
  style?: any;
}

export function StatusDot({ status, style }: StatusDotProps) {
  return (
    <View
      style={[
        styles.dot,
        { backgroundColor: statusColors[status] || colors.mutedForeground },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
