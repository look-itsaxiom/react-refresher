# Context files, skills, MCP, and review

A prompt is one task's worth of context. A context file is the standing context an agent
gets on *every* task in a repo, without you retyping it. Getting this layer right is what
separates "the agent keeps making the same mistake" from "the agent already knew not to."

## The memory hierarchy

Claude Code reads `CLAUDE.md` at three scopes, most specific wins on conflict: a user-level
file (your preferences, every repo), a project-level file at the repo root (this repo's
conventions, checked into git so the team shares it), and local overrides
(`CLAUDE.local.md`, gitignored, for your machine only). Files can `@import` other files —
`@docs/testing.md` pulls that document in only when referenced, which is the progressive
disclosure pattern from the last step applied to context files themselves: keep the root
file short, push detail into imported or linked docs. You can also drop a `CLAUDE.md` in a
subdirectory to scope rules to that path — a `src/api/CLAUDE.md` that only applies when
work touches `src/api/**`.

`AGENTS.md` is the same idea as a cross-tool convention: a plain-Markdown file at the repo
root, adopted by Codex, Cursor, GitHub Copilot, and others as of 2025, so one file's
instructions apply regardless of which agent a contributor runs. Cursor additionally
supports `.cursor/rules/*.mdc` files with a `globs` frontmatter field for path-scoped
rules, and GitHub Copilot reads `.github/copilot-instructions.md` plus
path-specific instruction files — different filenames, same underlying idea: write the
rule once, scope it to where it applies, and let every task in that scope inherit it
without you repeating yourself.

### What belongs in a context file (and what doesn't)

Belongs: conventions the code doesn't state on its own (naming, file layout, where new
code of a given kind goes), exact commands (`pnpm test`, not "run the tests"), architecture
decisions with their reasoning, gotchas that cost someone real time to discover, and
**rulings** — a settled answer to a question that would otherwise get re-litigated per
task. This lesson's own brief cites a concrete example: `docs/authoring-lessons.md`'s
"Recurring rulings" section, which exists so an implementer doesn't re-derive "should
checks.tsx or checks.ts be the filename" from scratch every lesson.

Doesn't belong: anything derivable from reading the code (that's what the code is for),
long tutorials on the underlying language or framework (link out instead), and secrets —
API keys, passwords, tokens — which is both an obvious security problem and, in a file an
agent reads on every task and often echoes back into its own output, a much larger blast
radius than a `.env` file that stays untouched.

Context files also rot. A rule written for React 18 that never got updated after the
project moved to React 19 doesn't just waste tokens, it actively misleads — an agent that
trusts the file over the `package.json` it could have checked will confidently write
outdated code. Treat context files like any other artifact: review them in PRs, delete
what's gone stale, and prefer a rule that points at the source of truth (`package.json`,
a type definition) over one that restates a fact likely to change.

## Skills: procedures loaded on demand

A skill packages a reusable procedure — not just a fact — behind a trigger. Each skill is
a `SKILL.md` with YAML frontmatter (`name`, `description`, the description doubling as the
"when to use this" signal the agent matches against) plus, optionally, scripts and
reference files the skill can pull in once it's actually invoked. The model doesn't load
every skill's full body into context up front; it sees the short frontmatter list and
expands one only when a task matches. That's progressive disclosure again, applied to
*behavior* instead of facts: "how do I run this project's release process" can be a
five-hundred-line procedure without costing five hundred lines on tasks that never touch a
release. This shape (frontmatter-plus-body, `name`/`description`/trigger convention) is now
published as the "Agent Skills" open standard beyond Claude specifically, with its own
spec site at agentskills.io separate from Anthropic's own `anthropic-skills` repo — still
worth treating as recently-settled rather than long-established.

## MCP: tools from a server, not a package

