import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

console.log("🔧 API Client initialized with baseURL:", API_URL);

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 120000, // ✅ از ۳۰ ثانیه به ۲ دقیقه افزایش یافت
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ اینترسپتور درخواست
apiClient.interceptors.request.use(
  (config) => {
    // 🔴 اصلاح هوشمند برای آپلود فایل:
    // اگر داده ارسالی از نوع FormData باشد، هدر Content-Type پیش‌فرض حذف می‌شود
    // تا مرورگر به صورت خودکار هدر مالتی‌پارت را به همراه Boundary درست تولید کند.
    if (config.data instanceof FormData) {
      if (config.headers) {
        if (typeof config.headers.delete === "function") {
          config.headers.delete("Content-Type");
        } else {
          delete config.headers["Content-Type"];
          delete config.headers["content-type"];
        }
      }
    }

    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ✅ اینترسپتور پاسخ
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRoute =
      error.config?.url?.includes("/auth/login") ||
      error.config?.url?.includes("/auth/register") ||
      error.config?.url?.includes("/auth/send-code") ||
      error.config?.url?.includes("/auth/verify-code") ||
      error.config?.url?.includes("/auth/forgot-password") ||
      error.config?.url?.includes("/auth/reset-password");

    const isAuthMeRoute = error.config?.url?.includes("/auth/me");
    const isOfflineRoute = error.config?.url?.includes("/locations/me/offline");
    const isUnauthorized = error.response?.status === 401;

    // 🛑 برای session expired فقط در مسیرهای غیر auth/offline ریدایرکت کن
    if (
      isUnauthorized &&
      typeof window !== "undefined" &&
      !isAuthMeRoute &&
      !isOfflineRoute &&
      !isAuthRoute
    ) {
      const message = error.response?.data?.message;

      if (message === "نشست شما منقضی شده است. لطفاً دوباره وارد شوید.") {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        if (!window.location.pathname.includes("/auth")) {
          window.location.href = "/auth/login?reason=session_expired";
        }
        return Promise.reject(error);
      }

      console.warn("⚠️ 401 Unauthorized for:", error.config?.url);
      console.warn("⚠️ Message:", message);
    }

    // لاگ خطاها (حذف لاگ برای مسیرهای auth و offline که خطا در آن‌ها طبیعی است)
    if (error.response && !isOfflineRoute && !isAuthRoute) {
      console.error(`❌ HTTP ${error.response.status} ${error.config?.url}`);
      console.error("❌ Response data:", error.response.data);
      if (error.response.status === 500) {
        console.error(
          "💥 سرور دچار خطای داخلی شده است. لطفاً لاگ سرور را بررسی کنید.",
        );
      }
    } else if (error.request && !isOfflineRoute && !isAuthRoute) {
      console.error("❌ No response received:", error.config?.url);
    } else if (!isOfflineRoute && !isAuthRoute) {
      console.error("❌ Request error:", error.message);
    }

    return Promise.reject(error);
  },
);

export default apiClient;
export { apiClient };