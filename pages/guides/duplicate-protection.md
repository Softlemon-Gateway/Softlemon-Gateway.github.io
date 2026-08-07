# Duplicate Payment Protection

This document explains how the gateway prevents the same payment from being charged twice. Part 1 is written for non-technical readers (operations, finance, merchant support). Part 2 covers the technical contract for developers.

---

## Part 1: How duplicate payments are blocked (plain English)

### The rule

Every payment request a merchant sends can carry a `reference`, the merchant's own id for that payment. The gateway enforces one simple rule:

> **Only one active payment can exist per reference.** If a second request arrives with a reference that already has a pending or successful payment, the gateway rejects it, records the attempt for the paper trail and never forwards it to the card network.

The customer's card cannot be charged twice for the same payment no matter how many times the request is repeated, whether by a network retry, a double-click, a browser refetch or a bug in the merchant's system.

### Why this exists

Payment requests are often re-sent unintentionally. Return pages get reloaded, buttons get double-clicked and networks retry timed-out calls. Without this protection each repeat could reach the card network and charge the customer again. The reference guard makes that impossible.

### What the merchant's system sees

When a duplicate is rejected, the merchant receives an HTTP `409 Conflict` response:

```json
{
    "success": false,
    "message": "A transaction with this reference already exists",
    "code": "ERR_DUPLICATE",
    "data": {
        "transaction_id": 123
    }
}
```

`transaction_id` is the id of the **original** payment. The correct merchant behaviour is to treat this as confirmation that the payment already went through. Look up the original transaction and use it. Retrying the same reference will keep returning 409.

If the duplicate arrives while the first request is still being processed (a sub-second double-fire), the message is "A transaction with this reference is already being processed". Same code and same meaning, but without a transaction id because the original may not be saved yet.

### What operations and finance see

Every rejected duplicate is **recorded** as a transaction with status **cancelled**, reason **duplicate**, the same reference as the original payment and a `related_trans_id` link pointing at the original transaction.

These rows are visible in the dashboard and the CSV export, so there is a complete paper trail of every duplicate attempt. Because they never reached the acquirer, they must be **excluded from settlement reconciliation**. Filter them out by the duplicate reason.

### When a reference can be used again

- **After a decline or cancellation.** If a payment attempt fails (for example the bank declines) or is cancelled, the reference is released and the merchant may retry it. This is deliberate because a declined payment should be retryable.
- **Never while an attempt is pending or after a success.** Those hold the reference.
- **A new payment always needs a new reference.** Charging the same customer again is a new payment, not a retry.

One more normal-looking case: captures, refunds and voids share the reference of the payment they act on. Seeing several rows with the same reference where the extra rows are refunds or captures is correct and expected.

---

## Part 2: The technical contract

### Data model

The `reference` request field is stored as the transaction's `merchant_trans_id`. Uniqueness is enforced by a partial unique index:

```sql
CREATE UNIQUE INDEX transactions_merchant_ref_unique
ON transactions (merchant_id, merchant_trans_id)
WHERE transaction_type IN ('sale', 'auth')
  AND merchant_trans_id IS NOT NULL
  AND status NOT IN ('failed', 'cancelled')
```

The index is partial for two reasons:

1. **Retryability**: `failed` and `cancelled` rows do not hold the reference, so a declined or blocked payment can be retried with the same reference.
2. **Related operations**: capture, refund and void rows copy the parent's reference. Excluding those types lets them coexist with the parent.

The index is scoped per merchant. Different merchants can use the same reference value independently.

### Three layers of protection

The gateway applies three checks, in request order:

1. **An in-flight lock.** A short-lived lock per merchant and reference rejects concurrent requests with 409 immediately. This stops sub-second double-fires before any database work happens.
2. **A pre-insert lookup.** If an active transaction already holds the reference, the request is rejected with 409 and the existing transaction's id is returned in `data.transaction_id`.
3. **The unique index itself.** If two requests race past the first two layers, the database rejects the second insert and the API returns the same 409. The database guarantees correctness regardless of application-level races.

The acquirer call happens only after all three layers pass. A rejected duplicate can never produce an outbound payment request.

### The paper trail

Every rejection persists a record of the attempt: a transaction row with status `cancelled`, a `status_reason` of `duplicate`, the original reference and `related_trans_id` pointing at the original transaction (null when the original is not saved yet). Recorded attempts sit outside the unique index predicate, so they can never block a legitimate retry.

The `status_reason` field explains why a row was cancelled without reaching the acquirer:

| `status_reason` | Meaning |
|---|---|
| `duplicate` | Rejected duplicate attempt (this document) |
| `risk_rejected` | Blocked by a transaction rule (`ERR_RISK_REJECTED`) |
| `do_not_retry` | Blocked by the decline cooldown (`ERR_DO_NOT_RETRY`) |

### Not to be confused with the decline cooldown

A separate risk control blocks retrying a **declined** card with the same amount, currency and card for one hour. Those requests fail with `ERR_DO_NOT_RETRY` and HTTP 400. That is a control on retries of failures. The reference guard described in this document is the duplicate protection.
