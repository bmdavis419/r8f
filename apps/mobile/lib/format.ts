const currencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 2,
  style: "currency",
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 1,
  notation: "compact",
  style: "currency",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
});

const shortDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
});

export const formatCurrency = (value: number | null | undefined) =>
  typeof value === "number" ? currencyFormatter.format(value) : "—";

export const formatCompactCurrency = (value: number | null | undefined) =>
  typeof value === "number" ? compactCurrencyFormatter.format(value) : "—";

export const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return "—";
  }

  return shortDateFormatter.format(new Date(value));
};

export const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return "—";
  }

  return shortDateTimeFormatter.format(new Date(value));
};

export const titleCase = (value: string | null | undefined) => {
  if (!value) {
    return "—";
  }

  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
};
