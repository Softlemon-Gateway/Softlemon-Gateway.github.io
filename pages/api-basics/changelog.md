# Changelog

Notable changes to the SoftLemon API and this documentation, newest first.

## 2026-08-09

- Added `Idempotency-Key` support on capture, refund and void for safe retries. See [conventions](/api-basics/conventions).
- Added the `ERR_IDEMPOTENCY_CONFLICT` and `ERR_IDEMPOTENT_REQUEST_IN_PROGRESS` error codes to the [error catalogue](/api-basics/errors).
- Rate limit responses now include a `Retry-After` header and every response includes `X-RateLimit-Remaining`. See [rate limits](/api-basics/rate-limits).

## 2026-08-07

- Relaunched the documentation site with searchable references for both the Merchant and Partner APIs.
- Added the API basics section covering [conventions](/api-basics/conventions), [environments](/api-basics/environments), [error handling](/api-basics/errors), [rate limits](/api-basics/rate-limits), [SCA and PSD2](/api-basics/sca-and-psd2) and [support](/api-basics/support).
- Documented previously missing error responses in the API references.
