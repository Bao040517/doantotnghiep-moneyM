import React, { forwardRef, useCallback, useEffect, useRef } from "react";
import {
  NativeSyntheticEvent,
  TextInput,
  TextInputEndEditingEventData,
  TextInputProps,
} from "react-native";
import { convertTelexToVietnamese } from "../../utils/vietnamese";

export interface VietnameseTextInputProps extends TextInputProps {
  vietnameseTelex?: boolean;
  onValidatedTextChange?: (text: string) => void;
}

/**
 * IME-safe TextInput for Gboard, Laban Key, UniKey and Apple Keyboard.
 *
 * Text fields intentionally remain uncontrolled while focused. React still
 * receives every value through onChangeText, but it does not write the
 * parent's value back into the native field during the IME composing phase.
 */
export const VietnameseTextInput = forwardRef<TextInput, VietnameseTextInputProps>(
  (
    {
      vietnameseTelex = false,
      keyboardType,
      secureTextEntry,
      value,
      defaultValue,
      onChangeText,
      onValidatedTextChange,
      onFocus,
      onBlur,
      onEndEditing,
      autoCorrect,
      autoCapitalize,
      spellCheck,
      ...rest
    },
    forwardedRef
  ) => {
    const inputRef = useRef<TextInput>(null);
    const initialValueRef = useRef(value ?? defaultValue ?? "");
    const currentTextRef = useRef(initialValueRef.current);
    const lastPropValueRef = useRef(value);
    const imeSafe = (!keyboardType || keyboardType === "default") && !secureTextEntry;

    const setRefs = useCallback(
      (instance: TextInput | null) => {
        inputRef.current = instance;
        if (typeof forwardedRef === "function") {
          forwardedRef(instance);
        } else if (forwardedRef) {
          forwardedRef.current = instance;
        }
      },
      [forwardedRef]
    );

    useEffect(() => {
      if (!imeSafe || value === undefined || value === lastPropValueRef.current) return;
      lastPropValueRef.current = value;
      if (value === currentTextRef.current) return;
      currentTextRef.current = value;
      inputRef.current?.setNativeProps({ text: value });
    }, [imeSafe, value]);

    const handleFocus: NonNullable<TextInputProps["onFocus"]> = (event) => {
      onFocus?.(event);
    };

    const handleBlur: NonNullable<TextInputProps["onBlur"]> = (event) => {
      onBlur?.(event);
    };

    const handleChangeText = (text: string) => {
      currentTextRef.current = text;
      onChangeText?.(text);
      onValidatedTextChange?.(text);
    };

    const handleEndEditing = (event: NativeSyntheticEvent<TextInputEndEditingEventData>) => {
      if (vietnameseTelex) {
        const rawText = event.nativeEvent.text ?? "";
        const convertedText = convertTelexToVietnamese(rawText);
        if (convertedText !== rawText) {
          currentTextRef.current = convertedText;
          inputRef.current?.setNativeProps({ text: convertedText });
          onChangeText?.(convertedText);
        }
      }
      onEndEditing?.(event);
    };

    return (
      <TextInput
        ref={setRefs}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCorrect={imeSafe ? false : autoCorrect}
        autoCapitalize={imeSafe ? "none" : autoCapitalize}
        spellCheck={imeSafe ? false : spellCheck}
        {...(imeSafe
          ? { defaultValue: initialValueRef.current }
          : value !== undefined
            ? { value }
            : { defaultValue })}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onEndEditing={handleEndEditing}
        {...rest}
      />
    );
  }
);

VietnameseTextInput.displayName = "VietnameseTextInput";
