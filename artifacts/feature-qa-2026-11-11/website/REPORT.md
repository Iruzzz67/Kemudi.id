# Website feature QA — 11 November 2026

## Outcome

**NEEDS ATTENTION.** Existing local Web5891/API5890, isolated `artifacts/realism/preview.db`. No production application/test/docs source changed by this lane. No real payment, provider, email or production call; only newly created dummy accounts/registrations in preview SQLite.

Primary suite: **60 PASS / 7 FAIL, 67 checks**, after correcting one false-positive mobile assertion using a focused reproduction. Three focused probes corroborate mobile/admin failures and add an invalid-cookie finding. This is broad functional QA, **not proof every feature works**.

Commands (root PowerShell):

```powershell
node artifacts/feature-qa-2026-11-11/website/website-qa.cjs
node artifacts/feature-qa-2026-11-11/website/focused-probes.cjs
```

Evidence: `report.json`, `run.log`, `focused-probes.json`, `focused-probes.log`, screenshots. Original browser script exit code1 reflects failed expectations; focused diagnostic script exit0 means probes completed, not that product expectations passed. Scripts use installed Playwright and generate secrets only in memory; no credential/state files. Dummy account/registration identifiers are omitted from this report and sanitized from logs.

## Confirmed runtime findings

| Severity | Finding and evidence | Source boundary / interpretation |
|---|---|---|
| High | **Anonymous payment can mark a registration paid without payment proof, and repeating it creates another paid payment.** On a registration created only for this test, two unauthenticated `POST /api/payment` returned200; status `paid`, different Payment IDs. | `src/Kemudi.Api/Controllers/PaymentsController.cs:13,25-60`: `AllowAnonymous`, unconditional Paid state and insert. No provider verification, ownership check or duplicate guard in the executed path. This is local proof, not a real bank transaction; do not treat client confirmation as financial settlement in production. |
| High | **Admin login with a valid regular account terminates the Blazor circuit instead of rejecting access gracefully.** No `.error-box`, visible `#blazor-error-ui`, console reports unhandled circuit exception. Screenshot `admin-regular-login-error.png`. | `src/Kemudi.Web/Components/Pages/AdminLogin.razor:49-64` calls `Auth.LoginAdminAsync`; `Services/AuthService.cs:80-83` delegates ordinary login, which writes a response cookie at96. Cookie write in an interactive event is the source-backed likely cause; exact server exception was not captured, so not asserted as proven. Dedicated admin API correctly returns403 for the same ordinary user. |
| Medium | **Invalid non-JWT cookie makes dashboard look authenticated.** Separate clean context containing only a deliberately invalid `kemudi_token` showed Total Percobaan instead of guest invitation. Screenshot `invalid-cookie-dashboard.png`. | `Services/AuthService.cs:20` trusts cookie nonemptiness for UI; dashboard then treats rejected API response as empty history. **No backend data disclosure or authorization bypass proved**. API role enforcement tested separately. |
| Medium | **Mentor chosen from profile is not preselected in registration.** `/kursus/personal?mentor=<existing-slug>` leaves mentor select empty. | `Components/Pages/Personal.razor:130-134` loads lists but does not consume the query; `_mentorId` remains empty. |
| Medium | **Registration summary renders literal source text** `?? "Belum dipilih"` after selected mentor/package. | `Components/Pages/Personal.razor:80-81`, implicit Razor expression ends before the null-coalescing fallback. |
| Low | **Seven enrollment labels lack associated controls** (`label.control === null`), affecting accessible naming and label-click focus. | `Components/Pages/Personal.razor:24-63`; no `for`/control IDs or nested input. |
| Low | **Empty login reports wrong credentials rather than required fields.** | `Services/BrowserApiEndpoints.cs:53-54` maps every upstream login failure to the same message. Empty request is400; actual wrong password rejected as expected. |
| Medium | **Homepage overflows on390px mobile viewport.** Client width390, content width495, expanded innerWidth495. Other four tested mobile routes stayed390. Screenshot `mobile-home.png`. | Runtime proof only; offending CSS/element not localized. The first harness compared scrollWidth to expanded innerWidth, masking this. Focused probe compared clientWidth and corrected `report.json`; future script now uses clientWidth. |

## Actual coverage

| Feature | Result / scope |
|---|---|
| Public pages `/`, `/kursus`, `/materi`, `/login`, `/register`, `/kursus/personal`, `/kursus/payment` | PASS HTTP200 and rendered content; payment missing ID handled with not-found message |
| Course catalog APIs | PASS7packages/4mentors/3vehicles; each of3vehicle UI filters matches backend package and mentor counts; reset All works |
| Mentor profiles | PASS all4profiles; mentor-to-registration preselection FAIL |
| Theory content | PASS all4detail titles; nonexistent slug handled |
| Enrollment validation/summary/accessibility | Required-field error PASS; query/summary/labels FAIL |
| Register/login/logout/dashboard/profile | Fresh register→dashboard PASS; logout→guest PASS; wrong password rejected PASS; valid login survives reload PASS; own profile API PASS; invalid-cookie UI FAIL |
| Admin authorization API | PASS12read endpoints: guest401 and ordinary-user403; dedicated admin login rejects ordinary user403 |
| Admin UI authorization | PASS9protected routes redirect ordinary user to `/admin/login`; login form with ordinary credentials FAIL circuit termination |
| Local enrollment→payment instructions→confirm | PASS all3methods transfer/e-wallet/cash navigate and persist paid status in local DB; this current behavior does **not** prove safe/verified payment |
| Payment trust boundary/repeat | FAIL unauthenticated confirmation and duplicate insertion on own dummy registration |
| Mobile390×844 | Kursus/materi/register/personal no horizontal overflow PASS; homepage FAIL |
| Browser errors | No uncaught `pageerror` events, but that signal alone misses handled Blazor circuit errors; focused console+error UI confirmed admin failure. One focused console `ERR_NETWORK_ACCESS_DENIED` was also seen; external resource not localized, not classified as product defect. |

## Source-only observations / limits

- `AuthService.IsAdmin` uses `HttpContext.User` email substring `admin` at36-45, not the JWT Admin role. The Web startup inspected by parent has no authentication middleware populating the principal. Legitimate Admin successful login/access remains **NOT RUN**, so this is an implementation risk, not a proven escalation or a proven working admin flow.
- Registration details `GET /api/course-registration/{id}` are anonymous in current source (`CourseRegistrationController.cs:80-98`); own dummy detail was retrievable anonymously as part of the payment tests. No other user's record was accessed or enumerated.
- Graph coverage checked for13 source paths: C# reported metadata-match/no recorded issues; Razor files mostly partial/unusable. Full direct source reads covered the reported gaps; conclusions rely on those reads and runtime evidence, not graph completeness.
- Main owns backend-smoke/results/simulator suites and integration docs; these are not duplicated or claimed by this report.
- Authorized admin CRUD, schedules/settings/statistics success paths **NOT RUN** (no authorized credentials; no privilege promotion). No profile-edit page exists in the current route set; only profile read was tested.
- Real bank/e-wallet settlement, email, physical controller/audio, sustained performance, human visual acceptance, all production/security scenarios **NOT RUN**. Existing servers were left untouched and running.

## Regression harness review

Read main's `tools/Kemudi.RegressionTests/Program.cs`: bounded vehicle lookup cases, null comparator operands, ordered equality/hash, EF mutation snapshot, and actual `AdminKursus` rendering fixture are appropriate for the three warning fixes. This lane did not execute or modify that harness; main owns its RED/GREEN evidence. Its artificial principal is a render fixture only, not proof production admin authentication works.
