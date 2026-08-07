import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Alert as RNAlert } from "react-native";
import {
  CustomAlertModal,
  CustomAlertOptions,
  AlertButton,
  AlertType,
} from "../components/ui/CustomAlertModal";

interface AlertContextType {
  showAlert: (
    titleOrOptions: string | CustomAlertOptions,
    message?: string,
    buttons?: AlertButton[],
    type?: AlertType
  ) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

// Save original Alert.alert as fallback
const originalAlert = RNAlert.alert;

let globalAlertFn: ((
  titleOrOptions: string | CustomAlertOptions,
  message?: string,
  buttons?: AlertButton[],
  type?: AlertType
) => void) | null = null;

export const globalAlert = (
  titleOrOptions: string | CustomAlertOptions,
  message?: string,
  buttons?: AlertButton[],
  type?: AlertType
) => {
  if (globalAlertFn) {
    globalAlertFn(titleOrOptions, message, buttons, type);
  } else {
    if (typeof titleOrOptions === "string") {
      originalAlert(titleOrOptions, message, buttons as any);
    }
  }
};

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [alertOptions, setAlertOptions] = useState<CustomAlertOptions | null>(null);

  const showAlert = (
    titleOrOptions: string | CustomAlertOptions,
    message?: string,
    buttons?: AlertButton[],
    type?: AlertType
  ) => {
    if (typeof titleOrOptions === "object") {
      setAlertOptions(titleOrOptions);
    } else {
      let inferredType: AlertType = type || "warning";
      if (!type) {
        const lower = (titleOrOptions + " " + (message || "")).toLowerCase();
        if (lower.includes("thành công") || lower.includes("🎉") || lower.includes("✓")) {
          inferredType = "success";
        } else if (lower.includes("lỗi") || lower.includes("thất bại") || lower.includes("❌")) {
          inferredType = "error";
        } else if (lower.includes("xóa") || lower.includes("hủy") || lower.includes("chắc chắn")) {
          inferredType = "confirm";
        }
      }

      setAlertOptions({
        title: titleOrOptions,
        message: message || "",
        buttons,
        type: inferredType,
      });
    }
    setVisible(true);
  };

  const hideAlert = () => {
    setVisible(false);
  };

  useEffect(() => {
    globalAlertFn = showAlert;

    // GLOBALLY OVERRIDE RNAlert.alert FOR THE ENTIRE PROJECT!
    RNAlert.alert = (title: string, message?: string, buttons?: any) => {
      showAlert(title, message, buttons);
    };

    return () => {
      RNAlert.alert = originalAlert;
    };
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <CustomAlertModal
        visible={visible}
        options={alertOptions}
        onClose={hideAlert}
      />
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
};
