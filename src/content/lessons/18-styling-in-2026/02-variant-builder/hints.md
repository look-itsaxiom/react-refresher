Start with the compound variant — it's the smaller change. Inside `button`, compute a
string (empty or `'ring-2 ring-red-300'`) based on `intent` and `size`, and pass it into
`mergeClasses` alongside the other class strings.
---
For `mergeClasses`, first turn every argument into a flat list of individual class tokens:
join the truthy arguments with a space, then `.split(/\s+/)` and filter out empty strings.
Order matters — keep the tokens in the order they were passed in.
---
Walk the token list once. For each token, decide its "group": tokens matching `p-<value>`
(try a regex like `/^p-\S+$/`) belong to a `'padding'` group; every other token is its own
group (it never conflicts with anything, so its group key can just be the token itself).
Keep a `Map` from group to the *last* token seen for that group — later assignments
overwrite earlier ones for the same key.
---
To preserve a deterministic order in the output, track the order groups were first seen in
a separate array, then map that array through the `Map` to build the final string. That
way `p-3` written early and `p-8` written later still produces `p-8` in the slot where
padding was first introduced, and every non-padding class stays exactly where it was.
