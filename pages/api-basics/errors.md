# Error Handling

Every SoftLemon API error uses the same response envelope and carries a stable machine-readable `code`. Build your integration on `code`. The `message` field is human-readable and its wording can change without notice.

```json
{
  "success": false,
  "message": "A transaction with this reference already exists",
  "code": "ERR_DUPLICATE",
  "data": {
    "transaction_id": 12345
  }
}
```

Validation failures also include an `errors` object with per-field messages:

```json
{
  "success": false,
  "message": "Validation errors",
  "code": "ERR_VALIDATION_FAILED",
  "data": null,
  "errors": {
    "amount": ["The transaction amount is required."]
  }
}
```

## HTTP status codes

| Status | When |
|---|---|
| `400` | The request was understood but rejected. Card declines, gateway failures, invalid tokens and blocked retries all use 400. |
| `401` | The API key is missing or not recognised. |
| `403` | The API key is valid but not allowed to do this. Inactive accounts and partner-only endpoints respond with 403. |
| `404` | The resource does not exist or is not visible to your key. |
| `409` | An active transaction already uses this `reference` or an `Idempotency-Key` collided with an earlier request. See the [duplicate protection guide](/guides/duplicate-protection) and [conventions](/api-basics/conventions). |
| `422` | Request validation failed. The `errors` object lists each offending field. |
| `429` | Rate limit exceeded. See [rate limits](/api-basics/rate-limits). |
| `500` | Unexpected server error. Safe to retry with backoff. |

## Request and platform errors

| Code | HTTP status | Meaning | How to handle |
|---|---|---|---|
| `ERR_VALIDATION_FAILED` | 422 | The request body failed validation. | Fix the fields listed in `errors` and resend. |
| `ERR_AUTH_FAILED` | 401 or 403 | 401 when the API key is missing or invalid. 403 when the account is not active or the key is not allowed to use the endpoint. Initiate returns 400 with this code when a partner key sends a `merchant_id` that cannot be resolved. | Check the `Authorization: Bearer` header and the key itself. Contact support if your account was deactivated. |
| `ERR_AUTH_REQUIRED` | 401 | The endpoint requires an authenticated user session. | Applies to dashboard endpoints, not API key integrations. Sign in and retry. |
| `ERR_NO_PERMISSION` | 403 | The authenticated account lacks permission for this operation. | Ask your SoftLemon admin to grant the required permission. |
| `ERR_NOT_FOUND` | 404 | The resource does not exist or your key cannot see it. Partner keys only see merchants linked to them. | Check the id. For partner keys confirm the merchant link with SoftLemon. |
| `ERR_RATE_LIMITED` | 429 | Your key exceeded its request limit. | Wait for the number of seconds in the `Retry-After` header, then retry. See [rate limits](/api-basics/rate-limits). |
| `ERR_DUPLICATE` | 409 | An active transaction already uses this `reference`. | Treat as confirmation the original request went through. Look up `data.transaction_id`. See the [duplicate protection guide](/guides/duplicate-protection). |
| `ERR_IDEMPOTENCY_CONFLICT` | 409 | The `Idempotency-Key` was already used with a different request. | Do not resubmit as is. Generate a fresh key for each new request and reuse a key only for exact retries. See [conventions](/api-basics/conventions). |
| `ERR_IDEMPOTENT_REQUEST_IN_PROGRESS` | 409 | The original request with this `Idempotency-Key` is still processing. | Wait a moment and retry with the same key. The retry returns the stored response once the original finishes. |
| `ERR_RISK_REJECTED` | 400 | Risk rules blocked the transaction. It was cancelled and the reference released. | The reference can be reused. Review the rejection with SoftLemon support if it looks wrong. |
| `ERR_DO_NOT_RETRY` | 400 | A previous decline marked these payment details as not retryable. | Do not resubmit the same details. Ask the customer for a different payment method. |
| `ERR_UNEXPECTED` | 500 | An unexpected server error occurred. | Retry with exponential backoff. Contact support if it persists. |

## Card and gateway declines

All decline codes are returned with HTTP 400 from the transaction endpoints. The transaction did not succeed and no funds moved.

