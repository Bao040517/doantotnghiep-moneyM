import { Client } from "@stomp/stompjs";
import { getBaseUrl } from "./api";
import { safeStorage } from "./storage";
import { Platform } from "react-native";

const SockJS = require("sockjs-client");
const { TextEncoder, TextDecoder } = require("text-encoding");

// Polyfill text-encoding for React Native
if (typeof global.TextEncoder === "undefined") {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === "undefined") {
  global.TextDecoder = TextDecoder;
}

export type SubscriptionCallback = (message: any) => void;

class SocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, string> = new Map(); // topic -> subscriptionId

  public async connect(onConnected?: () => void) {
    if (this.client?.connected) {
      onConnected?.();
      return;
    }

    const token = await safeStorage.getItem("token");
    if (!token) return;

    const wsUrl = getBaseUrl().replace("/api", "") + "/ws";

    this.client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: (str) => {
        if (__DEV__) console.log("[STOMP]", str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      forceBinaryWSFrames: true,
      appendMissingNULLonIncoming: true,
    });

    this.client.onConnect = () => {
      console.log("[STOMP] Connected to", wsUrl);
      onConnected?.();
    };

    this.client.onStompError = (frame) => {
      console.error("[STOMP] Error:", frame.headers["message"]);
      console.error("Details:", frame.body);
    };

    this.client.activate();
  }

  public disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      this.subscriptions.clear();
      console.log("[STOMP] Disconnected");
    }
  }

  public subscribe(topic: string, callback: SubscriptionCallback) {
    if (!this.client || !this.client.connected) {
      console.warn(`[STOMP] Cannot subscribe to ${topic}. Client not connected.`);
      return;
    }

    // Unsubscribe if already subscribed to this topic
    this.unsubscribe(topic);

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
  }

  public unsubscribe(topic: string) {
    const subId = this.subscriptions.get(topic);
    if (subId && this.client) {
      this.client.unsubscribe(subId);
      this.subscriptions.delete(topic);
      console.log(`[STOMP] Unsubscribed from ${topic}`);
    }
  }
}

export const socketService = new SocketService();
