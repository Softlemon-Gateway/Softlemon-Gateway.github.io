# Skrill Quick Checkout and Paysafecard money flow

> **Scope:** This diagram assumes the requested method is **Paysafecard (`PSC`)** presented through Skrill Quick Checkout, rather than the Skrill prepaid card. Skrill Quick Checkout is a **hosted redirect** flow, not an iframe.
>
> **Settlement caveat:** Skrill's Quick Checkout guide defines the customer payment, redirect, and asynchronous-status flows. It does not define the parties' commercial settlement arrangement. The settlement section below therefore shows the two possible contractual models: Skrill settles either to Softlemon as an approved PSP/reseller, or directly to the casino as Skrill's merchant.

```mermaid
sequenceDiagram
    autonumber

    participant Player as Player
    participant Casino as Casino operator<br/>(website and player wallet)
    participant SL as Softlemon Gateway<br/>(payment orchestration)
    participant Skrill as Skrill Quick Checkout<br/>(hosted payment page)
    participant PSC as Paysafecard<br/>(voucher issuer / payment network)
    participant SkrillFunds as Skrill / Paysafe<br/>settlement account
    participant CasinoBank as Casino operator<br/>settlement bank account

    rect rgb(237, 247, 255)
        Note over Player,Skrill: Customer payment initiation and authorisation
        Player->>Casino: Select Paysafecard deposit<br/>and enter deposit amount
        Casino->>SL: Create payment session<br/>(amount, currency, casino reference,<br/>player data, browser success/cancel URLs)
        SL->>SL: Create pending transaction<br/>provider = skrill<br/>payment_method = PSC
        SL->>Skrill: Server-to-server payment preparation<br/>(prepare_only=1, payment_methods=PSC,<br/>transaction_id, status_url = Softlemon callback)
        Skrill-->>SL: SESSION_ID
        SL-->>Casino: checkout_url<br/>https://pay.skrill.com/?sid=SESSION_ID
        Casino-->>Player: Redirect browser to Skrill-hosted checkout
        Note over Casino,Skrill: No iframe. Browser return is not confirmation of funds.
        Player->>Skrill: Select / confirm Paysafecard<br/>and provide voucher credentials as required
        Skrill->>PSC: Payment authorisation request
        PSC->>PSC: Validate voucher, funds, country and risk rules

        alt Paysafecard authorises the payment
            PSC-->>Skrill: Approved
            Skrill-->>Player: Display payment confirmation
            Skrill->>SL: Asynchronous status notification / IPN<br/>(Skrill transaction ID, merchant reference,<br/>amount, currency, payment status)
            SL->>SL: Validate notification signature, reference,<br/>amount and currency; mark transaction paid
            SL-->>Casino: Confirm payment via webhook and/or<br/>payment-status API
            Casino->>Casino: Credit the player's casino wallet
        else Paysafecard declines or player abandons
            PSC-->>Skrill: Declined / cancelled
            Skrill-->>Player: Display decline or cancellation
            Skrill->>SL: Asynchronous failed/cancelled notification
            SL->>SL: Mark transaction failed or cancelled
            SL-->>Casino: Notify failed/cancelled status
            Casino->>Casino: Do not credit the player wallet
        end
    end

    rect rgb(244, 255, 244)
        Note over PSC,CasinoBank: Clearing and settlement occur after authorisation; timing, fees, reserves and currency conversion are contractual.
        PSC->>SkrillFunds: Clear approved Paysafecard funds<br/>net of Paysafecard scheme/provider fees

        alt Softlemon is Skrill's approved merchant / PSP / reseller
            SkrillFunds->>SL: Settle net funds to Softlemon<br/>under the Skrill commercial agreement
            SL->>CasinoBank: Payout net casino proceeds<br/>less agreed Softlemon fees
        else Casino operator is Skrill's direct merchant
            SkrillFunds->>CasinoBank: Settle net funds directly<br/>to the casino operator
            Note over SL,CasinoBank: Softlemon orchestrates payment data and status only;<br/>it does not receive or settle customer funds.
        end
    end

    Note over Player,CasinoBank: The casino must credit player funds only after Softlemon has validated Skrill's server-to-server notification.
```

## Implementation interpretation

- **Casino to Softlemon:** the casino asks Softlemon to create a redirect-payment session; it does not submit card data for this payment method.
- **Softlemon to Skrill:** Softlemon creates a Skrill session server-to-server and returns the Skrill redirect URL to the casino.
- **Skrill to Paysafecard:** Skrill is the checkout and payment-orchestration layer; Paysafecard is the underlying alternative-payment provider that approves or declines the voucher-funded deposit.
- **Skrill to Softlemon:** Skrill's `status_url` / IPN must point to Softlemon. Softlemon must validate the notification before reporting the payment as successful to the casino.
- **Softlemon to casino:** Softlemon should use a merchant webhook and a queryable transaction-status endpoint. Browser `return_url` and `cancel_url` are for user experience only.
- **Settlement:** confirm with Skrill whether Softlemon is permitted to use `psp_id` / `submerchant_*` fields as a reseller, and whether the casino needs its own Skrill merchant account. This determines whether funds settle to Softlemon or straight to the casino.
