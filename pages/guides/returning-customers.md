# Charge a Returning Customer

After a customer's first successful card payment, the gateway stores the card as a reusable payment instrument in its vault. Later payments can then reference the stored card with a vault token instead of collecting the full card details again. The customer only re-enters the CVV.

## Step 1: Take the first payment normally

Process the first payment with full card details, exactly as described in [Accept a card payment](/guides/accept-a-payment). When the payment succeeds, the gateway stores the instrument and associates a vault token with it.

## Step 2: Charge the stored card

For a later payment, call `POST /api/v1/transactions` with `vault_token` in place of the card number and expiry. Only the CVV is still needed:

```bash
curl https://api.sandbox.softlemons.com/api/v1/transactions \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer {YOUR_API_KEY}' \
  --data '{
    "transaction_type": "sale",
    "amount": 24.00,
    "currency": "EUR",
    "reference": "ORDER-912401",
    "vault_token": "8ac7a4a29852f6f101985300a1b41c2f",
    "card": { "cvv": "123" }
  }'
```

Notes on the request:

- `vault_token` and full card details are alternatives. When the token is present, `card.number`, `card.exp_month` and `card.exp_year` are not required.
- `vault_token` is mutually exclusive with wallet payments.
- Use a fresh `reference` for every new payment. Charging the same customer again is a new payment, not a retry. See the [duplicate protection guide](/guides/duplicate-protection).

The response, statuses and webhook events are identical to a normal card payment. The same capture, void and refund flows apply afterwards.

## Where the vault token comes from

The vault token is created by the gateway when the first card payment succeeds. It is not currently returned in API responses, so coordinate with your SoftLemon admin team on how tokens are supplied to your system. Treat tokens as sensitive values: store them server-side and never expose them in browsers or logs.

## 3D Secure on repeat payments

Whether a repeat payment needs a fresh 3DS verification depends on your acquirer's rules for merchant-initiated and recurring payments. When it is required, run the same `POST /api/v1/3ds/verify` step as a first payment and pass `card_verification_data.id` on the transaction.
