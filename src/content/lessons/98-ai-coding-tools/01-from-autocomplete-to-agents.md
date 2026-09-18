# From autocomplete to agents

You've been writing React since the 18 era, so you've probably watched this
shift happen in your own editor without anyone naming it. Three phases, each
roughly two years: **autocomplete** (2021-2023) — GitHub Copilot shipped in
2021 as single-line and block completions, ghost text that finished what you
were already typing. **Chat** (2023-2024) — ChatGPT's November 2022 launch
pulled a chat pane into the IDE (Copilot Chat, Cursor's chat sidebar): you
could ask a question or paste an error, but the model didn't touch your
files itself. **Agents** (2025-2026) — the model now drives a loop: it reads
your code, edits it, runs your tests, and reacts to the results, largely
unsupervised until it either finishes or hits a wall it can't resolve alone.
Each phase didn't replace the last one so much as absorb it — every agent
tool still autocompletes and still chats.

## The anatomy of an agent loop

Strip away the branding and every coding agent — Claude Code, Cursor's
Composer/Agent mode, Copilot's agent mode, Codex — runs the same loop:

```
model reads transcript so far
  → decides: emit text, or call a tool
  → tool executes, result appended to transcript
  → model reads the updated transcript
  → repeat until the model decides it's done (or a budget runs out)
```

The **context window** is the loop's working memory: the whole transcript —
your prompt, every file the model has read, every tool result — has to fit
inside it, and it's finite (hundreds of thousands of tokens on current
frontier models, but a large repo's worth of file reads fills it fast).
When a long-running task approaches that limit, the harness **compacts**:
it summarizes older transcript content into a shorter form and keeps
working from the summary. This course's own build hit that directly —
implementer subagents got a 15-minute budget specifically so a task that
would otherwise sprawl across a compaction boundary gets quarantined
instead of continuing on a degraded memory of its own earlier work.

**Tool sets** are what turn a chat model into an agent: read a file, edit a
file (or apply a diff), grep/search across a repo, run a shell command, fetch
a URL. A model with only read/grep is a research assistant; add edit and
bash and it can implement and verify its own changes — which is also
exactly where the risk profile changes.

## Permission models

Letting a model run arbitrary shell commands against your machine is a real
trust boundary, and every tool has converged on similar controls: an
**allowlist** of commands or tool categories that don't need confirmation, a
**read-only or plan mode** where the model can look but not touch (Claude
Code's plan mode; Cursor and Copilot have similar "propose, don't apply"
states), **sandboxing** (running the agent's shell access inside a
container or restricted filesystem view so a bad command can't reach the
rest of your machine), and **approval prompts** for anything outside the
allowlist. Every tool in this space also ships a bypass —
`--dangerously-skip-permissions` in Claude Code, similarly-named flags
elsewhere — that skips confirmation entirely. The name is not marketing:
skipping it means a hallucinated `rm -rf` or a prompt-injected instruction
from a fetched web page executes with no human in the loop at all. Treat it
as something you reach for in a disposable container or CI job with nothing
to lose, not your daily machine.

## Subagents, parallelism, and worktrees

A single agent loop shares one context window across an entire task, which
gets crowded fast on multi-part work. **Subagents** solve this by giving
each piece of work a fresh context: an orchestrating agent dispatches
several subagents in parallel, each starting cold with only the brief it's
given, each returning a summary rather than its full transcript back to the
orchestrator. **Git worktrees** solve the matching filesystem problem —
multiple agents editing the same checkout would step on each other's
uncommitted changes, so each gets its own working directory checked out
from the same repository, isolated but sharing history. Some tools now also
run agents in the **background** or in the **cloud**, detached from any
open editor: Copilot's coding agent can be assigned a GitHub issue and open
a pull request without a human driving; Cursor and Claude Code both support
background/cloud agent runs for the same reason — you keep working while a
longer task finishes elsewhere.

## This course, as a case study

This isn't hypothetical: this course was built by exactly this pattern. A
single planning pass produced a task-by-task implementation plan
(`docs/superpowers/plans/2026-09-17-react-refresher.md`), then an
orchestrator dispatched fresh implementer subagents per task, each reviewed
before being merged. The lessons you're reading right now — including this
one — are authored by scheduled runs that follow
`docs/authoring-runbook.md`: preflight (is the tree clean?), dispatch one
fresh subagent per lesson in parallel, verify with `pnpm typecheck` and
`pnpm test`, commit only what's green, and quarantine anything that isn't
rather than let a failing lesson block the rest. `docs/authoring-log.md` is
the append-only record of every run, and it's honest about limits in a way
worth noticing: entries regularly say things like "web search remained
exhausted, hedged in text" or name a fact an author verified by probing the
actual installed library instead of trusting memory. That's the discipline
the next section is about.

## The landscape, as of September 2026 (expect this to be stale within weeks)

Mapped onto the concepts above, not as an endorsement of any one tool:
**Claude Code** — terminal-native, IDE extensions, subagents, hooks,
multiple permission modes including plan mode, worktree support, and a
`CLAUDE.md` file the agent reads for repo-specific context (lesson 99).
**Cursor** — IDE-native, "Composer"/Agent mode drives multi-file edits
directly in the editor, project rules files, background agents, and a
review bot (Bugbot) catching issues in generated diffs — exact current
feature names shift often enough that this list is a snapshot, not a
guarantee. **GitHub Copilot** — agent mode in VS Code plus a "coding
agent" that can be assigned a GitHub issue and work unattended, and
AI-assisted code review on pull requests. **OpenAI Codex** — CLI and
cloud/background variants. **Gemini CLI**, **Cline**, **Aider** — other
terminal- or editor-native agents with the same loop underneath. This list
will be out of date by the time you read a later lesson in this course;
the durable thing to learn is the loop, the tool set, and the permission
model, not any one product's current menu.

## Further reading

- [Claude Code documentation](https://code.claude.com/docs)
- [Claude Agent SDK overview](https://docs.anthropic.com/en/api/agent-sdk/overview)
- [Cursor documentation](https://cursor.com/docs)
- [GitHub Copilot features](https://github.com/features/copilot)
