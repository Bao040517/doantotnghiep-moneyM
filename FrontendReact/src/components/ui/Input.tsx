import React, { useEffect, useRef } from "react";
import { View, TextInput, Text, StyleSheet, TextInputProps, ViewStyle } from "react-native";
import { colors } from "../../constants/colors";


interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  icon,
  style,
  value,
  defaultValue,
  onChangeText,
  autoCorrect = false,
  autoCapitalize = "none",
  ...rest
}) => {
  const inputRef = useRef<TextInput>(null);
  const lastValRef = useRef<string>(value ?? defaultValue ?? "");

  useEffect(() => {
    if (value !== undefined && value !== lastValRef.current) {
      lastValRef.current = value;
      if (inputRef.current) {
        inputRef.current.setNativeProps({ text: value });
      }
    }
  }, [value]);

  const handleChangeText = (text: string) => {
    lastValRef.current = text;
    if (onChangeText) {
      onChangeText(text);
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          rest.multiline && styles.multilineWrapper,
          rest.editable === false && styles.disabledWrapper,
          error ? styles.errorBorder : null,
        ]}
      >
        {icon && <View style={styles.iconWrapper}>{icon}</View>}
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            rest.multiline && styles.multilineInput,
            rest.editable === false && styles.disabledInput,
            style,
          ]}
          placeholderTextColor={colors.slate400}
          autoCorrect={autoCorrect}
          autoCapitalize={autoCapitalize}
          value={value}
          defaultValue={defaultValue}
          onChangeText={handleChangeText}
          {...rest}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.slate700,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.slate200,
    borderRadius: 16,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  disabledWrapper: {
    backgroundColor: "#F1F5F9",
    borderColor: "#CBD5E1",
  },
  multilineWrapper: {
    alignItems: "flex-start",
    paddingVertical: 12,
    minHeight: 96,
  },
  multilineInput: {
    textAlignVertical: "top",
  },
  errorBorder: {
    borderColor: colors.rose500,
  },
  iconWrapper: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.slate900,
  },
  disabledInput: {
    color: "#334155",
    fontWeight: "600",
  },
  errorText: {
    fontSize: 12,
    color: colors.rose500,
    marginTop: 4,
    fontWeight: "500",
  },
});