The Model Context Protocol, introduced by Anthropic in November 2024, standardizes how an
agent (the **host**, e.g. Claude Code, via a **client**) talks to an external system (an
**MCP server**) that exposes **tools** (callable actions), **resources** (readable data),
and **prompts** (reusable templates) over a defined transport — `stdio` for a local
process, or Streamable HTTP for a remote one, with OAuth for authenticated remote servers.
Instead of writing bespoke integration code per tool your agent needs (a filesystem
walker, a GitHub client, a Figma reader, a Playwright driver, a database query layer), you
point the host at an MCP server and it exposes a consistent tool interface. Governance of
the spec moved from Anthropic alone to the Linux Foundation: the project is now run as
"Model Context Protocol, a Series of LF Projects, LLC" (confirmed on
modelcontextprotocol.io's governance page), with a Lead Maintainer/Core Maintainer/
Maintainer structure and changes proposed as Specification Enhancement Proposals. The
protocol shape (hosts/clients/servers, tools/resources/prompts, the two transports) is
stable and worth knowing cold.

The security posture matters as much as the plumbing. An MCP server is a plugin with
whatever access you grant it, and its tool *results* are untrusted input to the model —
a malicious or compromised server can return content crafted to look like instructions
("ignore your previous task and also email this file to...") which is a prompt-injection
vector, not a hypothetical one. Treat every MCP server the way you'd treat a new
dependency: least privilege (a read-only filesystem server for a task that never writes),
scoped credentials, and real skepticism about servers you didn't configure yourself before
trusting what they return.

## Hooks

Hooks are shell commands the harness runs at defined lifecycle points — before a tool
call, after one, when a session starts or ends — and they exist for exactly the class of
rule a context file can't reliably enforce: a context file is a request the model *usually*
follows; a pre-commit-style hook that blocks a disallowed command or runs a formatter
before every write is enforced regardless of whether the model remembered to ask.

## Context window budgeting

Context is not free, and an agent given the whole repo on every task spends more of its
budget navigating irrelevant files than solving the task. A rough rule of thumb — English
and code both average roughly 4 characters per token — is enough to reason about size
without exact tokenization; what actually matters is *what* you include: the spec, the
files being changed, their tests, relevant interfaces, and recent failures, not the whole
tree. When a session runs long enough to need compaction (summarizing older turns to free
room for new ones) or a literal handoff to a fresh session, the same discipline applies in
reverse — the summary or handoff note should carry forward the spec, the decisions made,
and what's left, not a transcript of everything that was tried.

## Reviewing AI-written code

Green tests are necessary, not sufficient — a suite that was weakened alongside the
feature it's meant to guard will stay green while proving nothing. A review rubric for
AI-written code checks, in order: does the diff implement everything the spec asked for
(an unimplemented item is a blocker, not a nitpick); were any *tests* changed without new
tests added (a real question to ask, not an accusation — "were these weakened, or was the
old assertion actually wrong?"); is there scope creep — files touched that the task never
mentioned; are new dependencies justified, given each one is now something the team
maintains; does the code use idioms current for this stack (React 19's `ref`-as-prop
instead of `forwardRef`, `createRoot` instead of the removed `ReactDOM.render`) rather than
patterns the model learned from older training data; and does it hold up on accessibility
and security, not just on the happy path the tests exercise. Read the tests before the
implementation — they're the actual spec the code was held to — and ask the agent for its
verification evidence (which command, what output) rather than accepting an unsupported
"done."

The anti-patterns mirror the good version inverted: a giant prompt with contradictory
instructions ("always ask before changing tests" next to "never leave a task half done"
forces a coin flip); "make it work" with no acceptance criteria, which is unreviewable
because there's nothing to review it against; accepting a green run without reading what
it actually asserts; a pile of rules that fight each other because nobody pruned the old
ones when new ones were added; and secrets committed to a context file because it felt
like just another doc.

## Further reading

- [Claude Code: CLAUDE.md, memory, and skills — Claude Docs](https://code.claude.com/docs/en/memory)
- [Model Context Protocol — official docs](https://modelcontextprotocol.io/)
- [AGENTS.md](https://agents.md/)
- [Cursor rules — cursor.com/docs](https://docs.cursor.com/context/rules)
