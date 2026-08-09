# API Conventions

The rules on this page apply to every SoftLemon API endpoint.

## Base URL and versioning

All endpoints live under the `/api/v1` prefix on the environment base URL, for example `https://api.sandbox.softlemons.com/api/v1/transactions`. The version is part of the path. Breaking changes will only ship under a new version prefix.

TODO-FACT: formal versioning and deprecation policy.

## Requests

Send request bodies as JSON with a `Content-Type: application/json` header. Authenticate every request with `Authorization: Bearer {YOUR_API_KEY}`. See [environments](/api-basics/environments) for keys and base URLs.

## Response envelope

Every response, success or error, uses the same envelope:

| Field | Type | Meaning |
|---|---|---|
| `success` | boolean | Whether the request succeeded. |
| `message` | string | Human-readable summary. Wording can change, do not match on it. |
| `code` | string | Empty string on success. A stable error code on failure, see [error handling](/api-basics/errors). |
| `data` | object or null | The response payload. |

```json
{
  "success": true,
  "message": "Transaction initiated",
  "code": "",
  "data": {
    "transaction": {
      "id": 12345,
      "amount": 1250,
      "currency": "EUR",
      "status": "auth"
    }
  }
}
```

Validation errors add an `errors` object listing each offending field. See [error handling](/api-basics/errors) for the shape.

## Amounts

Requests take amounts in major units as decimal numbers, so `12.50` means EUR 12.50. Responses and webhook payloads return amounts in minor units, so the same value comes back as `1250`. Responses also include `amount_formatted` with a human-readable rendering.

## Currencies

Currencies are three-letter uppercase ISO 4217 codes such as `EUR`. Each request validates the currency against the platform's supported set and an unsupported code fails with HTTP 422. Which currencies your account can process depends on your acquirer setup, so confirm your currency list with SoftLemon before going live.

## Timestamps

Timestamps such as `created_at` and `updated_at` are ISO 8601 strings in UTC, for example `2026-08-07T12:34:56.000000Z`.

## Pagination

List endpoints paginate with a `page` query parameter and return a `pagination` object alongside the items:

```json
{
  "pagination": {
    "current_page": 1,
    "last_page": 4,
    "per_page": 25,
    "total": 87
  }
}
```

`per_page` defaults to 25 and is capped at 100.

## Idempotency and duplicate protection

Two mechanisms keep a network retry from moving money twice. The `reference` field guards the payment when you create it. The `Idempotency-Key` header guards the request when you manage it afterwards.

`POST /api/v1/transactions` accepts a `reference` field holding your own unique id for the payment. Reusing a reference while a previous attempt is active returns HTTP 409 with code `ERR_DUPLICATE` instead of charging twice. Always send a reference. See the [duplicate protection guide](/guides/duplicate-protection).

Capture, refund and void accept an optional `Idempotency-Key` header holding a unique string of up to 255 characters. A UUID works well. The contract:

- Repeating the request with the same key and an identical body within 24 hours returns the stored original response instead of executing again. Replayed responses carry an `Idempotency-Replayed: true` header and reflect the state at first execution.
- Replay covers declines too. A capture that failed with HTTP 400 replays that 400, so retrying a declined request needs a new key.
- Reusing a key with a different body returns HTTP 409 with code `ERR_IDEMPOTENCY_CONFLICT`. Generate a fresh key for every new request.
- While the original request is still running, a repeat returns HTTP 409 with code `ERR_IDEMPOTENT_REQUEST_IN_PROGRESS`. Wait a moment and send it again with the same key.
- Requests that fail validation or authorization do not consume the key, so a corrected retry with the same key executes normally.

Without the header these endpoints behave as before, every POST executes. Keys expire after 24 hours and are scoped to your API key.

## Changes

Notable API and documentation changes are recorded in the [changelog](/api-basics/changelog).
