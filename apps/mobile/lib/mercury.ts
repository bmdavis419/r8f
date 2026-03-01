import { apiUrl } from "@/lib/api";

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

type ProfileRef = {
  id: string;
  label: string;
};

type OrganizationRef = {
  id: string;
  kind: string;
  legalBusinessName: string;
};

type FeatureSupport = {
  error?: {
    code: string;
    message: string;
    status: number | null;
  };
  supported: boolean;
};

export type AccountBalance = {
  available: number | null;
  current: number | null;
};

export type MercuryAccount = {
  accountNumberLast4: string | null;
  balances: AccountBalance;
  dashboardLink: string | null;
  id: string | null;
  kind: string | null;
  name: string | null;
  organization: OrganizationRef | null;
  profile: ProfileRef;
  routingNumberLast4: string | null;
  status: string | null;
};

export type MercuryCreditAccount = {
  balances: AccountBalance;
  createdAt: string | null;
  id: string | null;
  organization: OrganizationRef | null;
  profile: ProfileRef;
  status: string | null;
};

export type MercuryOverviewProfile = {
  capabilities: {
    accounts: FeatureSupport;
    credit: FeatureSupport;
    invoices: FeatureSupport;
  };
  data: {
    accounts: MercuryAccount[];
    creditAccounts: MercuryCreditAccount[];
    summary: {
      cashAvailable: number;
      cashCurrent: number;
      creditAvailable: number;
      creditCurrent: number;
      netAvailable: number;
      netCurrent: number;
    };
  };
  organization: OrganizationRef | null;
  profile: ProfileRef;
};

export type MercuryOverviewResponse = {
  data: {
    profiles: MercuryOverviewProfile[];
    summary: {
      cashAvailable: number;
      cashCurrent: number;
      creditAvailable: number;
      creditCurrent: number;
      netAvailable: number;
      netCurrent: number;
    };
  };
  meta: {
    asOf: string;
  };
};

export type MercuryTransaction = {
  accountId: string | null;
  amount: number | null;
  bankDescription: string | null;
  category: {
    mercury: string | null;
    user: string | null;
  };
  counterparty: {
    name: string | null;
  };
  createdAt: string | null;
  details?: Record<string, unknown> | null;
  direction: "inflow" | "neutral" | "outflow" | null;
  estimatedDeliveryDate: string | null;
  id: string | null;
  kind: string | null;
  merchant?: {
    category?: string;
  } | null;
  organization: OrganizationRef | null;
  postedAt: string | null;
  profile: ProfileRef;
  status: string | null;
};

export type MercuryTransactionsResponse = {
  data: {
    items: MercuryTransaction[];
  };
};

export type MercuryInvoice = {
  amount: number | null;
  createdAt: string | null;
  customer: {
    name: string | null;
  } | null;
  dueDate: string | null;
  id: string | null;
  invoiceNumber: string | null;
  organization: OrganizationRef | null;
  profile: ProfileRef;
  status: string | null;
};

export type MercuryInvoicesResponse = {
  data: {
    items: MercuryInvoice[];
    profiles: {
      data: {
        items: MercuryInvoice[];
      };
      invoices: FeatureSupport;
      organization: OrganizationRef | null;
      profile: ProfileRef;
    }[];
  };
  meta: {
    note: string;
  };
};

const getErrorMessage = (payload: ApiErrorResponse, status: number) =>
  payload.error?.message ?? `API request failed with status ${status}.`;

const fetchJson = async <T>(path: string) => {
  const response = await fetch(`${apiUrl}${path}`);
  const payload = (await response.json()) as T & ApiErrorResponse;

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, response.status));
  }

  return payload as T;
};

const buildQuery = (params: Record<string, string | undefined>) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : "";
};

export const mercuryApi = {
  getInvoices: () =>
    fetchJson<MercuryInvoicesResponse>(
      "/api/mercury/invoices?limit=40&order=desc",
    ),
  getOverview: () =>
    fetchJson<MercuryOverviewResponse>("/api/mercury/overview"),
  getTransactions: ({ limit = 120 }: { limit?: number } = {}) =>
    fetchJson<MercuryTransactionsResponse>(
      `/api/mercury/transactions${buildQuery({
        limit: limit.toString(),
        order: "desc",
      })}`,
    ),
};
