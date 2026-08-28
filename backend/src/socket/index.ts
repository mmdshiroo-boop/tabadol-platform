// backend/src/socket/index.ts
import { Server as SocketServer } from "socket.io";
import { Server } from "http";
import jwt from "jsonwebtoken";

let io: SocketServer;

export const initSocket = (server: Server) => {
  io = new SocketServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
    },
  });

  // احراز هویت سوکت
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.data.userId = decoded.id || decoded._id;
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    if (userId) {
      // جوین شدن کاربر به روم شخصی خودش
      socket.join(`user_${userId}`);
      console.log(`✅ User ${userId} connected (socket: ${socket.id})`);
    }

    // چت و مکالمات
    socket.on("join-conversation", (conversationId: string) => {
      socket.join(`conversation_${conversationId}`);
      console.log(`User ${userId} joined conversation ${conversationId}`);
    });

    socket.on("leave-conversation", (conversationId: string) => {
      socket.leave(`conversation_${conversationId}`);
    });

    socket.on("disconnect", () => {
      console.log(`❌ User ${userId} disconnected`);
    });

    // تایپینگ
    socket.on("typing", (conversationId: string) => {
      socket.to(`conversation_${conversationId}`).emit("user-typing", {
        userId: socket.data.userId,
        conversationId,
      });
    });

    socket.on("stop-typing", (conversationId: string) => {
      socket.to(`conversation_${conversationId}`).emit("user-stop-typing", {
        userId: socket.data.userId,
        conversationId,
      });
    });
  });

  return io;
};

// ══════════════════════════════════════════════
// توابع کمکی ارسال آنی (Helpers)
// ══════════════════════════════════════════════

export const sendRealTimeMessage = (
  receiverId: string,
  message: any,
  conversation: any,
) => {
  if (io) {
    io.to(`user_${receiverId}`).emit("new-message", {
      message,
      conversation,
    });
  }
};

export const sendRealTimeNotification = (userId: string, notification: any) => {
  if (io) {
    io.to(`user_${userId}`).emit("new-notification", notification);
  }
};

// 🆕 تابع کمکی برای ارسال پیشرفت تزریق فله‌ای
export const sendBulkProgress = (userId: string, data: any) => {
  if (io) {
    io.to(`user_${userId}`).emit("bulk-progress", data);
  }
};

export const getIO = () => io;
export { io };