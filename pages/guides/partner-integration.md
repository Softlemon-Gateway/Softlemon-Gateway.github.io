# Integrate as a Partner

Partner API keys manage a portfolio of linked merchants: they can review each merchant's activity and process payments on a merchant's behalf. This guide walks through both, from confirming your key's scope to acting for a merchant.

All requests use your partner API key as `Authorization: Bearer {YOUR_API_KEY}` against `https://api.sandbox.softlemons.com`.

## Step 1: Confirm what your key can do

Start with `GET /api/v1/key-info` to confirm you are holding a partner key and which partner it belongs to:

```bash
curl https://api.sandbox.softlemons.com/api/v1/key-info \
  --header 'Authorization: Bearer {YOUR_API_KEY}'
```

```json
{
  "success": true,
  "message": "API key information retrieved successfully",
  "code": "",
  "data": {
    "key_identifier": "sl_20250411105714_TTwbAVtw",
    "name": "Partner production key",
    "status": "active",
    "entity_type": "partner",
    "entity_id": 7,
    "entity_name": "Acme Payments Partner"
  }
}
```

`entity_type: partner` confirms the key's audience. A merchant key would say `merchant` and cannot call the partner endpoints below.

## Step 2: List your linked merchants

`GET /api/v1/merchants` returns every merchant linked to your partner account, including the acquirer, transaction stats and the partnership status:

```bash
curl https://api.sandbox.softlemons.com/api/v1/merchants \
  --header 'Authorization: Bearer {YOUR_API_KEY}'
```

Each entry carries the merchant's `id`. That id is what you pass as `merchant_id` when acting on the merchant's behalf. For a single merchant's profile use `GET /api/v1/merchants/{merchant_id}`.

## Step 3: Review a merchant's transactions

`GET /api/v1/merchants/{merchant_id}/transactions` returns the merchant's transactions newest first, with `status`, `from`, `to` and `per_page` filters:

```bash
curl 'https://api.sandbox.softlemons.com/api/v1/merchants/1/transactions?status=success&per_page=25' \
  --header 'Authorization: Bearer {YOUR_API_KEY}'
```

The response contains a `transactions` array and a `pagination` object. Reconcile on the gateway `id` field because captures, refunds and voids share their parent's reference.

## Step 4: Process a payment for a merchant

Partner keys can call the Merchant API payment endpoints by adding `merchant_id` to the request body. The flow is the same as [Accept a card payment](/guides/accept-a-payment) with one extra field at each step.

3DS verification for the merchant:

```bash
curl https://api.sandbox.softlemons.com/api/v1/3ds/verify \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer {YOUR_API_KEY}' \
  --data '{
    "merchant_id": 1,
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

Then the sale, again with `merchant_id`:

```bash
curl https://api.sandbox.softlemons.com/api/v1/transactions \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer {YOUR_API_KEY}' \
  --data '{
    "merchant_id": 1,
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

The `merchant_id` must belong to a merchant linked to your partner account. Requests for unlinked merchants are rejected.

## Step 5: Manage the payment afterwards

Captures, refunds, voids and status checks work for partner keys under the same linked-merchant rules. Follow [Authorize now, capture later](/guides/authorize-and-capture) and [Refund a payment](/guides/refunds) using the transaction ids you created for the merchant.
