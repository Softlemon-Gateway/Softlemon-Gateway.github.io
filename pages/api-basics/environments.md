# Environments

SoftLemon provides a sandbox for development and testing and a production environment for live traffic.

| Environment | Base URL | Purpose |
|---|---|---|
| Sandbox | `https://api.sandbox.softlemons.com` | Integration development and testing. No real money moves. |
| Production | Provided by the SoftLemon team together with your production keys. | Live traffic. |

Both environments expose the same API surface. All examples in this documentation run against the sandbox.

## API keys

Keys are environment specific. A sandbox key never works in production and a production key never works in the sandbox.

Accounts and API keys are provisioned by the SoftLemon team. There is no self-service signup. To get sandbox access or to request production keys, contact [support](/api-basics/support).

Send your key on every request:

```bash
curl https://api.sandbox.softlemons.com/api/v1/key-info \
  --header 'Authorization: Bearer {YOUR_API_KEY}'
```

Two endpoints help you verify a key:

- `POST /validate-key` checks whether a key is valid without authenticating a full request.
- `GET /api/v1/key-info` returns the key's metadata, including the entity it belongs to and its permissions.

A missing or invalid key returns HTTP 401 with code `ERR_AUTH_FAILED`. A valid key on a deactivated account returns HTTP 403 with the same code. See [error handling](/api-basics/errors).

## Sandbox testing

Use the 3D Secure test cards listed in the [Merchant API reference](/merchant) to exercise frictionless, challenge and failure outcomes. Webhook deliveries, duplicate protection and rate limits all behave the same as production.

## Go-live checklist

Before switching live traffic on:

1. Swap the base URL to production and replace sandbox keys with production keys. Never hardcode keys, load them from configuration.
2. Confirm your webhook endpoint is reachable from the internet over HTTPS and your stored signing secret is the production one. See the [webhooks guide](/guides/webhooks).
3. Verify your error handling matches on `code` values, not on `message` text or HTTP status alone.
4. Confirm your duplicate protection strategy sends a unique `reference` per payment attempt. See the [duplicate protection guide](/guides/duplicate-protection).
5. Review the [rate limits](/api-basics/rate-limits) against your expected peak volume.
6. Run one low-value live transaction end to end, including capture and refund, before opening real traffic.

Production onboarding, including any compliance checks required before go-live, is walked through with the SoftLemon team. Contact [support](/api-basics/support) to start it.
