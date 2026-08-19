# SCA and PSD2

Strong Customer Authentication (SCA) is the European requirement that electronic payments are authenticated with at least two independent factors: something the customer knows, something they have or something they are. It was introduced by the second Payment Services Directive (PSD2) and has applied to online card payments in the European Economic Area since 2019, with an equivalent regime in the UK.

In practice SCA for card payments means 3D Secure. The issuing bank authenticates the cardholder, either silently using device and transaction data (frictionless) or by challenging them with their banking app or a one-time code.

## When SCA applies

SCA applies when the customer actively initiates a payment and both the card issuer and the acquirer are in the regulated area. Payments where either side is outside the area (one leg out) are technically out of scope, but issuers may still decline unauthenticated attempts.

## How SoftLemon handles SCA

SoftLemon runs a server-managed 3D Secure flow, so you never integrate an SDK or handle authentication data such as CAVV or ECI yourself:

1. Call `POST /api/v1/3ds/verify` with the card details and your return URL before creating the payment.
2. If the issuer answers without a challenge, the response comes back immediately with `auth_type: frictionless` and the outcome in `status`: `full_auth` (authenticated), `attempt` (attempt proof only), `unavailable` (card not enrolled or authentication not possible, no authentication data) or `failed`.
3. If the issuer requires a challenge, redirect the customer to the returned `challenge_url`. After they complete it, the customer returns to your `auth_url`.
4. Create the sale or authorization with `POST /api/v1/transactions`, passing the verification id. The gateway attaches the stored authentication data to the payment.

The [accept a payment guide](/guides/accept-a-payment) walks through this end to end with test cards for each outcome.

Card payments on SoftLemon must be authenticated before they are charged. A payment attempted without authentication where it is required is refused with HTTP 400 and code `ERR_3DS_REQUIRED`; the response carries the refused transaction (recorded as `failed`, `status_reason` `3ds_required`) and a `next_action` pointing at `POST /api/v1/3ds/verify`. The payment endpoint never starts a challenge itself. A payment that references a verification which ended in `failed`, or has not finished, is refused with HTTP 422; one that references an `unavailable` verification is processed without 3DS.

## Exemptions

PSD2 allows exemptions such as low-value payments, transaction risk analysis and trusted beneficiaries. Whether an exemption is applied is decided between the acquirer and the issuer. The issuer always has the final word and can demand a challenge even when an exemption was requested. Your integration should always be able to handle a challenge redirect.

## Stored cards and repeat payments

Payments the customer is not present for, such as repeat charges on a stored card, fall outside SCA when the initial storing of the card was authenticated. See the [returning customers guide](/guides/returning-customers) for charging stored payment details.

## Liability shift

When a payment is fully authenticated with 3D Secure, liability for fraudulent chargebacks generally shifts from you to the issuer. Authentication outcomes and the related error codes are listed in the [error handling](/api-basics/errors) reference.
