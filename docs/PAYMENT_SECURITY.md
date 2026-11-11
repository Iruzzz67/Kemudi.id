# Payment security — hardening plan and contract

## Bounded plan (11 November 2026)

1. Lock the unsafe payment behavior with controller/real-SQLite regressions.
2. Require validated JWT ownership for registration creation, details and customer
   payment submission. Legacy unowned registrations are admin-only; do not claim
   ownership from an email address or expose them anonymously.
3. Customer submissions remain Pending, with no PaidAt or activation. Use trusted
   server amounts, a single logical submission and database-backed serialization.
4. Reconcile only through the Admin-role payment endpoint. Require a reconciliation
   reference, atomic status+audit persistence, safe retries and guarded transitions.
   Close the alternate registration endpoint that can synthesize a paid record.
5. Remove placeholder bank/QR details, make pending/manual review explicit, and
   repair the existing admin-login path needed for genuine manual verification.
6. Reject public development JWT keys outside Development; verify unit, HTTP
   authorization/concurrency and browser customer/admin flows against a local test DB.

No provider integration, paid service, dependency, production access, historical
data deletion, automatic refund or simulator changes are included. This is not
payment-provider/compliance certification. Old Paid/duplicate rows require human
reconciliation; do not rewrite them silently.

## Evidence standard

Record RED/GREEN test output, builds and browser coverage under
`artifacts/payment-security/`. Unexecuted checks remain NOT RUN. Tests create only
local dummy data and never persist passwords, JWTs or cookies in evidence.

## References

- [OWASP payment gateway integration](https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Payment_Gateway_Integration_Cheat_Sheet.html): browser confirmation is not verified settlement.
- [OWASP authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): validate ownership on each resource operation.
- [ASP.NET Core 8 antiforgery](https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-8.0): cookie-backed gateway mutations must validate antiforgery tokens.
- [Microsoft.Data.Sqlite transactions](https://learn.microsoft.com/en-us/dotnet/standard/data/sqlite/transactions): serializable transactions and bounded lock waits; validate concurrent requests with independent connections.
