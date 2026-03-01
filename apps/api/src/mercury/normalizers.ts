import { asMercuryRecord } from "./client.js";

type MercuryRecord = Record<string, unknown>;

const asString = (value: unknown) => (typeof value === "string" ? value : null);

const asNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const asBoolean = (value: unknown) =>
  typeof value === "boolean" ? value : null;

const asArray = (value: unknown): MercuryRecord[] =>
  Array.isArray(value)
    ? value
        .map((item) => asMercuryRecord(item))
        .filter((item): item is MercuryRecord => Boolean(item))
    : [];

const digitsTail = (value: string | null) => value?.slice(-4) ?? null;

const sum = (values: Array<number | null>) =>
  values.reduce<number>((total, value) => total + (value ?? 0), 0);

const pickPage = (payload: MercuryRecord | null) => {
  const page =
    asMercuryRecord(payload?.page) ?? asMercuryRecord(payload?.pagination);
  const next =
    asString(page?.next_page) ??
    asString(page?.nextPage) ??
    asString(page?.next) ??
    asString(payload?.cursor);
  const previous =
    asString(page?.previous_page) ??
    asString(page?.previousPage) ??
    asString(page?.previous);
  const total = asNumber(payload?.total);

  return {
    next,
    previous,
    total,
  };
};

export const normalizeAccountsResponse = (payload: unknown) => {
  const body = asMercuryRecord(payload);
  const accounts = asArray(body?.accounts).map((account) => ({
    accountNumberLast4: digitsTail(asString(account.accountNumber)),
    balances: {
      available: asNumber(account.availableBalance),
      current: asNumber(account.currentBalance),
    },
    canReceiveTransactions: asBoolean(account.canReceiveTransactions),
    createdAt: asString(account.createdAt),
    id: asString(account.id),
    kind: asString(account.kind),
    legalBusinessName: asString(account.legalBusinessName),
    name: asString(account.name),
    nickname: asString(account.nickname),
    routingNumberLast4: digitsTail(asString(account.routingNumber)),
    status: asString(account.status),
    type: asString(account.type),
    dashboardLink: asString(account.dashboardLink),
  }));

  return {
    items: accounts,
    page: pickPage(body),
    summary: {
      available: sum(accounts.map((account) => account.balances.available)),
      current: sum(accounts.map((account) => account.balances.current)),
    },
  };
};

export const normalizeOrganizationResponse = (payload: unknown) => {
  const body = asMercuryRecord(payload);
  const organization = asMercuryRecord(body?.organization) ?? body;

  return {
    dbas: Array.isArray(organization?.dbas)
      ? organization.dbas.filter(
          (value): value is string => typeof value === "string",
        )
      : [],
    id: asString(organization?.id),
    kind: asString(organization?.kind),
    legalBusinessName: asString(organization?.legalBusinessName),
  };
};

export const normalizeCreditAccountsResponse = (payload: unknown) => {
  const body = asMercuryRecord(payload);
  const accounts = asArray(body?.accounts).map((account) => ({
    balances: {
      available: asNumber(account.availableBalance),
      current: asNumber(account.currentBalance),
    },
    createdAt: asString(account.createdAt),
    id: asString(account.id),
    status: asString(account.status),
  }));

  return {
    items: accounts,
    summary: {
      available: sum(accounts.map((account) => account.balances.available)),
      current: sum(accounts.map((account) => account.balances.current)),
    },
  };
};

