# Bounded source verification — 2026-11-10

Read-only diagnosis requested after parent browser observations. No database, account secrets, token values, password values, or request bodies were accessed. No application source was changed.

## Login: misleading error confirmed; credential failure root cause not proven

Browser evidence supplied by parent: registration succeeds and reaches dashboard; logout followed by same-account login returns HTTP 400 with `Email atau password salah.`

Source evidence:

- `src/Kemudi.Api/Controllers/AuthController.cs:65-74`: missing/blank email or password returns **400**, whereas unknown user or incorrect password returns **401**. Registration at lines 43-57 uses Identity `CreateAsync` and returns success only when creation succeeds.
- `src/Kemudi.Web/Services/BrowserApiEndpoints.cs:52-54`: gateway preserves the upstream status code but replaces **every non-success login response**, including 400 and 500, with `Email atau password salah.` Therefore that UI message cannot establish a password mismatch.
- `src/Kemudi.Web/Components/Pages/Login.razor:25,30`: both inputs use plain `@bind` without `@bind:event="oninput"`; lines 51-60 submit `_email` and `_password` without checking emptiness first.
- `src/Kemudi.Web/wwwroot/js/session-client.js:3-12`: request gets an antiforgery token, JSON-serializes the supplied object, and displays gateway errors. A gateway CSRF failure would have a different message (`BrowserApiEndpoints.cs:48`).

Inference, not demonstrated root cause: HTTP 400 is consistent with missing/blank bound fields or upstream model-binding failure rather than password mismatch. Input-to-Blazor synchronization/autofill/blur timing should be ruled out before changing Identity or database logic. No source proof of password hashing/storage failure was found in the bounded auth path.

Smallest next browser check: ensure both inputs have been blurred and the interactive circuit is ready before submit, inspect only boolean non-empty/equality checks in memory (never log credentials), and compare HTTP status. A 401 would be a separate credential-validation result.

## Personal course: mentor query ignored

- `src/Kemudi.Web/Components/Pages/MentorDetail.razor:50` generates `kursus/personal?mentor=@_mentor.Id`.
- `src/Kemudi.Web/Components/Pages/Personal.razor:51-55` binds the mentor selector to `_mentorId`.
- `Personal.razor:121` initializes `_mentorId` to empty. Its complete component code at lines 115-172 has no query parameter binding or URI parsing; initialization at 130-134 only loads mentor/package lists.

Conclusion: following the mentor-specific registration link does not initialize the chosen mentor. The query has no reader in the destination component. Source confirms the parent browser observation.

## Personal course: literal null-coalescing fallback

- `src/Kemudi.Web/Components/Pages/Personal.razor:80-81` places `?? "Belum dipilih"` after implicit Razor expressions rather than inside a parenthesized explicit expression.

Conclusion: source matches the parent observation of literal `?? "Belum dipilih"` in both mentor and package summaries. The intended null-coalescing operation is not enclosed in the Razor expression.

## Retrieval and scope

Used graph symbol search, outbound auth trace, controller snippet, and exact-path coverage checks. Coverage reported no recorded issue for AuthController, BrowserApiEndpoints, DTOs, and session-client; Login/Register/MentorDetail were partial and Personal unusable. All four Razor files were therefore read directly in full, covering the reported gaps. Graph cleanliness is best-effort, not proof of completeness.

No fixes applied. No independent browser reproduction performed by this lane; browser observations above belong to the parent. These findings do not certify backend persistence, account security, or the remainder of the project.
