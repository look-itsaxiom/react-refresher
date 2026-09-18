# Compute and verify Subresource Integrity

`App.tsx` has three functions with two real bugs between them — one bug
each in `sriIntegrity` and `verifyIntegrity`. `scriptTagFor` has no bug of
its own, but it calls `sriIntegrity`, so it's only correct once that one
is fixed.

## 1. `sriIntegrity(content, algorithm?)`

Hashes `content` with the Web Crypto API (`crypto.subtle.digest`,
default algorithm `'sha384'`) and returns an SRI value:
`` `${algorithm}-${base64Digest}` ``, e.g.
`sha384-JawyHuhqEMFMvdtX+VHylbI0hfJp2F7nvwFVRqqfuOoK5oW7TG/7V11Zs7zeFWIE`
for the string `console.log(1);`.

**The bug:** it currently base64-encodes the *raw content string* directly
with `btoa`, and never calls `crypto.subtle.digest` at all. It needs to
hash the content first (`crypto.subtle.digest` returns an `ArrayBuffer`),
then base64-encode *those digest bytes* — not the original text.

## 2. `verifyIntegrity(content, integrityAttr)`

`integrityAttr` is a real `integrity` attribute value, which can list
multiple space-separated hashes, possibly using different algorithms —
exactly like a `<script integrity="sha256-... sha384-...">` in the wild.
Per the SRI spec, a browser checking a value like that uses only the
*strongest* algorithm present (`sha512` > `sha384` > `sha256`) and ignores
weaker ones entirely — that's what stops an attacker from adding a weak,
easily-forgeable hash alongside a strong one to try to force a downgrade.

**The bug:** it currently uses whichever algorithm the *first* listed hash
happens to use, regardless of whether a stronger one is also present later
in the string. Fix it to always pick the strongest algorithm among all the
hashes actually present, and check the content's digest against that
algorithm's hash(es).

## 3. `scriptTagFor(url, content)`

Already correct — it builds a `<script>` tag string with `src`,
`integrity` (from `sriIntegrity`), and `crossorigin="anonymous"`. It'll
start passing once `sriIntegrity` is fixed.

Fix both bugs and every check should pass.
