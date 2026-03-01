import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

import { config } from "./config.js";
import {
  getMercuryClient,
  getMercuryErrorMessage,
  hasMercuryProfiles,
  isMercuryFeatureUnavailable,
  listMercuryClients,
  MercuryApiError,
  type MercuryClient,
} from "./mercury/client.js";
import {
  normalizeAccountsResponse,
  normalizeCreditAccountsResponse,
  normalizeInvoiceDetail,
  normalizeInvoicesResponse,
  normalizeOrganizationResponse,
  normalizeTransactionsResponse,
} from "./mercury/normalizers.js";

const profileQuerySchema = z.object({
  profile: z.string().optional(),
});

const healthQuerySchema = profileQuerySchema.extend({
  check: z.enum(["true", "false", "1", "0"]).optional(),
});

const transactionsQuerySchema = profileQuerySchema.extend({
  accountId: z.string().optional(),
  categories: z.string().optional(),
  end: z.string().optional(),
  end_before: z.string().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .transform((value) => value?.toString()),
  order: z.enum(["asc", "desc"]).optional(),
  search: z.string().optional(),
  start: z.string().optional(),
  start_after: z.string().optional(),
  status: z.string().optional(),
});

const invoicesQuerySchema = profileQuerySchema.extend({
  end_before: z.string().optional(),
  includeCustomer: z.enum(["true", "false", "1", "0"]).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .transform((value) => value?.toString()),
  order: z.enum(["asc", "desc"]).optional(),
  start_after: z.string().optional(),
  status: z.string().optional(),
});

type ApiStatus =
  | 400
  | 401
  | 403
  | 404
  | 408
  | 409
  | 422
  | 429
  | 500
  | 502
  | 503
  | 504;

type FeatureResult<T> =
  | {
      data: T;
      error?: never;
      supported: true;
    }
  | {
      data?: never;
      error: {
        code: string;
        message: string;
        status: number | null;
      };
      supported: false;
    };

const isTruthy = (value?: string) => value === "true" || value === "1";

const mercuryNotConfigured = {
  error: {
    code: "mercury_not_configured",
    message:
      "Configure Mercury profiles in apps/api/.env before using Mercury routes.",
  },
};

const parseMercuryError = (error: unknown, hint?: string) => {
  if (error instanceof MercuryApiError) {
    const status = error.status as ApiStatus;

    return {
      error: {
        body: error.body,
        code: "mercury_request_failed",
        endpoint: error.endpoint,
        hint,
        message: getMercuryErrorMessage(error),
        profileId: error.profileId,
        status,
      },
      status,
    };
  }

  return {
    error: {
      code: "internal_error",
      hint,
      message: error instanceof Error ? error.message : "Unknown server error.",
      status: 500 as ApiStatus,
    },
    status: 500 as ApiStatus,
  };
};

const resolveClients = (profile?: string) => {
  const clients = listMercuryClients();

  if (!profile || profile === "all") {
    return clients;
  }

  const client = getMercuryClient(profile);

  if (!client) {
    throw new Response(
      JSON.stringify({
        error: {
          code: "unknown_profile",
          message: `Unknown Mercury profile "${profile}".`,
        },
      }),
      {
        headers: {
          "content-type": "application/json",
        },
        status: 404,
      },
    );
  }

  return [client];
};

const requireSingleClient = (profile?: string) => {
  const clients = resolveClients(profile);

  if (clients.length === 1) {
    return clients[0];
  }

  throw new Response(
    JSON.stringify({
      error: {
        code: "profile_required",
        message:
          "Specify ?profile=<id> when requesting a single invoice with multiple Mercury profiles configured.",
      },
    }),
    {
      headers: {
        "content-type": "application/json",
      },
      status: 400,
    },
  );
};

const getCustomersById = async (
  client: MercuryClient,
  customerIds: Array<string | null>,
) => {
  const ids = [...new Set(customerIds.filter(Boolean))] as string[];

  if (ids.length === 0) {
    return new Map<string, unknown>();
  }

  const customers = await Promise.all(
    ids.map(
      async (customerId) =>
        [customerId, await client.getCustomer(customerId)] as const,
    ),
  );

  return new Map(customers);
};

