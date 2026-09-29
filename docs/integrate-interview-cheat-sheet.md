# Integrate Debugging Round: One-Page Cheat Sheet

One hour, four tickets, four bugs, two engineers. They grade how you think, not how fast you type.

## 1. Track decision

**Take Front end.** TypeScript and React are your daily tools, nothing installs, and the debugging surface (DevTools, network tab, a test run) is where you are fastest. Three weeks of Go against an unfamiliar codebase under time pressure is a handicap you do not need.

Pick Back end only if they tell you the front-end track runs on a stack you have never touched, such as a legacy class-component app or an unfamiliar meta-framework.

## 2. The first ten minutes: orientation script

Do not open a ticket until you have done this. Narrate every step.

1. **Read the README and the package scripts.** Say: "I'm reading the README and the scripts first so I know how to run and test this before I change anything."
2. **Start the dev server and the test suite.** Say: "Starting the app and running the suite now, so I have a green baseline to compare against."
3. **Walk the folder shape.** Routes, components, hooks, data or api layer, tests. Say: "I'm mapping where routes, components, hooks, and data fetching live so I know where to look later."
4. **Open the app and click around.** Say: "Clicking through the main flows so I recognize normal behavior before I try to spot broken behavior."
5. **Read all four tickets before touching one.** Say: "I want to read all four first, because two of them may share a root cause and that would change my order."
6. **Rank them out loud.** Say: "I'm starting with ticket two. It has the clearest repro steps and looks smallest. I'm deprioritizing ticket four because it sounds like a data question I want to ask about first."

Course tie-in: this is the lesson 113 drill format. Run the drill tonight at `C:\Users\ChaseSkibeness\Projects\ticket-drill`.

## 3. A debugging loop you can narrate

Run the same loop on all four tickets. Repetition reads as method.

- **Reproduce.** "First I want to see it fail myself, so I know I'm fixing the thing you reported."
- **Localize.** "The broken value renders here, so I'm walking back up to where it comes from."
- **Hypothesize.** "My hypothesis is that the effect re-runs every render because the dependency array gets a new object each time."
- **Confirm the root cause.** "Before I change anything I want proof. I'm setting a breakpoint here to see the actual value, not just the symptom."
- **Fix the smallest change.** "The smallest fix that addresses the cause is this one line. I'm not refactoring the surrounding component right now."
- **Verify.** "Re-running the repro, and re-running the suite to check I didn't break the other case."
- **State the trade-off.** "The trade-off is that this fixes the render path, but the same pattern exists in two other components. I'd file a follow-up."

**When stuck, say so within 60 seconds:** "I'm stuck on why this state is stale. Next I'd add a labeled log at the reducer boundary. Or, faster, can you tell me whether this store is shared across routes?"

## 4. Where React and TypeScript bugs hide

Twelve classics. The tool that confirms it is in parentheses.

- **Stale closure or missing effect dependency.** Check the deps array and captured variables (breakpoint inside the effect).
- **Keys by index.** Look at any list that reorders or filters (React DevTools Components, watch state follow the wrong row).
- **Derived state stored in state.** One value set in two places, updated in only one (search the setter, count call sites).
- **Async race on selection change.** The previous item's data lands after you click a new one (network tab, watch response order).
- **Wrong comparison.** Label instead of key, or string id against number id from JSON (labeled log of both values and types).
- **Off-by-one in slicing or pagination.** Check slice bounds and page math (a failing test with a three-item fixture).
- **Date one day off.** A date-only string parses as UTC then renders local (log the ISO string next to the rendered string). Lesson 31.
- **Optional chaining hiding a null.** It renders empty instead of erroring (breakpoint, inspect the whole object).
- **Fetch with no error branch.** A non-ok response falls through to the success path (network tab, block or throttle the request).
- **Controlled to uncontrolled input switch.** Value starts undefined and later becomes a string (React console warning).
- **Reducer branch returns stale state or mutates.** Look for a push on state or a missing spread (log before and after).
- **Memoized value with wrong deps.** A memo or callback that never recomputes (React DevTools Profiler, check why it rendered). Lesson 53.

## 5. Where full-stack bugs hide

Even on the front-end track, the data may be the bug.

- **API shape differs from what the UI expects.** Compare the real payload against the TypeScript type.
- **Status code mismatch.** A 200 wrapping an error body, or a 204 parsed as JSON.
- **The data really is wrong.** Check the JSON or the database, not the rendered UI.
- **Missing filter or wrong relation direction.** Predecessor versus successor is the classic in scheduling software.
- **Timezone at the boundary.** Stored UTC, rendered local, or a date-only column treated as a timestamp.
- **Stale cache.** A query cache or memo that never invalidates after a mutation.
- **Auth header absent.** The same request works on one screen and returns 401 on another.
- **Env config.** Wrong base URL, a flag left off, or seed data unlike what the ticket describes.

**How to see the data fast:** hit the endpoint with curl or the browser, read the network tab response body, write a one-assertion test, or run a select. Say: "I want to see the raw response before I blame the component."

## 6. Tonight: tools and setup check

- Confirm VS Code launches a Node debug config and a Chrome debug config. Set one breakpoint and hit it.
- Install or verify React DevTools in Chrome. Open Components and Profiler once.
- Know the exact commands for one test file and for the whole suite. Lesson 41.
- Practice a branch per ticket with `git checkout -b ticket-1`. One fix, clean diff.
- Charger packed. Phone hotspot tested. Laptop updates finished, not pending.
- Run the drill at `C:\Users\ChaseSkibeness\Projects\ticket-drill` end to end tonight.
- **If the dev server or container will not start tonight, fix it tonight.** Not in the room.

## 7. Questions to ask the room

1. "What is the intended behavior here? I want to confirm this is a bug and not a spec I'm misreading."
2. "What are the exact repro steps you used, and with which record or user?"
3. "Which environment and which dataset should I be testing against?"
4. "Do you want the root cause fixed now, or a safe symptom fix first with a follow-up ticket?"
5. "Which of these four matters most? I'd start with this one, for this reason."
6. "What counts as done here? A passing test, a pull request, or a working demo?"
7. "If the real fix lives in the API or the data layer, is a change there welcome or out of scope?"
8. "What would you do next from here?"

## 8. Say this, not that

- Not silence while you scroll. Say: "I'm scanning the hooks folder for where this data gets fetched."
- Not "I'd google it." Say: "I'd normally look this up. Can you tell me how this router handles a param change?"
- Not "it works now." Say: "Root cause was the index key. I verified by reordering the list. The trade-off is two other lists share the pattern."
- Not "this code is bad." Say: "This computes derived state in two places. That is likely our bug, and I'd consolidate it."
- Not "I'm not sure." Say: "I have two hypotheses. I'm testing the cheaper one first, with a breakpoint here."
- Not quietly skipping a ticket. Say: "I'm deprioritizing this one because it needs data I can't see yet. Here is what I'd check first."

## 9. Logistics

Integrate, 5325 Ballard Ave NW, Suite 300, Seattle WA 98107, two doors down from Other Coast Cafe. Arrive ten minutes early with laptop and charger. The first five minutes are intros and getting your machine running. VS Code is on their machines if yours fails. No AI assistance, so ask the room instead. If anything breaks, say so immediately and keep narrating while you fix it.
