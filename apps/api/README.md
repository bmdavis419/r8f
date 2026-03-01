# r8f API

Read-only Hono backend for Mercury account balances, credit balances,
transaction history, and invoice data across multiple Mercury profiles.

## Setup

```bash
cd /Users/davis/Developer/highmatter/experiments/r8f/apps/api
cp .env.example .env
```

Set:

```bash
MERCURY_PROFILE_IDS=personal,business
MERCURY_PROFILE_PERSONAL_TOKEN=your_personal_read_only_token
MERCURY_PROFILE_BUSINESS_TOKEN=your_business_read_only_token
```

Optional:

```bash
MERCURY_PROFILE_PERSONAL_LABEL=Personal
MERCURY_PROFILE_BUSINESS_LABEL=Business
MERCURY_PROFILE_PERSONAL_USE_SANDBOX=false
MERCURY_PROFILE_BUSINESS_USE_SANDBOX=false
MERCURY_PROFILE_PERSONAL_API_BASE_URL=https://api.mercury.com/api/v1
MERCURY_PROFILE_BUSINESS_API_BASE_URL=https://api.mercury.com/api/v1
MERCURY_REQUEST_TIMEOUT_MS=10000
PORT=3000
```

Legacy single-profile fallback still works:

```bash
MERCURY_API_TOKEN=your_read_only_token
```

Run from the repo root:

```bash
cd /Users/davis/Developer/highmatter/experiments/r8f
bun run dev
```

## Backend contract

### `GET /api/mercury/profiles`

Returns configured Mercury profiles.

Query params:

- `profile`
- `check=true` probes organization, accounts, credit, and invoices per selected profile

### `GET /api/mercury/health`

Shows whether Mercury is configured locally.

Query params:

- `profile`
- `check=true` performs live Mercury requests per selected profile

### `GET /api/mercury/overview`

Returns:

- profile-aware organization info
- normalized depository accounts
- normalized credit accounts when supported
- aggregated totals across selected profiles

### `GET /api/mercury/transactions`

Returns a normalized transaction feed merged across selected profiles.

Supported query params:

- `profile`
- `accountId`
- `limit`
- `order`
- `start_after`
- `end_before`
- `start`
- `end`
- `status`
- `categories`
- `search`

Notes:

- `search` is only forwarded when `accountId` is set because Mercury documents
  search terms on the account-specific transactions endpoint.

### `GET /api/mercury/invoices`

Returns a normalized invoice list plus customer enrichment when enabled.

Supported query params:

- `profile`
- `limit`
- `order`
- `start_after`
- `end_before`
- `status`
- `includeCustomer`

Notes:

- `status` is filtered locally after the Mercury response.
- Invoice support is reported per profile so unsupported profiles do not fail the whole response.

### `GET /api/mercury/invoices/:invoiceId`

Returns:

- invoice detail
- enriched customer
- current attachment URLs when available

Notes:

- If multiple profiles are configured, pass `?profile=business` or another profile ID.

## Curl checks

```bash
curl http://localhost:3000/api/mercury/health
curl "http://localhost:3000/api/mercury/health?check=true"
curl "http://localhost:3000/api/mercury/profiles?check=true"
curl http://localhost:3000/api/mercury/overview
curl "http://localhost:3000/api/mercury/overview?profile=personal"
curl "http://localhost:3000/api/mercury/overview?profile=business"
curl "http://localhost:3000/api/mercury/transactions?limit=25&order=desc"
curl "http://localhost:3000/api/mercury/transactions?profile=personal&limit=25&order=desc"
curl "http://localhost:3000/api/mercury/transactions?accountId=YOUR_ACCOUNT_ID&limit=25&search=coffee"
curl "http://localhost:3000/api/mercury/invoices?profile=business&limit=25&order=desc"
curl "http://localhost:3000/api/mercury/invoices/YOUR_INVOICE_ID?profile=business"
```

## Notes

- Mercury read-only tokens do not require IP whitelisting.
- Sandbox tokens must use the sandbox base URL.
- Invoice endpoints may return `403` if your Mercury organization does not have
  Accounts Receivable access.
- Personal-style profiles can support accounts and transactions while not supporting
  `credit` or invoices.
