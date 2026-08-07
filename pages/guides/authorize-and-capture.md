# Authorize Now, Capture Later

Use this flow when you want to reserve funds at order time and take the money later, for example when goods ship or a booking is confirmed. It has two halves: an authorization that places a hold and a capture that settles it. If you never capture, you void the hold instead.

This guide assumes you have read [Accept a card payment](/guides/accept-a-payment). 3D Secure works exactly the same here, so verify the cardholder first and pass `card_verification_data.id` on the authorization.

## Step 1: Place the hold

Call `POST /api/v1/transactions` with `transaction_type: "auth"` instead of `sale`:

```bash
curl https://api.sandbox.softlemons.com/api/v1/transactions \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer {YOUR_API_KEY}' \
  --data '{
    "transaction_type": "auth",
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
    "status": "auth",
    "transaction_type": "auth",
    "merchant_trans_id": "ORDER-912346",
    "acquirer_trans_id": "514009741995",
    "acquirer_auth_code": "400066",
    "created_at": "2025-05-20T09:18:47.000000Z"
  }
}
```

The funds are reserved on the customer's card and the transaction reports status `auth`. Your webhook endpoint receives `transaction.authorized`. Nothing has been charged yet.

## Step 2: Capture when you are ready to settle

Call `POST /api/v1/transactions/{transaction_id}/capture` with the authorization's id (`2` above). Omit `amount` to capture the full authorized amount:

```bash
curl https://api.sandbox.softlemons.com/api/v1/transactions/2/capture \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer {YOUR_API_KEY}' \
  --data '{}'
```

```json
{
  "success": true,
  "message": "Transaction captured",
  "code": "",
  "data": {
    "id": 3,
    "related_trans_id": 2,
    "merchant_id": 1,
    "amount": 1250,
    "currency": "EUR",
    "status": "captured",
    "transaction_type": "capture",
    "merchant_trans_id": "ORDER-912346",
    "created_at": "2025-05-20T09:18:47.000000Z"
  }
}
```

Two things to notice:

- The capture is its own transaction row (`id: 3`) linked to the parent authorization by `related_trans_id: 2`. It shares the parent's `merchant_trans_id`, so use `id` when you need a unique identifier.
- Your webhook endpoint receives `transaction.captured`. On a full capture the parent authorization rolls up to `settled` territory and emits its own event. The [webhooks guide](/guides/webhooks) explains the parent and child event pairing.

## Step 3: Partial captures

Pass an `amount` in major units to capture part of the hold:

```bash
curl https://api.sandbox.softlemons.com/api/v1/transactions/2/capture \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer {YOUR_API_KEY}' \
  --data '{ "amount": 5.00 }'
```

The capture child row is created for `500` minor units and the parent authorization reports `partially_settled` with a `transaction.partially_settled` event. A capture may not exceed the authorized amount.

## Step 4: Void what you no longer need

If the order is cancelled before capture, release the hold with `POST /api/v1/transactions/{transaction_id}/void`. Omit `amount` for a full void:

```bash
curl https://api.sandbox.softlemons.com/api/v1/transactions/2/void \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer {YOUR_API_KEY}' \
  --data '{}'
```

The response is a `void` child row and your webhook endpoint receives `transaction.voided`. The customer's funds are released without a charge. Voiding the remainder after a partial capture closes the parent authorization.

## Checking where things stand

`GET /api/v1/transactions/{transaction_id}/status` on the parent authorization returns its current roll-up, including `captured_amount`. The [transaction statuses guide](/guides/transaction-statuses) lists every state this flow can produce.
