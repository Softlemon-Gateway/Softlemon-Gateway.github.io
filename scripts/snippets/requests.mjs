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
      body: {},
    },
    "capture-partial": {
      method: "POST",
      path: "/api/v1/transactions/2/capture",
      body: { amount: 5.0 },
    },
    void: {
      method: "POST",
      path: "/api/v1/transactions/2/void",
      body: {},
    },
  },

  refunds: {
    "refund-full": {
      method: "POST",
      path: "/api/v1/transactions/2/refund",
      body: {},
    },
    "refund-partial": {
      method: "POST",
      path: "/api/v1/transactions/2/refund",
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
