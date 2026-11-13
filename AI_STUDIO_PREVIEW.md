# Google AI Studio preview for Kemudi.id

Google AI Studio Build mode provides a Node.js web runtime. The full Kemudi.id
website is **Blazor / ASP.NET Core** and requires a separate .NET server and
its database. It cannot be started by just installing npm dependencies.

This repository includes a standalone browser simulation in
`src/Kemudi.Web/wwwroot/simulation-3d/`, built with the existing
`tools/webgl/build.cjs`. The root `package.json` is for previewing **only
that simulator** on Google AI Studio:

- `npm run dev` (or `bun run dev`): validate/build the existing simulator,
  then serve it using `0.0.0.0:3000` unless `PORT` is provided.
- `npm run build`: validate/build the simulator only.
- Local workflow remains `npm --prefix tools/webgl start`, which by default
  still serves at `127.0.0.1:8080`.

The preview does **not** provide Blazor pages, user login, database-backed
enrollment or payment, or API-backed result persistence. Those features must
run in the original .NET application or be intentionally implemented using a
compatible externally hosted backend. Do not invent mock authentication or
payment behavior as a substitute.

After merging this change, re-sync the app in Google AI Studio from the
correct GitHub branch and reload the preview. Confirm the server log no
longer says "Bun could not find a package.json file", then verify the
simulator loads models and accepts vehicle controls.

No extra npm dependency is introduced by this preview adapter.
