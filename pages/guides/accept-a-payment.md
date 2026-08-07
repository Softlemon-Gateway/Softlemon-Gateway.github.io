# Accept a Card Payment

This guide walks through taking a one-time card payment from start to finish: verify the cardholder with 3D Secure, create the sale and confirm the result. It is the recommended starting point for a new integration.

## Before you start

- You need an API key, provisioned by your SoftLemon admin team and sent on every request as `Authorization: Bearer {YOUR_API_KEY}`.
- All requests in this guide run against the sandbox at `https://api.sandbox.softlemons.com`.
- You need a return URL on your site for the 3D Secure redirect (the `auth_url` below).
- Amounts in requests are in major units, so `12.50` means EUR 12.50. Responses and webhooks report amounts in minor units, so the same value comes back as `1250`.
- Use the sandbox card numbers from the 3D Secure test cards section of the [Merchant API reference](/merchant) to exercise each outcome.

## Step 1: Verify the cardholder with 3D Secure

Start with `POST /api/v1/3ds/verify` because card payments must be authenticated before they are charged. SoftLemon runs a server-managed 3DS flow, so you never handle CAVV, ECI or DS Transaction IDs yourself. The gateway stores them and attaches them to the payment later.

```bash
curl https://api.sandbox.softlemons.com/api/v1/3ds/verify \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer {YOUR_API_KEY}' \
  --data '{
    "amount": 12.50,
    "currency": "EUR",
    "card": {
      "number": "4200000000000091",
      "exp_month": 12,
      "exp_year": 2030,
      "name": "John Doe",
      "cvv": "123"
    },
    "auth_url": "https://yoursite.com/checkout/3ds-complete"
  }'
```

With the test card `4200000000000091` the issuer does not require a challenge and the response returns immediately:

```json
{
  "success": true,
  "message": "3DS authentication completed (frictionless)",
  "code": "",
  "data": {
    "id": 166,
    "amount": 1250,
    "currency": "EUR",
    "version": "2.2.0",
    "eci": "05",
    "cavv": "AAABA0UREQAAAAAAAAAAAAAAAAA=",
    "status": "full_auth",
    "auth_type": "frictionless",
    "challenge_url": null
  }
}
```

`status: full_auth` means authentication succeeded. Keep `data.id` (166 here). You will pass it when creating the sale in Step 3.

## Step 2: Handle the challenge when the issuer requires one

Some cards trigger a bank challenge instead (test with `4200000000000042`). In that case the response carries a `challenge_url` and no final status yet:

1. Redirect the cardholder to `challenge_url`. The bank runs its own verification there (a code, an app approval or similar).
2. When the cardholder finishes, the gateway redirects them back to your `auth_url` with query parameters: `?card_verification_id={id}&status=full_auth` on success or `status=failed` on failure.
3. On `full_auth`, use the `card_verification_id` value exactly like the `id` from the frictionless case. On `failed`, show the customer a payment failure and let them try another card.

Your return page should handle both outcomes. Nothing has been charged at this point in either flow.

## Step 3: Create the sale

Now charge the card with `POST /api/v1/transactions`. Three fields matter beyond the card details:

- `transaction_type: "sale"` charges immediately with no separate capture step. (Use `auth` instead when you want to reserve funds first. See [Authorize now, capture later](/guides/authorize-and-capture).)
- `card_verification_data.id` links the 3DS verification from Step 1 or 2. The stored CAVV, ECI and DS Transaction ID are attached automatically.
- `reference` is your own id for this payment. The gateway allows only one active payment per reference, which protects your customer from double charges. See the [duplicate protection guide](/guides/duplicate-protection).

```bash
curl https://api.sandbox.softlemons.com/api/v1/transactions \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer {YOUR_API_KEY}' \
  --data '{
    "transaction_type": "sale",
    "amount": 12.50,
    "currency": "EUR",
    "reference": "ORDER-912346",
    "card": {
      "number": "4200000000000091",
      "exp_month": 12,
      "exp_year": 2030,
      "name": "John Doe",
      "cvv": "123"
    },
    "card_verification_data": { "id": 166 }
  }'
```

A successful response returns the transaction:

```json
{
  "success": true,
  "message": "Transaction initiated",
  "code": "",
  "data": {
    "id": 2,
    "related_trans_id": null,
    "merchant_id": 1,
    "amount": 1250,
    "currency": "EUR",
    "status": "success",
    "transaction_type": "sale",
    "merchant_trans_id": "ORDER-912346",
    "acquirer_trans_id": "514009741995",
    "acquirer_auth_code": "400066",
    "created_at": "2025-05-20T09:18:47.000000Z"
  }
}
```

Store `data.id`. It is the gateway transaction id you will use for refunds, voids and status checks. See the [transaction statuses guide](/guides/transaction-statuses) for what each `status` value means.

## Step 4: Confirm the result

Treat webhooks as your primary confirmation. When the sale completes, your registered endpoint receives a signed `transaction.succeeded` event within seconds. Verify the signature, acknowledge with a 2xx response and update your order. The [webhook integration guide](/guides/webhooks) covers registration, verification and retries.

For an on-demand answer (for example after downtime or during reconciliation), poll the status endpoint:

```bash
curl https://api.sandbox.softlemons.com/api/v1/transactions/2/status \
  --header 'Authorization: Bearer {YOUR_API_KEY}'
```

## Errors you should handle

| Response | Meaning | What to do |
|---|---|---|
| `401` | Missing or invalid API key. | Check the `Authorization` header. |
| `409` with `ERR_DUPLICATE` | The `reference` already has an active payment. `data.transaction_id` is the original. | Treat the payment as already made. Do not retry with the same reference. |
| `422` | Validation failed. The response lists the field errors. | Fix the request. Nothing was charged. |
| `400` with `ERR_DO_NOT_RETRY` | The same declined card was retried within the cooldown window. | Wait or ask the customer for another card. |
