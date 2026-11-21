# WebGL Learning Repository

These instructions apply to the entire repository. Write learner-facing plans,
progress entries, and review summaries in Simplified Chinese.

## Learning workflow

- For quarterly work, read [the quarter index](docs/quarterly/README.md),
  then the requested quarter's plan and progress. If none is specified, use
  the active quarter in the index. Keep goals and schedules in that plan.
- For a learning task, start with a question and a prediction, then use the
  smallest runnable experiment that isolates the concept. End with an
  acceptance check: can the learner explain, implement, or debug it?
- Keep the code under study visible. Do not hide shader or matrix work in a
  shared helper just to shorten an example. Distinguish a working guided demo
  from an implementation or diagnosis the learner performed independently.

## Repository layout

- Keep `WeekN/DayN/` and `shared/` in place. Link to relevant existing exercises
  instead of moving, copying, or redoing them. See
  [the existing layout and study plan](docs/webgl-long-term-study-plan.md).
- Use plain HTML and JavaScript for both tracks. Give each experiment its own
  `index.html` and `main.js` and serve it over HTTP from the repository root.
  Do not introduce Vite, Vue, or an npm build step for these demos.
- Put native WebGL experiments in `projects/webgl-lab/experiments/<topic>/`
  and renderer and performance experiments in
  `projects/threejs-lab/experiments/<topic>/`. Load Three.js directly as a
  pinned browser ES module and use the same version for any addons.
- Put the comparison scene in `projects/webgl-lab/scene/` and
  `projects/threejs-lab/scene/`. Keep geometry, camera, and relevant
  parameters comparable. Add planned directories only when needed.

## Progress and evidence

- Keep each quarter's records in `docs/quarterly/<YYYYQn>/`, for example
  `docs/quarterly/2026Q4/`. Use its `plan.md` for goals, weekly tasks, and
  acceptance criteria, and `reviews/` for weekly takeaways. Start a new
  directory for a new quarter instead of overwriting earlier records.
- After each completed task, add one row to that quarter's `progress.md`:
  `What was completed | How it was verified | Evidence links | What remains`.
  Link to the exact experiment, report, or versioned demo. Record missing
  verification as a gap, and treat pre-quarter work as a baseline, not as a
  new quarterly result.
- Put performance reports in that quarter's `benchmarks/` and link them to
  the runnable case. Record the version, device and browser, viewport and
  device pixel ratio, scene settings, warm-up and sampling method, and
  baseline and follow-up data. Change one factor at a time where feasible.
  Report what was measured: fewer draw calls do not by themselves prove
  faster frames. Do not claim a lab result as a production improvement.
- At quarter end, choose the strongest evidence for each goal. State the
  result, what it demonstrates, and any remaining gap instead of writing only
  "achieved" or "not achieved". Describe what was actually verified; if the
  review form also names CesiumJS, report its status separately from Three.js.

## Demo delivery

- Keep each representative demo independently runnable. On the first screen,
  say what it tests, what to click, and what change to expect. For rendering
  comparisons, provide a toggle and keep unrelated parameters fixed.
- Use GitHub Pages for the quarterly evidence site: one overview page and a
  direct demo link for each goal. Link demos to the corresponding source and
  experiment report. Use a fixed path per quarter (for example, `2026Q4/`)
  tied to the reviewed commit. Keep older review URLs working when a new
  quarter is published.
- Publish selected demos and their required assets as static files, without a
  build step. Preserve relative imports, including any `shared/` dependency,
  so the pages work under the GitHub Pages repository path.
  Verify both direct demo URLs and their assets in the reviewer's access
  context before adding the links to the assessment.
- Publish only content approved for the chosen visibility. Do not publish
  internal code, data, credentials, or private assessment material. If access
  is unavailable, provide a recording and run instructions as a fallback.
  Do not configure or deploy Pages until deployment work is requested.
