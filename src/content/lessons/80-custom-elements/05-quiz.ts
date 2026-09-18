import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A custom element\'s constructor reads `this.getAttribute(\'variant\')` to decide which child elements to build, then appends them immediately. In some browsers this silently builds the wrong thing; occasionally it throws. What is actually wrong?',
      choices: [
        { id: 'a', text: 'Nothing is wrong — attributes are always available by the time the constructor runs.' },
        {
          id: 'b',
          text: "The constructor runs at element creation, which can be before the parser has finished setting attributes or before the element has any children; it must not read attributes or append children — do that work in connectedCallback instead.",
        },
        { id: 'c', text: 'The class should extend `HTMLUnknownElement` instead of `HTMLElement` to get attributes early.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The spec restricts the constructor: no attribute/child access, no synchronous DOM mutation of the element itself, since it can run before those are populated. Attribute-dependent setup belongs in connectedCallback, which always runs after the element is in the tree.',
    },
    {
      id: 'q2',
      prompt:
        'A `<x-panel>` element adds a `resize` listener on `window` inside `connectedCallback` and never removes it. A page moves the panel from one container to another using `newContainer.append(panel)` (removing it from the old parent first). What happens to the listener?',
      choices: [
        { id: 'a', text: 'Nothing changes — moving an element within the same document does not re-run any lifecycle callbacks.' },
        {
          id: 'b',
          text: 'connectedCallback runs again on the re-append (it fires every time the element becomes connected, not just once), so a second resize listener is now attached on top of the first.',
        },
        { id: 'c', text: 'The browser automatically deduplicates identical listeners added to the same target, so this is harmless.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'connectedCallback is not a one-time "mount" hook — it fires on every connection, including a remove-then-reappend used to relocate an element. Anything it sets up against window/document needs matching cleanup in disconnectedCallback, or every move leaks another copy.',
    },
    {
      id: 'q3',
      prompt:
        'A `checked` property setter on a custom checkbox-like element writes `this.setAttribute(\'checked\', \'\')` (or removes it) every time it runs, and `attributeChangedCallback` calls the `checked` setter again whenever the attribute changes. The element hangs the tab. What is the mechanism, and what is the fix?',
      choices: [
        { id: 'a', text: 'This is a memory leak, not an infinite loop — fix it by disconnecting an observer.' },
        {
          id: 'b',
          text: 'It is an infinite loop: the setter always writes the attribute, which always re-triggers the callback, which always calls the setter again — fix it by short-circuiting when the value is already what\'s being set (or letting attributeChangedCallback update rendering directly, without calling back into the property setter).',
        },
        { id: 'c', text: 'Boolean attributes cannot be reflected at all, so the property/attribute pair must be split into two independent, unsynced pieces of state.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Reflecting a property to its attribute and having attributeChangedCallback call back into that same setter is the classic custom-element infinite loop. Break the cycle by making the write idempotent (skip if the value already matches) or by having attributeChangedCallback only update the rendered output, not re-invoke the property setter.',
    },
    {
      id: 'q4',
      prompt:
        'You want `<fancy-button is="fancy-button">` to behave like a real `<button>` — form submission, `:hover`/`:active`, keyboard activation — while adding your own click behavior, using the customized-built-in (`extends: \'button\'`) form. What is the practical blocker for shipping this today?',
      choices: [
        { id: 'a', text: 'There is none — customized built-ins are supported identically across all current browser engines.' },
        {
          id: 'b',
          text: 'WebKit (Safari, and therefore all iOS browsers) has never implemented customized built-ins and has stated no intent to, so any user on Safari/iOS gets a plain unregistered element instead.',
        },
        { id: 'c', text: 'Customized built-ins were removed from the HTML spec in 2024 in favor of ElementInternals.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The `is=` / `extends` form is real and standardized, but WebKit\'s lack of support (with no stated plan to add it) makes it unsafe to rely on for any site with Safari or iOS traffic. A plain custom element composed around a native one avoids the gap entirely.',
    },
    {
      id: 'q5',
      prompt:
        'A `<x-select>` element dispatches a plain `this.dispatchEvent(new Event(\'x-select\'))` (no options object) when the user picks an option. A listener attached to the element\'s *parent* never fires, even though a listener attached directly to `<x-select>` does. Why?',
      choices: [
        { id: 'a', text: 'Custom event names must be prefixed with `on` to bubble, e.g. `onx-select`.' },
        {
          id: 'b',
          text: '`bubbles` defaults to `false` for both `Event` and `CustomEvent` — without `{ bubbles: true }`, the event only reaches listeners on the element itself, never ancestors.',
        },
        { id: 'c', text: 'Events dispatched from inside a custom element class are scoped to that class and can never be observed from outside it.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Unlike native UI events such as click, events created with new Event()/new CustomEvent() do not bubble unless you pass { bubbles: true } explicitly. Forgetting it is the most common reason a "the event never fires" bug turns out to actually be "the event never reaches that listener."',
    },
    {
      id: 'q6',
      prompt:
        'A settings toggle custom element needs to participate in a `<form>` (show up in `FormData` on submit, support `form.reset()`, get native `:invalid` styling on error) without any JavaScript on the consumer\'s side beyond placing it inside a `<form>`. Which mechanism actually provides that?',
      choices: [
        { id: 'a', text: 'Dispatching a `submit`-bubbling `CustomEvent` that the consumer\'s form is expected to listen for and re-read.' },
        {
          id: 'b',
          text: '`static formAssociated = true` plus `this.attachInternals()`, using the returned `ElementInternals` to call `setFormValue` and `setValidity` — this is what makes the element a real participant in form submission and constraint validation.',
        },
        { id: 'c', text: 'Wrapping the element in a hidden native `<input>` that mirrors its state, since custom elements cannot participate in forms directly.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'ElementInternals (gated behind `static formAssociated = true` and `attachInternals()`) is the standardized way for a custom element to act as a genuine form control — FormData, form.reset(), and native validity UI all go through setFormValue/setValidity, no consumer-side JavaScript required. A hidden mirrored `<input>` was the pre-ElementInternals workaround, not the current mechanism.',
    },
  ],
};
