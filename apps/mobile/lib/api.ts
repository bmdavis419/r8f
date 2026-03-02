import Constants from "expo-constants";
import { Platform } from "react-native";

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

const passcodeHeaderName = "x-r8f-passcode";
const unauthorizedListeners = new Set<() => void>();

let apiPasscode: string | null = null;

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

export class ApiUnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiUnauthorizedError";
  }
}

const getErrorMessage = (payload: ApiErrorResponse, status: number) =>
  payload.error?.message ?? `API request failed with status ${status}.`;

const notifyUnauthorized = () => {
  unauthorizedListeners.forEach((listener) => listener());
};

const parseJson = async <T>(response: Response) => {
  try {
    return (await response.json()) as T & ApiErrorResponse;
  } catch {
    return {} as T & ApiErrorResponse;
  }
};

const requestJson = async <T>(path: string, passcode = apiPasscode) => {
  if (!passcode) {
    throw new ApiUnauthorizedError("Enter the app passcode to continue.");
  }

  const response = await fetch(`${apiUrl}${path}`, {
    headers: {
      [passcodeHeaderName]: passcode,
    },
  });
  const payload = await parseJson<T>(response);

  if (!response.ok) {
    const message = getErrorMessage(payload, response.status);

    if (response.status === 401) {
      if (passcode === apiPasscode) {
        apiPasscode = null;
        notifyUnauthorized();
      }

      throw new ApiUnauthorizedError(message);
    }

    throw new Error(message);
  }

  return payload as T;
};

export const fetchApiJson = <T>(path: string) => requestJson<T>(path);

export const verifyApiPasscode = async (passcode: string) => {
  await requestJson("/api/hello", passcode);
};

export const setApiPasscode = (passcode: string | null) => {
  apiPasscode = passcode;
};

export const onApiUnauthorized = (listener: () => void) => {
  unauthorizedListeners.add(listener);

  return () => {
    unauthorizedListeners.delete(listener);
  };
};
