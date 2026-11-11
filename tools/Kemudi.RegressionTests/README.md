# Warning regressions

Run from the repository root:

```powershell
dotnet run --project tools/Kemudi.RegressionTests --artifacts-path artifacts/dotnet-warning-tests
```

Ten assert-based checks cover legacy vehicle lookup, null-safe/structural gear-ratio
comparison, EF change tracking and snapshot isolation, and actual admin course-page
badge rendering. Failure returns exit code 1. No additional test packages, server,
credentials or persistent database are needed; HTTP responses are local fixtures.

This is not a production admin-authentication or full website acceptance test.