| Code | Meaning | How to handle |
|---|---|---|
| `ERR_TXN_FAILED` | The transaction failed at the acquirer without a more specific reason. | Inspect `message` for detail. Offer the customer another payment attempt. |
| `ERR_GATEWAY_ERROR` | Unexpected gateway error upstream. | Usually transient. Retry after a short wait. |
| `ERR_ADAPTER_EXCEPTION` | The payment provider integration raised an unexpected error. | Retry once. Contact support if it repeats. |
| `ERR_ADAPTER_INVALID_AMOUNT` | The amount was rejected as invalid. | Check the amount is positive, within your limits and correctly formatted in major units. |
| `ERR_INVALID_CURRENCY` | The currency was rejected for this transaction. | Check the currency is enabled for your account. |
| `ERR_INVALID_ACCOUNT_NUMBER` | The card number is invalid. | Ask the customer to re-enter the card number. |
| `ERR_INVALID_CARD_TOKEN` | The card token or vault token is not recognised. | Obtain a fresh token or collect full card details again. |
| `ERR_INVALID_TRANSACTION` | The issuer considers the transaction invalid. | Ask the customer to contact their bank or use another card. |
| `ERR_EXPIRED_CARD` | The card is expired. | Ask the customer for a different card. |
| `ERR_CARD_EXPIRATION_INVALID` | The expiry date is invalid. | Ask the customer to re-enter the expiry date. |
| `ERR_CARD_NO_ACCOUNT` | No account exists behind this card. | Ask the customer for a different card. |
| `ERR_CARD_DO_NOT_HONOR` | The issuer declined without a reason (do not honor). | Ask the customer to contact their bank or use another card. |
| `ERR_CARD_INSUFFICIENT_FUNDS` | Insufficient funds on the card. | Ask the customer to use another card or add funds. |
| `ERR_CARD_LIMIT_EXCEEDED` | The transaction exceeds the card limit. | Suggest a smaller amount or another card. |
| `ERR_CARD_FRAUD_SUSPECTED` | Declined for suspected fraud. | Do not retry. The customer should contact their bank. |
| `ERR_CARD_LOST_OR_STOLEN` | The card is reported lost or stolen. | Do not retry. The customer should contact their bank. |
| `ERR_NOT_PERMITTED_CARDHOLDER` | The transaction is not permitted for this cardholder. | Ask the customer to contact their bank or use another card. |
| `ERR_CARD_SECURITY_VIOLATION` | The issuer flagged a security violation. | Ask the customer to contact their bank. |
| `ERR_CARD_ISSUER_UNAVAILABLE` | The card issuer is temporarily unavailable. | Retry after several seconds. Spacing retries prevents load on the card network. |
| `ERR_CARD_SYSTEM_ERROR` | Card provider system error. | Usually transient. Retry after a short wait. |
| `ERR_PAYMENT_METHOD_NOT_ENABLED` | The payment method is not enabled for this merchant. | Contact SoftLemon to enable the method on your account. |
| `ERR_REFUND_NOT_SUPPORTED` | Refunds are not supported for this payment method. | Settle with the customer through another channel. |
| `ERR_WALLET_NOT_SUPPORTED` | Digital wallet payments are not supported for this payment processor. | Offer a card payment instead. |

The invalid amount code is returned on the wire as `ERR_ADAPTER_INVALID_AMOUNT`. Some older material refers to it as `ERR_INVALID_AMOUNT`. Always match on the wire value.

## 3D Secure errors

All returned with HTTP 400. See the [accept a payment guide](/guides/accept-a-payment) for the full 3D Secure flow.

| Code | Meaning | How to handle |
|---|---|---|
| `ERR_3DS_REQUIRED` | The transaction requires 3D Secure authentication first. | Run `POST /api/v1/3ds/verify` before creating the payment. |
| `ERR_3DS_FAILED` | 3D Secure authentication failed. | Let the customer try again. |
| `ERR_3DS_NOT_ENROLLED` | The card is not enrolled in 3D Secure. | Ask the customer for a different card. |
| `ERR_3DS_TIMEOUT` | The customer did not complete authentication in time. | Start a new verification and let the customer try again. |
| `ERR_3DS_NOT_SUPPORTED` | 3D Secure is not supported for this transaction. | Ask the customer for a different card. |
| `ERR_3DS_TECHNICAL_ERROR` | A technical error occurred during authentication. | Usually transient. Start a new verification. |
