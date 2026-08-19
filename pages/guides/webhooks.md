# Merchant Transaction Webhooks

This document explains the outbound webhooks the gateway sends to merchant systems when transactions change state. Part 1 is written for non-technical readers (operations, merchant support). Part 2 is the integration reference for the developers building a webhook receiver.

---

## Part 1: What webhooks do (plain English)

### The rule

Instead of polling the API for transaction status, the gateway pushes a signed notification to an HTTPS endpoint the merchant registers:

> **Every time a transaction reaches a meaningful state (authorized, captured, refunded, failed and so on) the gateway POSTs a signed JSON event to the merchant's endpoint. The merchant's system verifies the signature, acknowledges quickly with a 2xx response and processes the event.**

Delivery is **at-least-once**: if the endpoint is down, the gateway retries on a fixed schedule for about 51 minutes and events can be replayed manually for up to 30 days. The same event is therefore occasionally delivered more than once. Receivers must treat the event id as the unit of idempotency.

### What a merchant gets

- A notification within seconds of every transaction state change (sales succeeding, authorizations, captures, refunds, voids, failures, chargebacks).
- A cryptographic signature on every delivery, so the receiver can prove the event came from the gateway and was not tampered with.
- A delivery history with per-attempt detail and the ability to replay any event from the last 30 days.

### What a merchant has to build

1. An **HTTPS endpoint** on a public host that accepts POST requests.
2. **Signature verification** (a few lines of code, with working examples in Part 2).
3. A fast **2xx acknowledgement**. Accept the event first and process it afterwards.
4. **Idempotent processing**. The same event id may arrive more than once and must be applied only once.

### What happens when the endpoint is down

Each failed delivery is retried after 1, 5, 15 and 30 minutes (five attempts in total). If all five fail, the event is marked permanently failed. It is not lost: it stays visible in the delivery history and can be replayed once the endpoint is healthy again. Events older than 30 days are pruned and can no longer be replayed.

### Getting set up

A Softlemon administrator registers the merchant's endpoint URL. At creation (and on every rotation) the endpoint's signing secret is returned **exactly once**. It is stored encrypted and can never be read back afterwards, so it must be captured at that moment and stored securely on the merchant side.

An endpoint can be disabled (deliveries pause, the configuration and secret are kept) or deleted. Deleting stops deliveries immediately, fails any event still queued for it and erases the stored URL and secret; the delivery history stays readable, and a new endpoint can be registered afterwards with a fresh secret. The [set up webhooks guide](/guides/set-up-webhooks) walks through both.

---

## Part 2: Integration reference (technical)

### Event catalogue

The `type` field of every event (also sent as the `X-Softlemon-Event-Type` header) is one of:

