import { Pressable, Text, ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors } from '../lib/styles';

interface ButtonProps {
  label?: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  style?: any;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    fontWeight: '500',
  },
  primary: { backgroundColor: colors.foreground, color: colors.background },
  secondary: { backgroundColor: colors.secondary, color: colors.foreground },
  outline: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  ghost: { backgroundColor: 'transparent' },
  destructive: { backgroundColor: colors.error, color: '#fff' },
  sm: { height: 32, paddingHorizontal: 12, paddingVertical: 6, fontSize: 14 },
  md: { height: 36, paddingHorizontal: 16, paddingVertical: 8, fontSize: 14 },
  lg: { height: 44, paddingHorizontal: 32, paddingVertical: 10, fontSize: 16 },
  text: { fontWeight: '500' },
  icon: { marginRight: 8 },
});

const VARIANT_COLORS = {
  primary: colors.background,
  secondary: colors.foreground,
  outline: colors.foreground,
  ghost: colors.foreground,
  destructive: '#fff',
};

const VARIANT_BGS = {
  primary: colors.foreground,
  secondary: colors.secondary,
  outline: 'transparent',
  ghost: 'transparent',
  destructive: colors.error,
};

export function Button({
  label,
  icon,
  variant = 'primary',
  size = 'md',
  style,
  disabled = false,
  loading = false,
  onPress,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        styles[size],
        { backgroundColor: VARIANT_BGS[variant], opacity: (disabled || loading) ? 0.5 : pressed ? 0.8 : 1 },
        variant === 'outline' && { borderWidth: 1, borderColor: colors.border },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={VARIANT_COLORS[variant]} />
      ) : (
        <>
          {icon && <View style={styles.icon}>{icon}</View>}
          {label && (
            <Text style={[styles.text, { color: VARIANT_COLORS[variant] }]}>{label}</Text>
          )}
        </>
      )}
    </Pressable>
  );
}
