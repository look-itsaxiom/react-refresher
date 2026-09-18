# Harden a server function

The starter simulates a Server Function the same way lesson 3 did: a plain
async function stands in for one marked `'use server'` (no RSC runtime in
this sandbox, so we model the boundary instead of running it).

`createTodoAction` in `App.tsx` has three problems, all typical of a
Server Function written without remembering it's a public endpoint:

1. It never checks who is calling. It should reject the submission when
   `session` (a fake exported at the top of the file, standing in for a
   real `cookies()`/`auth()` call) is `null`, and return a typed error
   instead of adding anything.
2. It never validates its input. A blank title should produce a field
   error, not an empty todo.
3. It lets `addTodo` throw straight through the action. A Server
   Function's result should always be a typed, safe-to-render value —
   catch the failure and report it in state instead.

Fix `createTodoAction` so it returns `{ todos, errors }` in every case, and
remove the hidden `userId` field — identity comes from the server's own
`session`, never from a field the client filled in.

## Why this matters

Every Server Function compiles to a real endpoint the bundler registers,
reachable by anyone who can construct the right request — whether or not
any UI on the page calls it. Treat its arguments exactly like an HTTP
request body: untrusted until validated, and never a substitute for
checking who is signed in.
