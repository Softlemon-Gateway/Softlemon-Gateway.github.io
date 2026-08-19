# Changelog

Notable changes to the SoftLemon API and this documentation, newest first.

## 2026-08-19

- `POST /api/v1/payment-sessions` accepts an optional `customer.ip_address` (the customer's IP as seen by your server). It is forwarded to the provider as the customer's device IP; without it the provider sees the IP of the server calling the API. Card payments already accepted `customer.ip_address` and now forward it to the provider as well when `browser_data.ip_address` is absent. See [availability](/guides/accept-an-alternative-payment#availability).
- Payment sessions now check the method's country availability on `customer.country_code` before the provider is called and refuse unserved countries with the new `ERR_PAYMENT_METHOD_NOT_AVAILABLE_IN_COUNTRY` code. A provider that declines to open a checkout is reported as the new `ERR_PROVIDER_REJECTED` (HTTP 400, provider reason in `message`) instead of a generic `ERR_GATEWAY_ERROR` (502). Both codes are in the [error catalogue](/api-basics/errors).
- `POST /api/v1/3ds/verify` identifies a verification by `public_id` (`tds_...`). Store that value and send it as `card_verification_data.id`; the `card_verification_id` on the post-challenge redirect is the same `tds_...` string. The numeric `id` in the response is **deprecated** and will be removed on a date announced here; numeric ids stay accepted on input. See [Initiate Card Verification](/merchant/card-verification#initiate-card-verification).
- Published the [versioning and deprecation policy](/api-basics/conventions#deprecation): the API is additive within a version, clients must ignore unknown fields and treat ids as opaque strings, and removals follow a mark, announce, notice period, remove sequence.
- Guides now use the `tds_...` public id in every 3DS example.

## 2026-08-09

- Added `Idempotency-Key` support on capture, refund and void for safe retries. See [conventions](/api-basics/conventions).
- Added the `ERR_IDEMPOTENCY_CONFLICT` and `ERR_IDEMPOTENT_REQUEST_IN_PROGRESS` error codes to the [error catalogue](/api-basics/errors).
- Rate limit responses now include a `Retry-After` header and every response includes `X-RateLimit-Remaining`. See [rate limits](/api-basics/rate-limits).

## 2026-08-07

- Relaunched the documentation site with searchable references for both the Merchant and Partner APIs.
- Added the API basics section covering [conventions](/api-basics/conventions), [environments](/api-basics/environments), [error handling](/api-basics/errors), [rate limits](/api-basics/rate-limits), [SCA and PSD2](/api-basics/sca-and-psd2) and [support](/api-basics/support).
- Documented previously missing error responses in the API references.
