# Integrate: one-hour debugging round cheat sheet

Format: a small unfamiliar codebase, four tickets each hiding a bug, one hour, two engineers in the room who will play PM, teammate, or search engine. No AI tools. They grade your debugging approach, the tools you reach for, the questions you ask, and how you work with people. Orient before you fix, say what you deprioritize, narrate, and say when you are stuck.

## Track decision

Take the front-end track. You have years of React and three weeks of Go, and a debugging round rewards fluency in the language you read fastest, not the language you most want to prove. Nothing to install also removes a whole class of morning risk. Take the back-end track only if you arrive and learn the front-end codebase is a framework you have never touched, such as an Angular or Vue app, in which case Go plus Docker Compose is the fairer fight. Tickets can reach into data and API layers either way; on the front-end track your code changes stay in TypeScript and React.

## The first ten minutes: orientation script

Say "I'm going to spend a few minutes orienting before I touch anything" and then do it.

1. Read the README and the `package.json` scripts. Note the dev, test, and build commands.
2. Start the app and the test suite. Both running beats either one perfect.
3. Skim the folder shape out loud: where routes live, where components live, where data fetching lives.
4. Open one representative component top to bottom so you know the house style.
5. Note the state library, the data layer, and the TypeScript strictness. These decide where bugs hide.
6. Read all four tickets before fixing one. Say which you will start with and why.
7. Name your deprioritization explicitly: "I'm starting with ticket 2 because it blocks the others, and I'll come back to the styling one last."

## A debugging loop you can narrate

- **Reproduce.** "Let me make it fail in front of me first, so I know when it's fixed."
- **Localize.** "The value is wrong on screen, so I'll check whether it's wrong in the render, in state, or in the response." Bisect: network tab, then component state, then the render.
- **Hypothesize.** "My guess is the effect reruns and overwrites the edit. Here's how I'd disprove that."
- **Confirm root cause.** "I want to see the cause, not just make the symptom go away." A log, a breakpoint, or a failing test that proves it.
- **Fix.** Smallest change that addresses the cause. Say what you chose not to refactor.
- **Verify.** Rerun the repro and the tests. "It passes, and here's the case I checked that isn't in the ticket."
- **Trade-off.** "The proper fix is moving this state up, which touches three files. I did the narrow fix and I'd file the refactor."
- **Stuck.** "I've ruled out the response shape and the reducer. Next I'd put a breakpoint on the setter and check what calls it twice. Is there context here I'm missing?" (113)

## Where React bugs hide

- **Stale closure in an effect or callback.** Old prop value captured. React DevTools, then log the value at the top of the callback.
- **Missing effect dependency.** Fires once, never updates. Check the lint warning, then log the dependency array.
- **Keys by array index.** State sticks to the wrong row after reorder or delete. React DevTools highlights; reorder the list manually.
- **Derived state duplicated in state.** Two sources of truth drift. Search for a `useState` initialized from a prop.
- **Async race on unmount.** A resolved fetch sets state after navigation. Console warning plus a labeled log in the `.then`.
- **Wrong branch in a reducer.** Action falls through to the default. Log the action type and the next state on every dispatch.
- **Off-by-one in pagination.** Page 2 starts one row late, or the last page is empty. Network tab query params against the row count.
- **Timezone or date formatting.** UTC parsed as local, so dates slip a day. Log the raw string next to the formatted one.
- **`===` against a JSON id.** The API sends `"12"`, the code compares to `12`. Log both values with `typeof`.
- **Optional chaining hiding a null.** The screen renders blank instead of erroring. Remove the `?.` temporarily and see what throws.
- **Fetch without error handling.** A 500 becomes an empty list. Network tab first, then check for a missing `res.ok` branch.
- **Controlled versus uncontrolled input.** Typing does nothing, or a warning about switching. Check whether `value` is ever `undefined`.

A labeled `console.log` beats staring at code, and reaching for one without apology reads well (113). A failing test that reproduces the bug is the strongest confirmation you can show (41).

## Where full-stack bugs hide

- **Response shape versus what the UI expects.** A renamed or nested field. Compare the network payload to the type.
- **Status code mismatch.** A 200 carrying an error body, so the happy path runs on garbage.
- **The data is simply wrong in the database.** Not every ticket is a code bug.
- **N+1 or a missing filter.** The list is slow or shows another user's rows. Count the requests in the network tab (53).
- **Timezone at the boundary.** Stored UTC, rendered local, or the reverse.
- **Caching or stale data.** A refetch is missing after a mutation, so the list lags one action behind.
- **Missing auth header.** Works logged in on one screen, 401s on another.
- **Environment config.** A base URL or feature flag differs between dev and the running app.

To look at data fast without leaving the front-end track: copy the failing request out of the network tab as cURL and replay it with a changed parameter, or write a one-line test that calls the data function and asserts the shape. If a database is running in Compose, `docker compose exec db psql` and one `SELECT` is faster than guessing.

## Tools to have ready tonight

- VS Code with a JavaScript debug terminal, plus a launch config for Node and for Chrome. Set one breakpoint tonight to prove it attaches.
- React DevTools installed in the browser you will use, with the Components and Profiler tabs opened once.
- Know your one-test command cold: `npx vitest run path/to/file` or `npx jest path/to/file`.
- A branch or `git stash` per ticket, so an abandoned attempt never contaminates the next one.
- Test the whole setup the day before, not in the room. Charger, adapter, and enough battery for an hour without an outlet.

## Questions to ask the room

1. What is the intended behavior here? The ticket says what is wrong, not what right looks like.
2. What are the exact repro steps, and does it happen every time?
3. Which environment did this come from, and is there a user or account it happens for?
4. Is there a recent change that touched this area?
5. Do you want the root-cause fix now, or the safe fix now and the refactor filed?
6. Which of these four matters most to you today?
7. What is your definition of done here: passing tests, a manual check, or both?
8. Is there anything about this codebase that surprises people on their first week?

Treat them as teammates, not examiners. Asking early is a signal, not a cost.

## Tomorrow's logistics

- 5325 Ballard Ave NW, Suite 300, Seattle.
- Laptop, charger, and VS Code already set up and tested.
- Arrive early enough to be unhurried, open your editor, and be ready when the hour starts.
- No AI tools. Close Copilot and any agent extensions tonight so nothing autocompletes in front of them.
