import { Client } from "@stomp/stompjs";
import { getBaseUrl } from "./api";
import { safeStorage } from "./storage";

const { TextEncoder: PolyfillTextEncoder, TextDecoder: PolyfillTextDecoder } = require("text-encoding");

// Polyfill TextEncoder/TextDecoder safely for React Native (avoid 'No input text' error on heartbeats)
const g: any = typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : {});

class SafeTextEncoder extends PolyfillTextEncoder {
  encode(input?: string) {
    return super.encode(input === undefined || input === null ? "" : String(input));
  }
}

if (typeof g.TextEncoder === "undefined") {
  g.TextEncoder = SafeTextEncoder;
} else if (g.TextEncoder?.prototype?.encode) {
  const origEncode = g.TextEncoder.prototype.encode;
  g.TextEncoder.prototype.encode = function (input?: string) {
    return origEncode.call(this, input === undefined || input === null ? "" : String(input));
  };
}

if (typeof g.TextDecoder === "undefined") {
  g.TextDecoder = PolyfillTextDecoder;
}

const SockJS = require("sockjs-client");

export type SubscriptionCallback = (message: any) => void;

class SocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, string> = new Map(); // topic -> subscriptionId
  private subscriptionCallbacks: Map<string, SubscriptionCallback> = new Map(); // topic -> callback

  public async connect(onConnected?: () => void) {
    if (this.client?.active) {
      if (this.client?.connected) {
        onConnected?.();
      }
      return;
    }

    const token = await safeStorage.getItem("token");
    if (!token) return;

    const rawUrl = getBaseUrl().replace("/api", "");
    const wsUrl = rawUrl.replace(/^http:\/\//i, "ws://").replace(/^https:\/\//i, "wss://") + "/ws";

    this.client = new Client({
      brokerURL: wsUrl,
      webSocketFactory: () => new WebSocket(wsUrl),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: (str) => {
        if (__DEV__) console.log("[STOMP]", str);
      },
      reconnectDelay: 4000,
      heartbeatIncoming: 0, // Không tự ngắt nếu server phản hồi trễ do lag mạng
      heartbeatOutgoing: 20000, // Gửi ping 20s/lần giữ kết nối TCP luôn sống
      forceBinaryWSFrames: false,
      appendMissingNULLonIncoming: true,
    });

    this.client.onConnect = () => {
      console.log("[STOMP] Connected to", wsUrl);
      
      // Auto re-subscribe to all active topics on reconnect
      this.subscriptions.clear();
      this.subscriptionCallbacks.forEach((cb, top) => {
        try {
          const sub = this.client?.subscribe(top, (message) => {
            try {
              const body = JSON.parse(message.body);
              cb(body);
            } catch (e) {
              cb(message.body);
            }
          });
          if (sub?.id) {
            this.subscriptions.set(top, sub.id);
            console.log(`[STOMP] Active subscription to ${top}`);
          }
        } catch (err) {
          console.warn(`[STOMP] Failed to re-subscribe to ${top}:`, err);
        }
      });

      onConnected?.();
    };

    this.client.onStompError = (frame) => {
      console.error("[STOMP] Error:", frame.headers["message"]);
      console.error("Details:", frame.body);
    };

    this.client.onWebSocketClose = () => {
      console.log("[STOMP] WebSocket connection closed, will auto-reconnect in 3s...");
    };

    this.client.activate();
  }

  public disconnect() {
    if (this.client) {
      try {
        this.client.deactivate();
      } catch (e) {
        // Ignore deactivate error on closed socket
      }
      this.client = null;
      this.subscriptions.clear();
      this.subscriptionCallbacks.clear();
      console.log("[STOMP] Disconnected");
    }
  }

  public subscribe(topic: string, callback: SubscriptionCallback) {
    this.subscriptionCallbacks.set(topic, callback);

    if (!this.client || !this.client.connected) {
      console.log(`[STOMP] Registered pending subscription for ${topic} (will subscribe on connect)`);
      return;
    }

    // Unsubscribe existing active subscription if any
    const existingSubId = this.subscriptions.get(topic);
    if (existingSubId) {
      try {
        this.client.unsubscribe(existingSubId);
      } catch (e) {
        // Ignore
      }
    }

    try {
      const subscription = this.client.subscribe(topic, (message) => {
        try {
          const body = JSON.parse(message.body);
          callback(body);
        } catch (e) {
          callback(message.body);
        }
      });

      this.subscriptions.set(topic, subscription.id);
      console.log(`[STOMP] Subscribed to ${topic}`);
    } catch (err) {
      console.warn(`[STOMP] Error subscribing to ${topic}:`, err);
    }
  }

  public unsubscribe(topic: string) {
    this.subscriptionCallbacks.delete(topic);
    const subId = this.subscriptions.get(topic);
    if (subId && this.client && this.client.connected) {
      try {
        this.client.unsubscribe(subId);
      } catch (e) {
        // Ignore
      }
      this.subscriptions.delete(topic);
      console.log(`[STOMP] Unsubscribed from ${topic}`);
    }
  }
}

export const socketService = new SocketService();