export const normalizeTransactionsResponse = (payload: unknown) => {
  const body = asMercuryRecord(payload);
  const items = asArray(body?.transactions).map((transaction) => {
    const amount = asNumber(transaction.amount);
    const merchant = asMercuryRecord(transaction.merchant);
    const categoryData = asMercuryRecord(transaction.categoryData);
    const details = asMercuryRecord(transaction.details);
    const attachments = asArray(transaction.attachments).map((attachment) => ({
      attachmentType: asString(attachment.attachmentType),
      fileName: asString(attachment.fileName),
      id: asString(attachment.id),
      url: asString(attachment.url),
    }));

    return {
      accountId: asString(transaction.accountId),
      amount,
      attachments,
      attachmentsCount: attachments.length,
      bankDescription: asString(transaction.bankDescription),
      category: {
        mercury: asString(transaction.mercuryCategory),
        user: asString(categoryData?.categoryDataName),
      },
      counterparty: {
        id: asString(transaction.counterpartyId),
        name: asString(transaction.counterpartyName),
        nickname: asString(transaction.counterpartyNickname),
      },
      createdAt: asString(transaction.createdAt),
      dashboardLink: asString(transaction.dashboardLink),
      details,
      direction:
        amount === null
          ? null
          : amount < 0
            ? "outflow"
            : amount > 0
              ? "inflow"
              : "neutral",
      estimatedDeliveryDate: asString(transaction.estimatedDeliveryDate),
      externalMemo: asString(transaction.externalMemo),
      generalLedgerCodeName: asString(transaction.generalLedgerCodeName),
      id: asString(transaction.id),
      kind: asString(transaction.kind),
      merchant,
      note: asString(transaction.note),
      postedAt: asString(transaction.postedAt),
      requestId: asString(transaction.requestId),
      status: asString(transaction.status),
      trackingNumber: asString(transaction.trackingNumber),
    };
  });

  return {
    items,
    page: pickPage(body),
  };
};

export const normalizeCustomer = (payload: unknown) => {
  const customer = asMercuryRecord(payload);
  const address = asMercuryRecord(customer?.address);

  return {
    address: address
      ? {
          address1: asString(address.address1),
          address2: asString(address.address2),
          city: asString(address.city),
          country: asString(address.country),
          name: asString(address.name),
          postalCode: asString(address.postalCode),
          region: asString(address.region),
        }
      : null,
    deletedAt: asString(customer?.deletedAt),
    email: asString(customer?.email),
    id: asString(customer?.id),
    name: asString(customer?.name),
  };
};

const normalizeLineItems = (lineItems: unknown) =>
  asArray(lineItems).map((item) => ({
    name: asString(item.name),
    quantity: asNumber(item.quantity),
    salesTaxRate: asNumber(item.salesTaxRate),
    unitPrice: asNumber(item.unitPrice),
  }));

const toInvoiceSummary = (invoice: MercuryRecord, customer?: unknown) => {
  const normalizedCustomer = customer ? normalizeCustomer(customer) : null;
  const lineItems = normalizeLineItems(invoice.lineItems);

  return {
    amount: asNumber(invoice.amount),
    canceledAt: asString(invoice.canceledAt),
    createdAt: asString(invoice.createdAt),
    customer: normalizedCustomer,
    customerId: asString(invoice.customerId),
    dueDate: asString(invoice.dueDate),
    id: asString(invoice.id),
    invoiceDate: asString(invoice.invoiceDate),
    invoiceNumber: asString(invoice.invoiceNumber),
    lineItemCount: lineItems.length,
    paymentMethods: {
      achDebitEnabled: asBoolean(invoice.achDebitEnabled),
      creditCardEnabled: asBoolean(invoice.creditCardEnabled),
      useRealAccountNumber: asBoolean(invoice.useRealAccountNumber),
    },
    slug: asString(invoice.slug),
    status: asString(invoice.status),
    updatedAt: asString(invoice.updatedAt),
  };
};

export const normalizeInvoicesResponse = (
  payload: unknown,
  customersById: Map<string, unknown>,
) => {
  const body = asMercuryRecord(payload);
  const items = asArray(body?.invoices).map((invoice) =>
    toInvoiceSummary(
      invoice,
      (() => {
        const customerId = asString(invoice.customerId);
        return customerId ? customersById.get(customerId) : null;
      })(),
    ),
  );

  return {
    items,
    page: pickPage(body),
  };
};

export const normalizeInvoiceDetail = (
  payload: unknown,
  customer: unknown,
  attachmentsPayload: unknown,
) => {
  const invoice = asMercuryRecord(payload);
  const attachmentsBody = asMercuryRecord(attachmentsPayload);

  return {
    ...toInvoiceSummary(invoice ?? {}, customer),
    attachments: asArray(attachmentsBody?.attachments).map((attachment) => ({
      fileName: asString(attachment.fileName),
      id: asString(attachment.id),
      url: asString(attachment.url),
    })),
    destinationAccountId: asString(invoice?.destinationAccountId),
    internalNote: asString(invoice?.internalNote),
    lineItems: normalizeLineItems(invoice?.lineItems),
    payerMemo: asString(invoice?.payerMemo),
    poNumber: asString(invoice?.poNumber),
  };
};