const withProfileContext = <T extends Record<string, unknown>>(
  client: MercuryClient,
  organization: ReturnType<typeof normalizeOrganizationResponse> | null,
  item: T,
) => ({
  ...item,
  organization: organization
    ? {
        id: organization.id,
        kind: organization.kind,
        legalBusinessName: organization.legalBusinessName,
      }
    : null,
  profile: {
    id: client.id,
    label: client.label,
  },
});

const withOptionalFeature = async <T>(
  task: () => Promise<T>,
): Promise<FeatureResult<T>> => {
  try {
    return {
      data: await task(),
      supported: true,
    };
  } catch (error) {
    if (isMercuryFeatureUnavailable(error)) {
      const mercuryError = error as MercuryApiError;

      return {
        error: {
          code: "feature_unavailable",
          message: getMercuryErrorMessage(error),
          status: mercuryError.status,
        },
        supported: false,
      };
    }

    throw error;
  }
};

const sortByNewest = <
  T extends {
    createdAt?: string | null;
    postedAt?: string | null;
  },
>(
  items: T[],
) =>
  [...items].sort((left, right) => {
    const leftValue = left.postedAt ?? left.createdAt ?? "";
    const rightValue = right.postedAt ?? right.createdAt ?? "";

    return rightValue.localeCompare(leftValue);
  });

export const app = new Hono();

app.use("/api/*", cors());

app.get("/", (c) => {
  return c.json({
    mercury: {
      configured: hasMercuryProfiles(),
      profiles: listMercuryClients().map((client) => ({
        baseUrl: client.baseUrl,
        id: client.id,
        label: client.label,
        useSandbox: client.useSandbox,
      })),
    },
    name: "r8f-api",
    status: "ok",
  });
});

