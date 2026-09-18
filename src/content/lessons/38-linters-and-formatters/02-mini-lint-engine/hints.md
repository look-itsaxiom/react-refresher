Start with the visit step, before recursion. Inside `walk`, write
`for (const { visitor, report } of instances) { const handler = visitor[node.type]; handler?.(node, { report, ancestors, precedingSiblings }); }`.
This is the entire "call every rule's visitor for this node" step — nothing about
recursion belongs in this loop.
---
For recursion, `childArrays(node)` already gives you every array of children in order,
so you don't need a `switch`. `for (const arr of childArrays(node)) { for (let i = 0; i < arr.length; i++) { walk(arr[i], [...ancestors, node], arr.slice(0, i)); } }`
— the key detail is that `precedingSiblings` for `arr[i]` is `arr.slice(0, i)`, computed
fresh for every index, not the `precedingSiblings` the current `walk` call received.
---
`ancestors` grows by exactly one element per recursion level: the node whose children
you're currently iterating. Passing `[...ancestors, node]` (not `ancestors` alone, and
not `[node]` alone) is what lets `rulesOfHooksRule` find an `IfStatement` two or more
levels up, not just one.
---
The `'Program:exit'` call goes after `walk(ast, [], [])` returns, not inside `walk`.
`for (const { visitor, report } of instances) { visitor['Program:exit']?.(ast, { report, ancestors: [], precedingSiblings: [] }); }`.
Without this, `noUnusedVarsRule` collects its `declared`/`used` maps correctly during the
walk but never reports anything, since its only report happens inside that handler.
