// frontend/hooks/useSocketNotifications.ts
"use client";

import { useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import { Notification } from "@/services/api/notification.api";

export function useSocketNotifications() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [newNotification, setNewNotification] = useState<Notification | null>(
    null,
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const socketInstance = io(
      process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
        "http://localhost:5001",
      {
        auth: { token },
        transports: ["websocket"],
      },
    );

    socketInstance.on("new-notification", (notification: Notification) => {
      console.log("📢 New notification received:", notification);
      setNewNotification(notification);
    });

    socketInstance.on("disconnect", () => {
      console.log("🔌 Socket disconnected");
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const clearNewNotification = () => {
    setNewNotification(null);
  };

  return { socket, newNotification, clearNewNotification };
}
