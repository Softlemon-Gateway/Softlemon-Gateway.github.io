# Transaction Statuses

This reference lists every status a transaction can have. Statuses appear in API responses as the `status` field and in webhook payloads as `data.transaction.status`.

## Status reference

| Status | Meaning | Terminal | Webhook event |
|---|---|---|---|
| `init` | Transaction created but not yet processed. | No | none |
| `auth` | Authorization approved and funds reserved. Capture to settle. | No | `transaction.authorized` |
| `partially_settled` | Part of an authorization has been captured. | No | `transaction.partially_settled` |
| `pending` | The transaction is being processed. | No | `transaction.pending` (opt-in) |
| `pending_3ds` | Waiting for the cardholder to complete 3D Secure. | No | none |
| `authenticated_3ds` | 3D Secure completed and the transaction can proceed. | No | none |
| `captured` | Funds captured. The canonical revenue state. | Yes | `transaction.captured` |
| `voided` | The authorization or payment was voided. | Yes | `transaction.voided` |
| `partially_refunded` | Part of the captured amount has been refunded. | No | `transaction.partially_refunded` |
| `refunded` | Cumulative refunds cover the captured amount. | Yes | `transaction.refunded` |
| `settled` | The acquirer has cleared the funds. | Yes | `transaction.settled` |
| `success` | A sale completed. | Yes | `transaction.succeeded` |
| `failed` | The transaction failed. | Yes | `transaction.failed` |
| `cancelled` | The transaction was cancelled. Includes risk rejections, decline cooldown blocks and recorded duplicate attempts. | Yes | `transaction.cancelled` |
| `chargeback` | A chargeback was recorded. | Yes | `transaction.chargeback` |
| `paid` | The acquirer has paid the funds out to the merchant. | Yes | `transaction.paid` |

## Terminal and intermediate statuses

A terminal status is the end of that transaction row's lifecycle and no further status change is expected: `captured`, `voided`, `refunded`, `settled`, `success`, `failed`, `cancelled`, `chargeback` and `paid`.

Intermediate statuses progress to a terminal status: `init`, `auth`, `partially_settled`, `pending`, `pending_3ds`, `authenticated_3ds` and `partially_refunded`.

## Which statuses count as revenue

Use `captured` as the canonical revenue state. `success` indicates a completed sale on some acquirers and should not be used for revenue or success-rate reporting. `settled` and `paid` describe money movement between the acquirer and the merchant and are visibility states only.

## Statuses and webhooks

A webhook fires when a transaction transitions into a status with an event in the table above. `init`, `pending_3ds` and `authenticated_3ds` never emit events. `transaction.pending` is delivered only to endpoints whose event subscription lists it explicitly. Captures, refunds and voids are recorded as their own child transaction rows with their own lifecycles, so a single operation can produce events on both the child row and the parent's roll-up. See the [webhook integration guide](/guides/webhooks) for payload shapes, signatures and delivery semantics.