| Event type | Fires when |
|---|---|
| `transaction.authorized` | An authorization is approved (status `auth`). Also emitted mid-flow when an acquirer auto-captures. See [Multiple events per operation](#multiple-events-per-operation). |
| `transaction.captured` | A transaction reaches `captured`. Fires on the capture child row and, on a full capture, on the parent authorization's roll-up. |
| `transaction.succeeded` | A sale completes (status `success`). |
| `transaction.settled` | A transaction reaches `settled`, including the parent roll-up when a partially captured authorization is closed by a void. |
| `transaction.partially_settled` | A parent authorization is partially captured (roll-up status `partially_settled`). |
| `transaction.paid` | A transaction reaches `paid`. |
| `transaction.voided` | An authorization or payment is voided. |
| `transaction.refunded` | A refund completes **and** the parent's cumulative refunds now cover the captured amount (see [Refund events](#refund-events)). |
| `transaction.partially_refunded` | A refund completes but part of the captured amount remains unrefunded. |
| `transaction.failed` | A transaction fails. |
| `transaction.cancelled` | A transaction is cancelled, including risk rejections and decline-cooldown blocks. Duplicate paper-trail rows (already rejected synchronously with HTTP 409) never emit events. |
| `transaction.chargeback` | A chargeback is recorded. |
| `transaction.pending` | **Opt-in only** (see [Event subscriptions](#event-subscriptions)): a transaction enters `pending`. |
| `ping` | Test delivery triggered by an administrator. Signed and structured like a real event but never persisted. `data` contains only `merchant_id`. |

The **default subscription** covers every type except `transaction.pending` (opt-in) and `ping` (test-only, cannot be subscribed).

The transaction `status` values themselves are documented in `docs/guides/transaction-statuses.md`.

### Multiple events per operation

The gateway fires one event per webhookable status transition, per transaction row. Three consequences worth designing for:

- **Auto-capture acquirer flows** emit two events for one sale on the *same* transaction id: `transaction.authorized` first, then `transaction.succeeded` when the capture confirms.
- **Merchant-initiated capture of an authorization** emits events on *two* transaction ids: the capture child row (its own lifecycle) and the parent authorization's roll-up (`transaction.captured`, `transaction.partially_settled` or `transaction.settled`). Distinguish them by `transaction_type` and `related_trans_id`. Child rows point at their parent.
- **Captures, refunds and voids share the parent's `merchant_trans_id`**. The merchant reference alone does not identify a unique transaction row, so use `id`.

### Refund events

Refunds are separate child transactions (`transaction_type: "refund"`) linked to the parent via `related_trans_id`. The parent row itself does not change status when refunded. When a refund child completes, the event type is derived from the parent's totals: if cumulative refunds (including this one) now cover the captured amount the event is `transaction.refunded`, otherwise `transaction.partially_refunded`. Each partial refund is a new child row and produces its own event. `data.transaction` is the refund child and `data.parent_transaction` summarises the parent's updated totals.

### Payload

Events are JSON, encoded with unescaped slashes and unescaped unicode. Amounts are **integers in minor units** (`5000` = 50.00) alongside an ISO 4217 `currency`. Timestamps are ISO 8601 UTC (`Z` suffix).

A completed sale:

```json
{
    "id": "evt_01k20b9v6ye2ttfvghw2hcaa8p",
    "type": "transaction.succeeded",
    "created_at": "2026-08-05T12:00:00Z",
    "api_version": "2026-08-01",
    "data": {
        "transaction": {
            "id": 123456,
            "public_id": "txn_01k20b9v6ye2ttfvghw2hcaa8q",
            "merchant_trans_id": "ORDER-100045",
            "related_trans_id": null,
            "transaction_type": "sale",
            "status": "success",
            "payment_method": "card",
            "amount": 5000,
            "currency": "EUR",
            "refunded_amount": 0,
            "acquirer_provider": "qashpay",
            "acquirer_trans_id": "8ac7a4a29852f6f101985300a1b41c2f",
            "acquirer_auth_code": "012345",
            "description": null,
            "created_at": "2026-08-05T11:59:48Z",
            "updated_at": "2026-08-05T12:00:00Z"
        }
    }
}
```

A partial refund (child transaction plus parent summary):

```json
{
    "id": "evt_01k20bt64k2c14n5xw8ahb62pd",
    "type": "transaction.partially_refunded",
    "created_at": "2026-08-05T14:30:00Z",
    "api_version": "2026-08-01",
    "data": {
        "transaction": {
            "id": 123460,
            "public_id": "txn_01k20bt64k2c14n5xw8ahb62pe",
            "merchant_trans_id": "ORDER-100045",
            "related_trans_id": 123456,
            "transaction_type": "refund",
            "status": "refunded",
            "payment_method": "card",
            "amount": 2000,
            "currency": "EUR",
            "acquirer_provider": "qashpay",
            "acquirer_trans_id": "8ac7a4a29853f1a801985391c4dd3d61",
            "acquirer_auth_code": null,
            "description": "Partial refund",
            "created_at": "2026-08-05T14:29:55Z",
            "updated_at": "2026-08-05T14:30:00Z"
        },
        "parent_transaction": {
            "id": 123456,
            "public_id": "txn_01k20b9v6ye2ttfvghw2hcaa8q",
            "status": "success",
            "amount": 5000,
            "captured_amount": 5000,
            "refunded_amount": 2000
        }
    }
}
```

Field notes:

| Field | Notes |
|---|---|
| `id` | Event id (`evt_` + 26-char ULID). Identical across every retry and replay of this event. This is the idempotency key. |
| `api_version` | Payload schema version, also sent as `X-Softlemon-Webhook-Version`. |
| `data.transaction.id` | The gateway transaction id, the value the transaction endpoints currently take. |
| `data.transaction.public_id` | The transaction's opaque `txn_` public id, the stable Softlemon reference to store. The integer `id` and `related_trans_id` leave the payload on a future `api_version` once the transaction endpoints accept public ids. |
| `data.transaction.payment_method` | Always present: `card` for card payments, otherwise the alternative payment method code (`psc`, ...). |
| `data.transaction.payment_session_id` | Present on redirect/APM transactions: the `ps_*` payment session public id, for reconciling against the payment sessions API. |
| `data.transaction.provider_transaction_id` | Present on redirect/APM transactions: the provider's own transaction id. |
| `data.transaction.merchant_trans_id` | The merchant's own reference. Shared by captures, refunds and voids of the same payment. It is not unique on its own. |
| `data.transaction.captured_amount` | Present only on authorization rows (`transaction_type: "auth"`). |
| `data.transaction.refunded_amount` | Present only on `sale` and `capture` rows. |
| `data.parent_transaction` | Present only on child-row events (captures, refunds, voids): id, public id, status and amount totals of the parent. |

**The contract is additive-by-default: new fields may appear at any time without a version bump. Receivers must ignore unknown fields.** Payloads never contain cardholder data, payment instrument details, PAN, CVV or IP addresses.

### Delivery headers

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |
| `User-Agent` | `Softlemon-Webhooks/1.0` |
| `X-Softlemon-Event-Id` | Event id (`evt_*`). Stable across retries and replays. Deduplicate on this. |
| `X-Softlemon-Delivery-Id` | Delivery attempt id (`whd_*`). Unique per attempt. |
| `X-Softlemon-Event-Type` | The event type, e.g. `transaction.captured`. |
| `X-Softlemon-Timestamp` | Unix seconds at signing time (same value as `t=` in the signature). |
| `X-Softlemon-Signature` | Signature header: `t={timestamp},v1={hex}` (see below). |
| `X-Softlemon-Webhook-Version` | Payload schema version (`2026-08-01`). |
| `X-Softlemon-Replay` | `true`, **present only on replays**. Absence means the delivery is not a replay. The header is never sent with the value `false`. |

### Verifying signatures

Every delivery is signed with the endpoint's secret (`whsec_` followed by 64 hex characters, where the **whole string, prefix included, is the HMAC key**):

```
signed_payload = "{timestamp}.{raw_request_body}"
signature      = HMAC-SHA256(signed_payload, secret)   // lowercase hex
header         = "t={timestamp},v1={signature}"
```

To verify:

1. Read the **raw request body bytes** before any JSON parsing, re-encoding or framework body transformation. The signature covers the exact bytes sent.
2. Parse `X-Softlemon-Signature` into `t` and `v1`.
3. Reject if the difference between now and `t` exceeds 300 seconds (the tolerance is bidirectional and future timestamps are rejected too).
4. Compute `HMAC-SHA256("{t}.{raw_body}", secret)` and compare with `v1` using a **constant-time comparison**.

Test vector for checking an implementation (this exact vector is pinned by the gateway's test suite):

| | |
|---|---|
| Secret | `whsec_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef` |
| Timestamp | `1767225600` |
| Raw body | `{"id":"evt_test","type":"ping"}` |
| Expected header | `t=1767225600,v1=fbde45091d9cee489739b9e780ad04d63739262ac902cd4e33fcebd147c8b554` |

Shell (compute the expected hex for the vector above):

```bash
SECRET='whsec_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
BODY='{"id":"evt_test","type":"ping"}'
printf '%s.%s' 1767225600 "$BODY" | openssl dgst -sha256 -hmac "$SECRET"
# fbde45091d9cee489739b9e780ad04d63739262ac902cd4e33fcebd147c8b554
```

PHP:

```php
function verifySoftlemonWebhook(string $rawBody, string $header, string $secret, int $tolerance = 300): bool
{
    $timestamp = null;
    $candidates = [];

    foreach (explode(',', $header) as $part) {
        $pieces = explode('=', trim($part), 2);
        if (count($pieces) !== 2) {
            continue;
        }
        if ($pieces[0] === 't' && ctype_digit($pieces[1])) {
            $timestamp = (int) $pieces[1];
        } elseif ($pieces[0] === 'v1' && $pieces[1] !== '') {
            $candidates[] = $pieces[1];
        }
    }

    if ($timestamp === null || $candidates === [] || abs(time() - $timestamp) > $tolerance) {
        return false;
    }

    $expected = hash_hmac('sha256', $timestamp.'.'.$rawBody, $secret);

    foreach ($candidates as $candidate) {
        if (hash_equals($expected, $candidate)) {
            return true;
        }
    }

    return false;
}
```

Python:

```python
import hashlib
import hmac
import time

def verify_softlemon_webhook(raw_body: bytes, header: str, secret: str, tolerance: int = 300) -> bool:
    timestamp = None
    candidates = []

    for part in header.split(","):
        key, sep, value = part.strip().partition("=")
        if not sep:
            continue
        if key == "t" and value.isdigit():
            timestamp = int(value)
        elif key == "v1" and value:
            candidates.append(value)

    if timestamp is None or not candidates or abs(time.time() - timestamp) > tolerance:
        return False

    signed_payload = str(timestamp).encode() + b"." + raw_body
    expected = hmac.new(secret.encode(), signed_payload, hashlib.sha256).hexdigest()

    return any(hmac.compare_digest(expected, candidate) for candidate in candidates)
```

Node.js:

```javascript
const crypto = require('node:crypto');

function verifySoftlemonWebhook(rawBody, header, secret, tolerance = 300) {
    let timestamp = null;
    const candidates = [];

    for (const part of header.split(',')) {
        const index = part.indexOf('=');
        if (index === -1) continue;
        const key = part.slice(0, index).trim();
        const value = part.slice(index + 1);
        if (key === 't' && /^\d+$/.test(value)) timestamp = Number(value);
        else if (key === 'v1' && value) candidates.push(value);
    }

    if (timestamp === null || candidates.length === 0) return false;
    if (Math.abs(Date.now() / 1000 - timestamp) > tolerance) return false;

    const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest();

    return candidates.some((candidate) => {
        const received = Buffer.from(candidate, 'hex');
        return received.length === expected.length && crypto.timingSafeEqual(expected, received);
    });
}
```

Raw-body caveats: in Express use `express.raw({ type: 'application/json' })` (or capture `req.rawBody`) because `express.json()` alone destroys the bytes you need. In frameworks that expose only a parsed body, verification will fail intermittently. Always verify against the raw bytes, then parse.

### Retries and failure handling

Only a **2xx response is success**. Redirects are never followed. A 3xx counts as failure, as does any 4xx/5xx, a connection error or exceeding the 10-second response timeout (5-second connect timeout). Failed deliveries are retried on a fixed schedule:

| Attempt | Wait before attempt | Elapsed (approx.) |
|---|---|---|
| 1 | n/a | 0 |
| 2 | 1 minute | ~1 min |
| 3 | 5 minutes | ~6 min |
| 4 | 15 minutes | ~21 min |
| 5 | 30 minutes | ~51 min |

If the fifth attempt fails, the event is marked **permanently failed**. It remains in the delivery history and can be replayed manually within the retention window. Deliveries to an endpoint that has been deactivated are abandoned immediately without retries. Attempts in the delivery history are numbered from the event's own counter, so a replay continues the sequence: a replayed event that was delivered first time shows attempts 1 and 2.

Delivery is at-least-once: a recorded event whose delivery was interrupted (for example by a process crash) is re-dispatched by a background sweeper, so an occasional duplicate delivery of the same event id is possible even without replays.

### Idempotency and ordering

- **Deduplicate on `X-Softlemon-Event-Id`** (equal to payload `id`). Retries, sweeper re-dispatches and replays all reuse it. Only `X-Softlemon-Delivery-Id` changes per attempt.
- **Ordering is not guaranteed.** Retry backoff means a later event can arrive before an earlier one's retry succeeds. Reconcile using the payload `created_at`, the transaction `status` and `related_trans_id` links rather than arrival order.

### Replays

An administrator can replay any event still inside the 30-day retention window, including already-delivered events (for example when the merchant lost the original). A replay reuses the same event id and payload, carries a fresh delivery id and adds the `X-Softlemon-Replay: true` header. **Events older than 30 days are pruned and can no longer be replayed. The retention window is the replay window.**

### Secrets and rotation

The signing secret is generated by the gateway (`whsec_` + 64 hex chars), stored encrypted and returned exactly once on endpoint creation and on each rotation. Rotation is a **hard cutover**: there is no dual-secret grace period and any delivery attempt after the rotation, including retries of events first attempted before it, signs with the new secret. Update the receiver's stored secret immediately after rotating.

### Event subscriptions

Each endpoint has an optional `events` list controlling which types are delivered:

- `events: null` (the default): every type except `transaction.pending` and `ping`.
- An explicit list: only the listed types. `transaction.pending` must be listed explicitly to be received. `ping` can never be subscribed (it is delivered only via the admin test action).
- An empty list is rejected. To pause deliveries entirely, deactivate the endpoint instead.

Unsubscribed event types are not recorded at all. The delivery history only ever contains events the gateway actually tried to send.

### Receiver requirements

- HTTPS on a publicly resolvable host. URLs with embedded credentials, `localhost`, `*.local`/`*.internal`/`*.localhost` hosts or private/reserved IP addresses are rejected at registration.
- Respond 2xx within 10 seconds. Acknowledge first, process asynchronously.
- Never respond with a redirect.
- Verify the signature on the raw body before trusting or parsing the payload.
- Process idempotently by event id. Tolerate out-of-order arrival and unknown payload fields.

### Test coverage

The behaviour described here is pinned by the gateway's test suite: `tests/Unit/WebhookSignerTest.php` (the signing algorithm and the test vector above), `tests/Feature/Webhooks/WebhookDeliveryTest.php` (headers, success/failure semantics, redirects, timeouts), `tests/Feature/Webhooks/WebhookObserverTest.php` (which transitions emit which events, subscriptions), `tests/Feature/Webhooks/WebhookHistoryReplayTest.php` (history and replay semantics) and `tests/Feature/Webhooks/WebhookLifecycleTest.php` (full end-to-end lifecycles and the emission matrix).