app.get("/api/hello", (c) => {
  return c.json({
    message: "Hello from the r8f Hono API.",
    mercuryReady: hasMercuryProfiles(),
    profilesConfigured: listMercuryClients().length,
    project: "r8f",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/mercury/profiles", async (c) => {
  if (!hasMercuryProfiles()) {
    return c.json(mercuryNotConfigured, 503);
  }

  const query = healthQuerySchema.parse(c.req.query());
  const performCheck = isTruthy(query.check);

  try {
    const profiles = await Promise.all(
      resolveClients(query.profile).map(async (client) => {
        if (!performCheck) {
          return {
            capabilities: null,
            id: client.id,
            label: client.label,
            mercury: {
              baseUrl: client.baseUrl,
              useSandbox: client.useSandbox,
            },
          };
        }

        const [organization, accounts, credit, invoices] = await Promise.all([
          withOptionalFeature(() => client.getOrganization()),
          withOptionalFeature(() => client.listAccounts({ limit: "1" })),
          withOptionalFeature(() => client.listCreditAccounts()),
          withOptionalFeature(() => client.listInvoices({ limit: "1" })),
        ]);

        return {
          capabilities: {
            accounts,
            credit,
            invoices,
            organization,
          },
          id: client.id,
          label: client.label,
          mercury: {
            baseUrl: client.baseUrl,
            useSandbox: client.useSandbox,
          },
          organization:
            organization.supported && organization.data
              ? normalizeOrganizationResponse(organization.data)
              : null,
        };
      }),
    );

    return c.json({
      data: profiles,
      meta: {
        checked: performCheck,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    const response = parseMercuryError(error);
    return c.json(response, response.status);
  }
});

app.get("/api/mercury/health", async (c) => {
  if (!hasMercuryProfiles()) {
    return c.json({
      configured: false,
      profiles: [],
      timestamp: new Date().toISOString(),
      ...mercuryNotConfigured,
    });
  }

  const query = healthQuerySchema.parse(c.req.query());
  const performCheck = isTruthy(query.check);

  try {
    const profiles = await Promise.all(
      resolveClients(query.profile).map(async (client) => {
        if (!performCheck) {
          return {
            configured: true,
            id: client.id,
            label: client.label,
            mercury: {
              baseUrl: client.baseUrl,
              useSandbox: client.useSandbox,
            },
          };
        }

        const organization = await withOptionalFeature(() =>
          client.getOrganization(),
        );
        const accounts = await withOptionalFeature(() =>
          client.listAccounts({ limit: "1" }),
        );

        return {
          configured: true,
          id: client.id,
          label: client.label,
          mercury: {
            baseUrl: client.baseUrl,
            reachable: organization.supported || accounts.supported,
            useSandbox: client.useSandbox,
          },
          organization:
            organization.supported && organization.data
              ? normalizeOrganizationResponse(organization.data)
              : null,
          sample: {
            accountsReturned:
              accounts.supported && accounts.data
                ? normalizeAccountsResponse(accounts.data).items.length
                : 0,
          },
        };
      }),
    );

    return c.json({
      configured: true,
      profiles,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    const response = parseMercuryError(error);
    return c.json(response, response.status);
  }
});

app.get("/api/mercury/overview", async (c) => {
  if (!hasMercuryProfiles()) {
    return c.json(mercuryNotConfigured, 503);
  }

  const query = profileQuerySchema.parse(c.req.query());

  try {
    const profiles = await Promise.all(
      resolveClients(query.profile).map(async (client) => {
        const [organizationPayload, accountsPayload, creditFeature] =
          await Promise.all([
            client.getOrganization(),
            client.listAccounts(),
            withOptionalFeature(() => client.listCreditAccounts()),
          ]);
        const organization = normalizeOrganizationResponse(organizationPayload);
        const accounts = normalizeAccountsResponse(accountsPayload);
        const credit =
          creditFeature.supported && creditFeature.data
            ? normalizeCreditAccountsResponse(creditFeature.data)
            : null;

        return {
          capabilities: {
            accounts: {
              supported: true,
            },
            credit: creditFeature.supported
              ? {
                  supported: true,
                }
              : creditFeature,
            invoices: {
              supported: organization.kind === "business",
            },
          },
          data: {
            accounts: accounts.items.map((item) =>
              withProfileContext(client, organization, item),
            ),
            creditAccounts:
              credit?.items.map((item) =>
                withProfileContext(client, organization, item),
              ) ?? [],
            summary: {
              cashAvailable: accounts.summary.available,
              cashCurrent: accounts.summary.current,
              creditAvailable: credit?.summary.available ?? 0,
              creditCurrent: credit?.summary.current ?? 0,
              netAvailable:
                accounts.summary.available - (credit?.summary.current ?? 0),
              netCurrent:
                accounts.summary.current - (credit?.summary.current ?? 0),
            },
          },
          organization,
          profile: {
            id: client.id,
            label: client.label,
          },
        };
      }),
    );

    const summary = profiles.reduce(
      (totals, profile) => ({
        cashAvailable:
          totals.cashAvailable + profile.data.summary.cashAvailable,
        cashCurrent: totals.cashCurrent + profile.data.summary.cashCurrent,
        creditAvailable:
          totals.creditAvailable + profile.data.summary.creditAvailable,
        creditCurrent:
          totals.creditCurrent + profile.data.summary.creditCurrent,
        netAvailable: totals.netAvailable + profile.data.summary.netAvailable,
        netCurrent: totals.netCurrent + profile.data.summary.netCurrent,
      }),
      {
        cashAvailable: 0,
        cashCurrent: 0,
        creditAvailable: 0,
        creditCurrent: 0,
        netAvailable: 0,
        netCurrent: 0,
      },
    );

    return c.json({
      data: {
        profiles,
        summary,
      },
      meta: {
        asOf: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    const response = parseMercuryError(error);
    return c.json(response, response.status);
  }
});

app.get("/api/mercury/transactions", async (c) => {
  if (!hasMercuryProfiles()) {
    return c.json(mercuryNotConfigured, 503);
  }

  const query = transactionsQuerySchema.parse(c.req.query());

  try {
    const profiles = await Promise.all(
      resolveClients(query.profile).map(async (client) => {
        const organization = normalizeOrganizationResponse(
          await client.getOrganization(),
        );
        const payload = query.accountId
          ? await client.listTransactionsForAccount(query.accountId, {
              end: query.end,
              end_before: query.end_before,
              limit: query.limit,
              order: query.order,
              search: query.search,
              start: query.start,
              start_after: query.start_after,
              status: query.status,
            })
          : await client.listTransactions({
              categories: query.categories,
              end: query.end,
              end_before: query.end_before,
              limit: query.limit,
              order: query.order,
              start: query.start,
              start_after: query.start_after,
              status: query.status,
            });
        const transactions = normalizeTransactionsResponse(payload);

        return {
          items: transactions.items.map((item) =>
            withProfileContext(client, organization, item),
          ),
          page: transactions.page,
          profile: {
            id: client.id,
            label: client.label,
          },
        };
      }),
    );

    return c.json({
      data: {
        items: sortByNewest(profiles.flatMap((profile) => profile.items)),
        profiles,
      },
      meta: {
        filters: query,
        source: query.accountId ? "account" : "organization",
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    const response = parseMercuryError(error);
    return c.json(response, response.status);
  }
});

app.get("/api/mercury/invoices", async (c) => {
  if (!hasMercuryProfiles()) {
    return c.json(mercuryNotConfigured, 503);
  }

  const query = invoicesQuerySchema.parse(c.req.query());
  const includeCustomer =
    query.includeCustomer === undefined
      ? true
      : isTruthy(query.includeCustomer);

  try {
    const profiles = await Promise.all(
      resolveClients(query.profile).map(async (client) => {
        const organization = normalizeOrganizationResponse(
          await client.getOrganization(),
        );
        const invoicesFeature = await withOptionalFeature(() =>
          client.listInvoices({
            end_before: query.end_before,
            limit: query.limit,
            order: query.order,
            start_after: query.start_after,
          }),
        );

        if (!invoicesFeature.supported || !invoicesFeature.data) {
          return {
            data: {
              items: [],
              page: null,
            },
            invoices: invoicesFeature,
            organization,
            profile: {
              id: client.id,
              label: client.label,
            },
          };
        }

        const invoicesPayload = invoicesFeature.data;
        const baseInvoices = normalizeInvoicesResponse(
          invoicesPayload,
          new Map(),
        );
        const customersById = includeCustomer
          ? await getCustomersById(
              client,
              baseInvoices.items.map((invoice) => invoice.customerId),
            )
          : new Map<string, unknown>();
        const invoices = normalizeInvoicesResponse(
          invoicesPayload,
          customersById,
        );
        const statusFilter = query.status?.toLowerCase();
        const items = (
          statusFilter
            ? invoices.items.filter(
                (invoice) => invoice.status?.toLowerCase() === statusFilter,
              )
            : invoices.items
        ).map((invoice) => withProfileContext(client, organization, invoice));

        return {
          data: {
            items,
            page: invoices.page,
          },
          invoices: {
            supported: true,
          } as const,
          organization,
          profile: {
            id: client.id,
            label: client.label,
          },
        };
      }),
    );

    return c.json({
      data: {
        items: sortByNewest(profiles.flatMap((profile) => profile.data.items)),
        profiles,
      },
      meta: {
        filters: {
          ...query,
          includeCustomer,
        },
        note: "Invoice support depends on Mercury Accounts Receivable access for each configured profile.",
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    const response = parseMercuryError(
      error,
      "Mercury invoices are part of the Accounts Receivable beta and may be unavailable per profile.",
    );
    return c.json(response, response.status);
  }
});

app.get("/api/mercury/invoices/:invoiceId", async (c) => {
  if (!hasMercuryProfiles()) {
    return c.json(mercuryNotConfigured, 503);
  }

  const invoiceId = c.req.param("invoiceId");
  const query = profileQuerySchema.parse(c.req.query());

  try {
    const client = requireSingleClient(query.profile);
    const organization = normalizeOrganizationResponse(
      await client.getOrganization(),
    );
    const invoice = await client.getInvoice(invoiceId);
    const normalizedCustomerId = normalizeInvoiceDetail(
      invoice,
      null,
      null,
    ).customerId;
    const [customer, attachments] = await Promise.all([
      normalizedCustomerId
        ? client.getCustomer(normalizedCustomerId).catch(() => null)
        : Promise.resolve(null),
      client.listInvoiceAttachments(invoiceId).catch(() => null),
    ]);

    return c.json({
      data: withProfileContext(
        client,
        organization,
        normalizeInvoiceDetail(invoice, customer, attachments),
      ),
      meta: {
        invoiceId,
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    const response = parseMercuryError(
      error,
      "Mercury invoices are part of the Accounts Receivable beta and may be unavailable for the selected profile.",
    );
    return c.json(response, response.status);
  }
});

serve(
  {
    fetch: app.fetch,
    port: config.port,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
