import { config, type MercuryProfileConfig } from "../config.js";

type MercuryRecord = Record<string, unknown>;

const parseBody = async (response: Response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

const toSearchParams = (query?: Record<string, string | undefined>) => {
  const params = new URLSearchParams();

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  return params;
};

export class MercuryApiError extends Error {
  body: unknown;
  endpoint: string;
  profileId: string;
  status: number;

  constructor(
    message: string,
    status: number,
    body: unknown,
    profileId: string,
    endpoint: string,
  ) {
    super(message);
    this.name = "MercuryApiError";
    this.body = body;
    this.endpoint = endpoint;
    this.profileId = profileId;
    this.status = status;
  }
}

const createRequest =
  (profile: MercuryProfileConfig) =>
  async (path: string, query?: Record<string, string | undefined>) => {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      config.mercury.requestTimeoutMs,
    );
    const normalizedPath = path.replace(/^\/+/, "");
    const url = new URL(normalizedPath, `${profile.baseUrl}/`);
    const params = toSearchParams(query);

    if (params.size > 0) {
      url.search = params.toString();
    }

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${profile.token}`,
        },
        signal: controller.signal,
      });
      const body = await parseBody(response);

      if (!response.ok) {
        throw new MercuryApiError(
          `Mercury request failed with status ${response.status}.`,
          response.status,
          body,
          profile.id,
          normalizedPath,
        );
      }

      return body;
    } catch (error) {
      if (error instanceof MercuryApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new MercuryApiError(
          `Mercury request timed out after ${config.mercury.requestTimeoutMs}ms.`,
          504,
          null,
          profile.id,
          normalizedPath,
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };

export const createMercuryClient = (profile: MercuryProfileConfig) => {
  const request = createRequest(profile);

  return {
    baseUrl: profile.baseUrl,
    getCustomer: (customerId: string) => request(`/ar/customers/${customerId}`),
    getInvoice: (invoiceId: string) => request(`/ar/invoices/${invoiceId}`),
    getOrganization: () => request("/organization"),
    id: profile.id,
    isConfigured: () => true,
    label: profile.label,
    listAccounts: (query?: Record<string, string | undefined>) =>
      request("/accounts", query),
    listCreditAccounts: () => request("/credit"),
    listInvoiceAttachments: (invoiceId: string) =>
      request(`/ar/invoices/${invoiceId}/attachments`),
    listInvoices: (query?: Record<string, string | undefined>) =>
      request("/ar/invoices", query),
    listTransactions: (query?: Record<string, string | undefined>) =>
      request("/transactions", query),
    listTransactionsForAccount: (
      accountId: string,
      query?: Record<string, string | undefined>,
    ) => request(`/account/${accountId}/transactions`, query),
    profile,
    request,
    useSandbox: profile.useSandbox,
  };
};

export const mercuryClients = config.mercury.profiles.map(createMercuryClient);

export type MercuryClient = (typeof mercuryClients)[number];

export const getMercuryClient = (profileId: string) =>
  mercuryClients.find((client) => client.id === profileId) ?? null;

export const hasMercuryProfiles = () => mercuryClients.length > 0;

export const listMercuryClients = () => mercuryClients;

export const asMercuryRecord = (value: unknown) =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as MercuryRecord)
    : null;

export const isMercuryFeatureUnavailable = (error: unknown) =>
  error instanceof MercuryApiError &&
  (error.status === 403 || error.status === 404 || error.status === 422);

export const getMercuryErrorMessage = (error: unknown) => {
  if (!(error instanceof MercuryApiError)) {
    return error instanceof Error ? error.message : "Unknown Mercury error.";
  }

  const bodyRecord = asMercuryRecord(error.body);
  const errorsRecord = asMercuryRecord(bodyRecord?.errors);
  const message =
    typeof errorsRecord?.message === "string" ? errorsRecord.message : null;
  const subscriptions = Array.isArray(errorsRecord?.subscriptions)
    ? errorsRecord.subscriptions.filter(
        (value): value is string => typeof value === "string",
      )
    : [];

  return message ?? subscriptions[0] ?? error.message;
};
