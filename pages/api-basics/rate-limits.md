# Rate Limits

The API limits each API key to 1000 requests per 60 second window. The limit applies per key, not per IP address, so every key on your account has its own allowance.

## Graded slowdown

The API slows down before it rejects. As a key approaches its limit, responses are deliberately delayed:

| Requests in the window | Behaviour |
|---|---|
| 0 to 499 | Full speed. |
| 500 to 749 | Each response is delayed by 0.5 seconds. |
| 750 to 999 | Each response is delayed by 1 second. |
| 1000 and above | Requests are rejected with HTTP 429. |

Rising response latency is your early warning. If API calls suddenly take half a second longer, you are past half of your allowance for the current window.

## The 429 response

Once the limit is exceeded, requests fail with HTTP 429 and the standard error envelope:

```json
{
  "success": false,
  "message": "Too many requests",
  "code": "ERR_RATE_LIMITED",
  "data": null
}
```

The 429 includes a `Retry-After` header with the number of seconds until the window frees up. Honour it before retrying. The window is 60 seconds long, so a full backoff of one minute always clears it.

## Rate limit headers

| Header | Sent on | Meaning |
|---|---|---|
| `X-RateLimit-Remaining` | Every response. | Requests left in the current 60 second window. |
| `Retry-After` | 429 responses only. | Seconds to wait before retrying. |

Watch `X-RateLimit-Remaining` to shed load before the slowdown thresholds instead of reacting to latency alone.

## Staying under the limit

- Smooth bursts through a queue instead of firing requests in parallel spikes.
- Use [webhooks](/guides/webhooks) for status updates instead of polling `GET /api/v1/transactions/{transaction_id}/status` in a loop.
- Treat added latency as a signal to shed load before you hit the hard limit.
- If your legitimate volume needs a higher limit, contact [support](/api-basics/support).

## Public page limits

Customer-facing browser pages are limited separately at 60 requests per minute per IP address. This covers the 3D Secure return and challenge pages and the payment session return and cancel landings. These limits protect redirect endpoints that customers hit from their browsers and do not affect server-to-server API traffic.
