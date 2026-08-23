import React, { useRef } from "react";
import { View, TextInput, Text, StyleSheet, ViewStyle } from "react-native";
import { colors } from "../../constants/colors";
import { VietnameseTextInput, VietnameseTextInputProps } from "./VietnameseTextInput";

export interface InputProps extends VietnameseTextInputProps {
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
  vietnameseTelex,
  onValidatedTextChange,
  ...rest
}) => {
  const inputRef = useRef<TextInput>(null);

  const handleChangeText = (text: string) => {
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
        <VietnameseTextInput
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
          {...(value !== undefined ? { value } : { defaultValue })}
          onChangeText={handleChangeText}
          vietnameseTelex={vietnameseTelex}
          onValidatedTextChange={onValidatedTextChange}
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
  errorBorder: {
    borderColor: colors.rose600,
  },
  iconWrapper: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.slate900,
    paddingVertical: 12,
  },
  multilineInput: {
    textAlignVertical: "top",
    minHeight: 72,
  },
  disabledInput: {
    color: colors.slate400,
  },
  errorText: {
    fontSize: 12,
    color: colors.rose600,
    marginTop: 4,
    fontWeight: "500",
  },
});
