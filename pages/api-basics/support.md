# Support

## Contact

Use the support contact and status page details the SoftLemon team gives you during onboarding. If you do not have them, ask your SoftLemon account manager. Response times are agreed per account.

## Reporting an API problem

Include the following in your report and support can usually reproduce the issue immediately:

- The environment (sandbox or production) and the endpoint you called.
- The transaction id or reference involved.
- The full response body, especially the `code` value. See [error handling](/api-basics/errors) for what each code means.
- Timestamps in UTC for when the requests were made.
- Your merchant name or id. Never include your API key or full card numbers.

## Before you contact us

- Declines with card error codes such as `ERR_CARD_DO_NOT_HONOR` are issuer decisions. The customer's bank declined and only the customer can resolve it with their bank.
- A 409 response means [duplicate protection](/guides/duplicate-protection) caught a repeated reference. That is the system working as intended.
- 429 responses mean you hit the [rate limit](/api-basics/rate-limits). Back off and smooth your traffic before asking for a higher limit.
- Webhook delivery issues are usually reachability or signature verification problems on the receiving side. Work through the [webhooks guide](/guides/webhooks) checklist first.

## Requesting account changes

Payment method enablement, currency setup, higher rate limits and new API keys are account changes handled by the SoftLemon team. Contact support with your merchant id and what you need.
