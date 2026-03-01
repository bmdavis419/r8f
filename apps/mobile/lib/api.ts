import Constants from "expo-constants";
import { Platform } from "react-native";

const resolveHost = () => {
  const configuredHost = process.env.EXPO_PUBLIC_API_URL;

  if (configuredHost) {
    return configuredHost;
  }

  const hostUri = Constants.expoConfig?.hostUri;

  if (hostUri) {
    return `http://${hostUri.split(":")[0]}:3000`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:3000";
  }

  if (Platform.OS === "ios") {
    return "http://127.0.0.1:3000";
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `http://${window.location.hostname || "localhost"}:3000`;
  }

  return "http://localhost:3000";
};

export const apiUrl = resolveHost();
