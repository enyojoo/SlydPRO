export const PLATFORM_CONFIG = {
  name: "SlydPRO",
  colors: {
    primary: "#027659",
    primaryLight: "#059669",
    primaryDark: "#065f46",
    secondary: "#10b981",
    accent: "#34d399",
    gradient: "linear-gradient(135deg, #027659 0%, #10b981 100%)",
  },
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
    v0ApiUrl: "https://api.v0.dev",
  },
  credits: {
    inputTokenCost: 0.001, // Cost per input token
    outputTokenCost: 0.002, // Cost per output token
    freeMonthlyCredits: 10.0,
  },
}
