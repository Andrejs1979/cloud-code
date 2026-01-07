import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../lib/styles';

interface CardProps {
  title?: string;
  style?: any;
  children: React.ReactNode;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: colors.foreground,
  },
});

export function Card({ title, style, children }: CardProps) {
  return (
    <View style={[styles.card, style]}>
      {title && <Text style={styles.title}>{title}</Text>}
      {children}
    </View>
  );
}

export function CardContent({ style, children }: { style?: any; children: React.ReactNode }) {
  return <View style={style}>{children}</View>;
}
