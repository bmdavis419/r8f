import "dotenv/config";

import { z } from "zod";

const defaultProductionBaseUrl = "https://api.mercury.com/api/v1";
const defaultSandboxBaseUrl = "https://api-sandbox.mercury.com/api/v1";

const booleanish = z
  .enum(["true", "false", "1", "0"])
  .optional()
  .transform((value) => value === "true" || value === "1");

const baseEnvSchema = z.object({
  MERCURY_API_BASE_URL: z.url().optional(),
  MERCURY_API_TOKEN: z.string().min(1).optional(),
  MERCURY_PROFILE_IDS: z.string().optional(),
  MERCURY_REQUEST_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(10_000),
  MERCURY_USE_SANDBOX: booleanish,
  PORT: z.coerce.number().int().positive().default(3000),
});

const env = baseEnvSchema.parse(process.env);

const profileIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9-]+$/);

const toEnvSuffix = (value: string) => value.replace(/-/g, "_").toUpperCase();

const titleCase = (value: string) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const buildProfileBaseUrl = (useSandbox?: boolean, baseUrl?: string) =>
  baseUrl ?? (useSandbox ? defaultSandboxBaseUrl : defaultProductionBaseUrl);

export type MercuryProfileConfig = {
  baseUrl: string;
  id: string;
  label: string;
  token: string;
  useSandbox: boolean;
};

const configuredProfileIds = (env.MERCURY_PROFILE_IDS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)
  .map((value) => profileIdSchema.parse(value));

const configuredProfiles = configuredProfileIds.map<MercuryProfileConfig>(
  (id) => {
    const suffix = toEnvSuffix(id);
    const token = process.env[`MERCURY_PROFILE_${suffix}_TOKEN`];

    if (!token) {
      throw new Error(
        `Missing MERCURY_PROFILE_${suffix}_TOKEN for Mercury profile "${id}".`,
      );
    }

    const useSandbox =
      process.env[`MERCURY_PROFILE_${suffix}_USE_SANDBOX`] === "true" ||
      process.env[`MERCURY_PROFILE_${suffix}_USE_SANDBOX`] === "1";
    const baseUrl = process.env[`MERCURY_PROFILE_${suffix}_API_BASE_URL`];

    return {
      baseUrl: buildProfileBaseUrl(useSandbox, baseUrl),
      id,
      label: process.env[`MERCURY_PROFILE_${suffix}_LABEL`] ?? titleCase(id),
      token,
      useSandbox,
    };
  },
);

const legacyProfile = env.MERCURY_API_TOKEN
  ? [
      {
        baseUrl: buildProfileBaseUrl(
          env.MERCURY_USE_SANDBOX,
          env.MERCURY_API_BASE_URL,
        ),
        id: "default",
        label: "Mercury",
        token: env.MERCURY_API_TOKEN,
        useSandbox: env.MERCURY_USE_SANDBOX,
      } satisfies MercuryProfileConfig,
    ]
  : [];

const profiles =
  configuredProfiles.length > 0 ? configuredProfiles : legacyProfile;

export const config = {
  mercury: {
    profiles,
    requestTimeoutMs: env.MERCURY_REQUEST_TIMEOUT_MS,
  },
  port: env.PORT,
};
