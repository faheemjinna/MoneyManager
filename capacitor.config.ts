import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.faheemjinna.moneymanager",
  appName: "Money Manager",
  webDir: "dist",
  server: {
    androidScheme: "https",
    cleartext: true,
  },
};

export default config;
