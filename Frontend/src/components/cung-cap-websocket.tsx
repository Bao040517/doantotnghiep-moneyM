"use client";

import { useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { toast } from "sonner";
import { usePathname } from "next/navigation";

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [stompClient, setStompClient] = useState<Client | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Only connect if user is logged in
    const userStr = localStorage.getItem("user");
    if (!userStr) return;

    const user = JSON.parse(userStr);
    const userId = user.id;

    // Build WS URL based on API URL
    const getWsUrl = () => {
      if (process.env.NEXT_PUBLIC_API_URL) {
        // e.g. https://api.sharemoney.com/api -> https://api.sharemoney.com/ws
        return process.env.NEXT_PUBLIC_API_URL.replace(/\/api$/, "/ws");
      }
      return typeof window !== "undefined"
        ? `http://${window.location.hostname}:8080/ws`
        : "http://localhost:8080/ws";
    };

    const socket = new SockJS(getWsUrl());

    const client = new Client({
      webSocketFactory: () => socket,
      debug: (str) => {
        // console.log(str);
      },
      onConnect: () => {
        console.log("Connected to WebSocket");
        // Subscribe to user-specific topic
        client.subscribe(`/topic/user/${userId}`, (message) => {
          if (message.body) {
            const notification = JSON.parse(message.body);
            // Display toast notification
            let icon = "🔔";
            if (notification.type === "PAYMENT_RECEIVED") icon = "🎉";
            else if (notification.type === "SPENDING_ANOMALY") icon = "🚨";

            toast(notification.message, {
              duration: 5000,
              icon: icon,
            });
          }
        });
      },
      onStompError: (frame) => {
        console.error("Broker reported error: " + frame.headers["message"]);
        console.error("Additional details: " + frame.body);
      },
      // Automatically reconnect
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.activate();
    setStompClient(client);

    return () => {
      client.deactivate();
    };
  }, [pathname]); // Re-evaluate if pathname changes (e.g. after login)

  return <>{children}</>;
}
