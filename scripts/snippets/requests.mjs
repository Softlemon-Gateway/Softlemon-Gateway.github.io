// One request definition per guide step. scripts/generate-snippets.mjs renders
// each definition into an 11-language CodeTabs block between the matching
// {/* snippet:<guide>:<step> */} markers in pages/guides/<guide>.mdx.

export const BASE_URL = "https://api.sandbox.softlemons.com";

const CARD = {
  number: "4200000000000091",
  exp_month: 12,
  exp_year: 2030,
  name: "John Doe",
  cvv: "123",
};

export const guides = {
  "accept-a-payment": {
    "verify-3ds": {
      method: "POST",
      path: "/api/v1/3ds/verify",
      body: {
        amount: 12.5,
        currency: "EUR",
        card: CARD,
        auth_url: "https://yoursite.com/checkout/3ds-complete",
      },
    },
    "create-sale": {
      method: "POST",
      path: "/api/v1/transactions",
      body: {
        transaction_type: "sale",
        amount: 12.5,
        currency: "EUR",
        reference: "ORDER-912346",
        card: CARD,
        card_verification_data: { id: 166 },
      },
    },
    "poll-status": {
      method: "GET",
      path: "/api/v1/transactions/2/status",
    },
  },

  "authorize-and-capture": {
    "place-hold": {
      method: "POST",
      path: "/api/v1/transactions",
      body: {
        transaction_type: "auth",
        amount: 12.5,
        currency: "EUR",
        reference: "ORDER-912346",
        card: CARD,
        card_verification_data: { id: 166 },
      },
    },
    "capture-full": {
      method: "POST",
      path: "/api/v1/transactions/2/capture",
      headers: { "Idempotency-Key": "9f2c7d3e-1a5b-4c8d-9e6f-2b7a8c1d4e5f" },
      body: {},
    },
    "capture-partial": {
      method: "POST",
      path: "/api/v1/transactions/2/capture",
      headers: { "Idempotency-Key": "b3e8f1a6-7c2d-4e9b-8a5f-1d6c3b9e2f7a" },
      body: { amount: 5.0 },
    },
    void: {
      method: "POST",
      path: "/api/v1/transactions/2/void",
      headers: { "Idempotency-Key": "7e1f4a9c-3d6b-4e2f-a8c5-9b4d7e2f6a1c" },
      body: {},
    },
  },

  refunds: {
    "refund-full": {
      method: "POST",
      path: "/api/v1/transactions/2/refund",
      headers: { "Idempotency-Key": "4c9d2e8f-6b1a-4f3c-8d7e-5a2b9c6d1e4f" },
      body: {},
    },
    "refund-partial": {
      method: "POST",
      path: "/api/v1/transactions/2/refund",
      headers: { "Idempotency-Key": "e5a2c8f4-9d1b-4c6e-b7a3-2f8d5c1e9b4a" },
      body: { amount: 5.0 },
    },
    "poll-totals": {
      method: "GET",
      path: "/api/v1/transactions/2/status",
    },
  },

  "returning-customers": {
    "charge-vault": {
      method: "POST",
      path: "/api/v1/transactions",
      body: {
        transaction_type: "sale",
        amount: 24.0,
        currency: "EUR",
        reference: "ORDER-912401",
        vault_token: "8ac7a4a29852f6f101985300a1b41c2f",
        card: { cvv: "123" },
      },
    },
    "list-instruments": {
      method: "GET",
      path: "/api/v1/payment-instruments",
      query: { status: "active" },
    },
    "revoke-instrument": {
      method: "DELETE",
      path: "/api/v1/payment-instruments/pi_01k24d5re8xh1v0c9jc0m8w3ns",
    },
  },

  "partner-integration": {
    "key-info": {
      method: "GET",
      path: "/api/v1/key-info",
    },
    "list-merchants": {
      method: "GET",
      path: "/api/v1/merchants",
    },
    "merchant-transactions": {
      method: "GET",
      path: "/api/v1/merchants/1/transactions",
      query: { status: "success", per_page: "25" },
    },
    "partner-3ds-verify": {
      method: "POST",
      path: "/api/v1/3ds/verify",
      body: {
        merchant_id: 1,
        amount: 12.5,
        currency: "EUR",
        card: CARD,
        auth_url: "https://yoursite.com/checkout/3ds-complete",
      },
    },
    "partner-sale": {
      method: "POST",
      path: "/api/v1/transactions",
      body: {
        merchant_id: 1,
        transaction_type: "sale",
        amount: 12.5,
        currency: "EUR",
        reference: "ORDER-912346",
        card: CARD,
        card_verification_data: { id: 166 },
      },
    },
  },

  "set-up-webhooks": {
    "register-endpoint": {
      method: "PUT",
      path: "/api/v1/webhook",
      body: { url: "https://example.com/webhooks/softlemon" },
    },
    "test-ping": {
      method: "POST",
      path: "/api/v1/webhook/test",
      body: {},
    },
    "choose-events": {
      method: "PUT",
      path: "/api/v1/webhook",
      body: {
        url: "https://example.com/webhooks/softlemon",
        events: [
          "transaction.captured",
          "transaction.refunded",
          "transaction.failed",
        ],
      },
    },
    "show-config": {
      method: "GET",
      path: "/api/v1/webhook",
    },
    "list-events": {
      method: "GET",
      path: "/api/v1/webhook/events",
      query: { status: "failed" },
    },
    "get-event": {
      method: "GET",
      path: "/api/v1/webhook/events/evt_01k20c4x9y5r08qwj6dfhm3bzt",
    },
    "replay-event": {
      method: "POST",
      path: "/api/v1/webhook/events/evt_01k20c4x9y5r08qwj6dfhm3bzt/replay",
      body: {},
    },
    "rotate-secret": {
      method: "POST",
      path: "/api/v1/webhook/rotate-secret",
      body: {},
    },
  },

  "accept-an-alternative-payment": {
    "create-session": {
      method: "POST",
      path: "/api/v1/payment-sessions",
      body: {
        amount: 25,
        currency: "EUR",
        reference: "DEP-2048",
        payment_method: "psc",
        customer: {
          first_name: "Jane",
          last_name: "Doe",
          country_code: "GB",
          merchant_customer_id: "player-981",
        },
        customer_reference: "player-981",
        success_url: "https://merchant.example.com/deposit/complete",
        cancel_url: "https://merchant.example.com/deposit/cancelled",
      },
    },
    "poll-session": {
      method: "GET",
      path: "/api/v1/payment-sessions/ps_01J8FYK3ZQ4T9RB2M6XD5A7CWE",
    },
  },
};
