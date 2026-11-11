# Warning and payment-security regressions

Run from the repository root:

```powershell
dotnet run --project tools/Kemudi.RegressionTests --artifacts-path artifacts/dotnet-regression-tests
```

Assert-based checks cover legacy vehicle lookup, null-safe/structural gear-ratio
comparison, EF change tracking and snapshot isolation, and actual admin course-page
badge rendering. Failure returns exit code 1. No additional test packages, server,
credentials or persistent database are needed; HTTP responses are local fixtures.

Payment checks also exercise owner isolation, pending-only customer submissions,
reference/method validation, idempotent retries, ambiguous legacy records, guarded admin settlement and atomic
audit rollback. Independent SQLite connections race against a private temporary
fixture database, removed afterward. No test accounts or production data are used.

Keep the artifacts path separate from any running preview server to avoid DLL locks.

Controller fixtures do not execute JWT middleware or cookie antiforgery. Those
boundaries need the separate HTTP/browser tests; this is not a production payment
provider or full website acceptance test.
