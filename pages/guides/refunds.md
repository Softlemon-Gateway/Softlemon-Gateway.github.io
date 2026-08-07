# Refund a Payment

This guide covers returning money to a customer after a successful payment: full refunds, partial refunds and how to track what has been returned so far.

You need the gateway transaction id of the payment you are refunding (the `data.id` returned when the payment was created, `2` in the examples below).

## Step 1: Refund the full amount

Call `POST /api/v1/transactions/{transaction_id}/refund` and omit `amount`:

```bash
curl https://api.sandbox.softlemons.com/api/v1/transactions/2/refund \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer {YOUR_API_KEY}' \
  --data '{}'
```

```json
{
  "success": true,
  "message": "Transaction refunded",
  "code": "",
  "data": {
    "id": 4,
    "related_trans_id": 2,
    "merchant_id": 1,
    "amount": 1250,
    "currency": "EUR",
    "status": "refunded",
    "transaction_type": "refund",
    "merchant_trans_id": "ORDER-912346",
    "created_at": "2025-05-20T09:18:47.000000Z"
  }
}
```

Like captures, each refund is its own transaction row linked to the parent by `related_trans_id` and sharing its `merchant_trans_id`. Your webhook endpoint receives `transaction.refunded` because the cumulative refunds now cover the captured amount.

## Step 2: Partial refunds

Pass an `amount` in major units to return part of the payment:

```bash
curl https://api.sandbox.softlemons.com/api/v1/transactions/2/refund \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer {YOUR_API_KEY}' \
  --data '{ "amount": 5.00 }'
```

Each partial refund creates a new child row and emits its own event. The event type depends on the running total:

- While part of the captured amount remains unrefunded, each refund emits `transaction.partially_refunded`.
- The refund that brings cumulative refunds up to the captured amount emits `transaction.refunded`.

A refund may not exceed the amount still unrefunded on the parent.

## Step 3: Track the totals

Poll the parent transaction when you need the authoritative running totals:

```bash
curl https://api.sandbox.softlemons.com/api/v1/transactions/2/status \
  --header 'Authorization: Bearer {YOUR_API_KEY}'
```

The parent's `refunded_amount` field reports the cumulative refunds in minor units. Webhook payloads for refund events carry the same information in `data.parent_transaction`, so most systems never need to poll. See the [webhooks guide](/guides/webhooks) for the payload shape.

## Good to know

- Amounts in refund requests are major units (`5.00`), while responses and webhooks report minor units (`500`).
- Refund rows sharing the parent's reference is expected and correct. It is not a duplicate. See the [duplicate protection guide](/guides/duplicate-protection).
- A fully refunded payment is terminal. Refunding a different payment for the same customer is a new operation on that payment's own transaction id.
