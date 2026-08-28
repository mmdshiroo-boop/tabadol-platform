import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectDB = async () => {
  // بررسی وجود MONGODB_URI
  if (!process.env.MONGODB_URI) {
    throw new Error("❌ MONGODB_URI is not defined in .env file");
  }

  try {
const conn = await mongoose.connect(process.env.MONGODB_URI, {
  retryWrites: false,
});    console.log(`✅ MongoDB connected successfully`);
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`🔗 Host: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
};
