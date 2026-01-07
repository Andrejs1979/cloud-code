import { TextInput, TextInputProps, Text, StyleSheet, View } from 'react-native';
import { colors } from '../lib/styles';

interface InputProps extends TextInputProps {
  label?: string;
  description?: string;
  error?: string;
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    color: colors.foreground,
  },
  description: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: 8,
  },
  input: {
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
    color: colors.foreground,
  },
  inputError: {
    borderColor: colors.error,
  },
  error: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});

export function Input({ label, description, error, style, ...props }: InputProps) {
  return (
    <>
      {label && <Text style={styles.label}>{label}</Text>}
      {description && <Text style={styles.description}>{description}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor="#71717a"
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </>
  );
}

export function TextArea({ label, description, error, style, ...props }: InputProps) {
  return (
    <>
      {label && <Text style={styles.label}>{label}</Text>}
      {description && <Text style={styles.description}>{description}</Text>}
      <TextInput
        style={[styles.input, styles.textArea, error && styles.inputError, style]}
        placeholderTextColor="#71717a"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        {...props}
      />
    </>
  );
}
