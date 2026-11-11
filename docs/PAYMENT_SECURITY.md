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

## Implemented contract

- Registration POST/GET and payment POST/GET require a validated, active account
  and the registration owner's JWT subject. Other users receive404; legacy
  registrations with no owner remain unavailable to customers. Request-body
  user IDs, prices, settlement status and dates never override trusted values.
- New customer submissions create Pending with null PaidAt and a positive
  server package amount. Equivalent requests return the same logical payment.
  Changed reference/method, rejected/cancelled registrations and ambiguous legacy
  payment histories return409 rather than silently creating more records.
- SQLite transactions reserve the writer before the read/insert decision.
  New payment IDs equal their registration ID as an additional primary-key guard.
  Concurrent independent connections are tested. No schema migration or existing
  record deletion was introduced. A provider migration must revisit locking and
  enforce appropriate database uniqueness; current evidence is SQLite-specific.
- Only the Admin-role payment endpoint can settle. Pending→Paid requires a
  3–128-character independently checked receipt/bank reference. Status,
  registration and actor/reference audit commit atomically; audit failure rolls
  back settlement. Identical retries do not change PaidAt or add audit entries.
  Paid is terminal here: no reopen, cancellation or automatic refund. Cancelled
  must first be reopened to Pending by an admin. Inconsistent/duplicate historical
  rows are blocked for reconciliation instead of being guessed or rewritten.
- The registration-status endpoint cannot synthesize Paid/payments or overwrite
  a registration that already has a payment record. Its UI links to payment review.
- Customer UI treats only an explicit payment404 as no existing submission;
  conflicts, outages, malformed responses and indeterminate state block transfer
  instructions/submission. Pending remains visibly pending after submission/reload.
- Admin login uses the dedicated Admin API through a CSRF-validated same-origin
  gateway. UI privilege comes from the backend-validated active admin profile,
  not email substrings or decoding an unverified cookie. Verification outages
  block protected content with an explicit unavailable state, not fake login errors.
- JWT validation rechecks account activity and current Admin membership. Cookie
  authentication tokens stay HttpOnly/SameSite=Lax, and Secure outside Development.
  Public development keys are rejected outside Development; the base configuration
  contains no usable signing key. No secret or token is stored in QA evidence.

## Operator configuration and remaining release gates

- Supply a private cryptographically random `Jwt__SecretKey` of at least32UTF-8
  bytes through a secret manager, never source control. Enforce HTTPS and configure
  the trusted reverse proxy correctly before deployment; local HTTP previews are
  Development only. Production startup rejects the public development key.
- Website `Payments__TransferInstructions` and `Payments__EWalletInstructions`
  default to absent. Provide verified official account/payment instructions before
  enabling the corresponding UI. They render as escaped plain text; no placeholder
  QR/account is usable and no external provider is invoked.
- Administrators must independently check actual funds received, method, IDR amount
  and order against the official account/provider or cash receipt before settling.
  A customer reference, screenshot or checkbox is **not** settlement verification.
  The application enforces authority/auditing, not external bank truth.
- Old Paid/duplicate/unowned records require human review. This change neither
  retroactively certifies nor deletes them. Refunds/corrections need a separate
  controlled process. Price is fixed on the first accepted payment submission;
  later catalogue price changes do not rewrite that submitted amount.
- Real provider settlement/webhook signatures, uploads, refunds, production
  deployment, operational monitoring, admin MFA and an independent comprehensive
  security/compliance audit are not supplied or certified by this patch.

## Reproducible tests

```powershell
dotnet run --project tools/Kemudi.RegressionTests --artifacts-path artifacts/dotnet-payments-final
```

The HTTP/browser regression requires a **new empty local QA database** named
`artifacts/payment-security/test-<32hex>.db` and API/Web pointing to it. It checks
loopback origins, exact non-symlink database scope and zero existing users before
mutation, then creates only its own dummy accounts and Admin-role fixture.
Do not run it against preview/production account data or reuse a populated DB.

```powershell
$env:API_URL = 'http://127.0.0.1:5902'
$env:WEB_URL = 'http://127.0.0.1:5903'
$env:PAYMENT_QA_DB = '<absolute path of the new dedicated test database>'
# Optional separate test website with harmless QA-only instructions:
$env:PAYMENT_CONFIGURED_WEB_URL = 'http://127.0.0.1:5905'
npm.cmd --prefix tools/webgl run test:payments
```

The test changes fixture roles/activity only within that fresh guarded database.
It does not forge production JWTs, promote real accounts or contact payment providers.

## Evidence standard

Record RED/GREEN test output, builds and browser coverage under
`artifacts/payment-security/`. Unexecuted checks remain NOT RUN. Tests create only
local dummy data and never persist passwords, JWTs or cookies in evidence.

## Verification completed — 11 November 2026

**Bounded hardening PASS; not production/provider certification.**

| Validation | Result / evidence |
|---|---|
| Pre-fix controller regressions | RED:24original payment checks failed against the unsafe controllers; `regression-red-ready.log` |
| Final C# controller/render/regression suite | PASS50checks, exit0; `regression-final-latest.log` (27payment,7payment-page,16existing/admin-access checks) |
| Fresh isolated HTTP/browser suite | PASS26checks, exit0; `http-browser-report.json`, `http-browser-final.log` |
| Concurrent HTTP submissions | Ten equivalent customer requests: one Pending row. Five equivalent admin settlements: one confirmation audit and stable PaidAt |
| Full solution build, warnings as errors | PASS0warnings/0errors; `dotnet-build-ui-fix.log`, output `artifacts/dotnet-payments-final` |
| Production JWT configuration | Missing/private-key absence and public development key both rejected before serving; `production-key-guards-final.json` |
| JS syntax / existing functions / result gateway recovery | PASS61authored files /6checks /4checks; `syntax-final.log`, `functions-final.log`, `result-recovery-final.log` |
| Independent final review | APPROVE bounded scope; prior3findings fixed with regressions; no outstanding issues in scoped re-review |

All evidence above is under `artifacts/payment-security/`. The first HTTP run
was **22PASS/1FAIL**, not a complete passing run: the inline table form moved
26px between pointer-down and pointer-up and swallowed the first confirmation
click. Its failure and pointer trace were preserved. Verification now uses a
separate stable form outside the table and checks acknowledgment/reference/busy
state again in the server-side UI handler. The final browser run requires one
confirmation click, one persisted settlement and one audit; no retry-to-pass.

Final test API5902/Web5903 remain active on a fresh ignored QA database; these
are not production or existing account data. Configured-instruction QA website
5905 was stopped after testing, so dummy instructions are not left available.
Other old preview processes were not killed or assumed to contain this build.
Use `http://127.0.0.1:5903/` for the latest bounded preview, not an older binary.

Real bank/provider settlement, refunds/uploads, historical-record cleanup,
production TLS/reverse proxy, secret provisioning and compliance acceptance
remain NOT RUN. Simulator/gamepad full matrices were not repeated for this
payment-only patch; the shared result-saving gateway's focused recovery was.

## References

- [OWASP payment gateway integration](https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Payment_Gateway_Integration_Cheat_Sheet.html): browser confirmation is not verified settlement.
- [OWASP authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): validate ownership on each resource operation.
- [ASP.NET Core 8 antiforgery](https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-8.0): cookie-backed gateway mutations must validate antiforgery tokens.
- [Microsoft.Data.Sqlite transactions](https://learn.microsoft.com/en-us/dotnet/standard/data/sqlite/transactions): serializable transactions and bounded lock waits; validate concurrent requests with independent connections.
