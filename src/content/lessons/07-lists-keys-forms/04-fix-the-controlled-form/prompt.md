This invite form has two bugs and a missing feature, all controlled-input problems:

1. **The referral code field silently goes uncontrolled.** Open the browser console: typing in
   it logs a React warning about an input changing from uncontrolled to controlled (or you'll
   just notice the field stops reflecting what you type correctly). Find the piece of state
   that isn't initialized to a real value and fix it.
2. **The referral code should uppercase as you type** — typing `abc123` should show `ABC123` in
   the field, live, not just on submit. It currently shows exactly what was typed.
3. **The email field needs live validation.** While the field is non-empty, show the text
   `Enter a valid email` right below it whenever the current value is not a syntactically valid
   email address (something@something.tld is enough — you do not need a fully spec-compliant
   check). The message must disappear as soon as the value becomes valid, and must not appear
   before the user has typed anything.

The **Send invite** button must stay disabled until the referral code is non-empty *and* the
email is valid. Both fields must remain controlled — do not switch either one to
`defaultValue`/refs.
