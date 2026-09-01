import React, { Component, ErrorInfo, ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../constants/colors";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("[ErrorBoundary] Uncaught component error:", error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  public handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || "Lỗi không xác định";
      const componentStack = this.state.errorInfo?.componentStack || "";

      return (
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              {/* Error Badge */}
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>⚠️</Text>
              </View>

              <Text style={styles.title}>Đã xảy ra sự cố</Text>
              <Text style={styles.subtitle}>
                Rất tiếc, ứng dụng đã gặp lỗi bất ngờ trong quá trình hiển thị giao diện này.
              </Text>

              {/* Action Button */}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={this.handleReset}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>🔄 Tải lại trang</Text>
              </TouchableOpacity>

              {/* Technical Details Accordion */}
              <TouchableOpacity
                style={styles.detailsToggle}
                onPress={this.toggleDetails}
                activeOpacity={0.7}
              >
                <Text style={styles.detailsToggleText}>
                  {this.state.showDetails ? "▲ Ẩn chi tiết kỹ thuật" : "▼ Xem chi tiết kỹ thuật"}
                </Text>
              </TouchableOpacity>

              {this.state.showDetails && (
                <View style={styles.detailsBox}>
                  <Text style={styles.detailsErrorTitle}>Message:</Text>
                  <Text style={styles.detailsErrorText}>{errorMessage}</Text>
                  {componentStack.length > 0 && (
                    <>
                      <Text style={[styles.detailsErrorTitle, { marginTop: 8 }]}>Stack Trace:</Text>
                      <ScrollView horizontal style={styles.stackScroll}>
                        <Text style={styles.stackText}>{componentStack.trim()}</Text>
                      </ScrollView>
                    </>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: colors.indigo600,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  detailsToggle: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  detailsToggleText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "600",
  },
  detailsBox: {
    width: "100%",
    marginTop: 12,
    padding: 14,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  detailsErrorTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 4,
  },
  detailsErrorText: {
    fontSize: 12,
    color: "#DC2626",
    fontFamily: "monospace",
  },
  stackScroll: {
    maxHeight: 120,
  },
  stackText: {
    fontSize: 11,
    color: "#64748B",
    fontFamily: "monospace",
  },
});
