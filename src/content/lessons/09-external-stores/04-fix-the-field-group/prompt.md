`FieldGroup` hardcodes `id="name"` and `id="name-hint"`. That's fine for one instance and
broken for two: render the component twice, as `App` does, and both instances share the
same ids, which makes the label-to-input association ambiguous.

Fix `FieldGroup` so each instance gets its own unique, stable id, and `aria-describedby`
still correctly points from each input to its own hint paragraph.

Do not change `App` or the props `FieldGroup` accepts.
