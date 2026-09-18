import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A `<Card>` component renders `<header><h3>{title}</h3></header>` for its title bar, and is used dozens of times on a dashboard page inside a `<main>`. A reviewer flags it: "won\'t this flood the landmark list with dozens of banners?" Are they right?',
      choices: [
        {
          id: 'a',
          text: 'Yes — every `<header>` is a `banner` landmark, so this needs to change to a plain `<div>`.',
        },
        {
          id: 'b',
          text: 'No — a `<header>` is only mapped to the `banner` landmark role when it is not scoped inside sectioning content like `<main>`, `<article>`, `<section>`, `<nav>`, or `<aside>`; nested inside each card, it has no landmark role at all.',
        },
        { id: 'c', text: 'No — `<header>` never produces a landmark role in HTML, only `role="banner"` explicitly set does.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The `<header>`/`<footer>` landmark mapping depends on scoping: only a `<header>` that is not nested inside `<main>`, `<article>`, `<aside>`, `<nav>`, or `<section>` becomes the page\'s `banner`. One inside each card is scoped to that card and produces no landmark — this is exactly the design that lets `<header>` be reused freely inside components without landmark spam.',
    },
    {
      id: 'q2',
      prompt:
        'A designer wants a "Filters" heading above a search form for screen reader users to jump to, but doesn\'t want it to take up any visible space in the compact filter bar. Which approach is correct?',
      choices: [
        { id: 'a', text: '`<h2 hidden>Filters</h2>` — the `hidden` attribute keeps it out of layout.' },
        {
          id: 'b',
          text: 'A `.sr-only` class that clips the element to 1px and hides overflow, rather than `display: none` or the `hidden` attribute.',
        },
        { id: 'c', text: '`<h2 aria-hidden="true">Filters</h2>` — this removes it from view but keeps it announced.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`hidden` and `aria-hidden` both remove an element from the accessibility tree (the opposite of what\'s wanted here — it needs to stay in the tree, just out of visible layout). A `.sr-only`-style clip keeps the element rendered and in the tree, but visually reduced to nothing, which is the only one of the three that produces "in the heading list, invisible on screen."',
    },
    {
      id: 'q3',
      prompt:
        'A stats `<div>` grid uses CSS grid to lay out four `<div>` "cells" per row, visually indistinguishable from a table. A teammate argues this is fine because "CSS grid is literally designed for tabular layout." What\'s the accurate response?',
      choices: [
        {
          id: 'a',
          text: 'They\'re right — CSS grid was built to replace `<table>`, so any grid-of-divs is an acceptable substitute for a data table.',
        },
        {
          id: 'b',
          text: 'CSS grid is a layout mechanism, unrelated to the `<table>` element\'s accessibility tree (cell coordinates, headers, row/column counts); if the content is genuinely tabular data, it needs real `<table>`/`<th>`/`<td>` markup regardless of which CSS mechanism positions it visually.',
        },
        { id: 'c', text: 'They\'re right, as long as `role="table"` is added to the outer `<div>`.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'CSS grid the layout tool and `<table>` the semantic element solve different problems. A `<div>` grid can be made to *look* like a table with pure CSS, but produces none of the cell/header/coordinate information a screen reader needs — that only comes from the real element. (Choice c is closer, but reconstructing the entire table role tree — row, cell, columnheader, rowheader roles on every element by hand — is far more error-prone than just using `<table>`.)',
    },
    {
      id: 'q4',
      prompt:
        'A sortable table currently sorted ascending by "Date" gets clicked on the "Amount" column header instead. What\'s the correct `aria-sort` update across the table?',
      choices: [
        {
          id: 'a',
          text: 'Set `aria-sort="ascending"` on the Amount header and leave the Date header\'s `aria-sort="ascending"` as it was.',
        },
        {
          id: 'b',
          text: 'Set `aria-sort="ascending"` on the Amount header and remove `aria-sort` (or set it to `"none"`) on the Date header — only one header should carry a non-`none` sort state at a time.',
        },
        { id: 'c', text: 'Add `aria-sort="ascending"` to every column header, since the whole table re-rendered in the new order.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`aria-sort` describes which single column (or row) the *current* sort is based on. Leaving a stale `ascending` on the Date header after switching the sort to Amount tells assistive tech the table is sorted by two columns at once, which isn\'t true and isn\'t even representable — sort state moves, it doesn\'t accumulate.',
    },
    {
      id: 'q5',
      prompt:
        'A page has a "Skip to content" link implemented as `<a href="#main">Skip to content</a>` with a bare `<main id="main">` (no `tabIndex`). In Chrome, clicking it visibly scrolls the page to `<main>`. A developer says "it works, ship it." What\'s missing?',
      choices: [
        {
          id: 'a',
          text: 'Nothing — visible scrolling to the target is the whole requirement for a skip link.',
        },
        {
          id: 'b',
          text: 'Keyboard focus never moves to `<main>` because it isn\'t focusable without `tabIndex={-1}` (or similar); a keyboard or screen reader user\'s next `Tab` press goes to whatever follows the link in the DOM, not into the content that scrolled into view.',
        },
        { id: 'c', text: 'The link needs `target="_self"` for focus to move correctly.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Visual scroll and focus movement are separate things. A fragment link scrolls its target into view, but only *moves focus* there if the target can receive focus — which a plain `<main>` can\'t. Without `tabIndex={-1}` (or an explicit `.focus()` call), the skip link is cosmetic: sighted mouse users don\'t notice, but the keyboard and screen reader users it exists for get no benefit at all.',
    },
    {
      id: 'q6',
      prompt:
        'A team is choosing between shipping a metadata block as `<div className="spec-row"><span className="label">Released</span><span className="value">March 2026</span></div>` (repeated per field) versus a `<dl>`. A reviewer says "they render identically, so it doesn\'t matter." Is that true?',
      choices: [
        {
          id: 'a',
          text: 'True — `<dl>` has no different accessibility behavior from a styled `<div>` pair; it\'s purely a legacy element.',
        },
        {
          id: 'b',
          text: 'False — `<dl>`/`<dt>`/`<dd>` programmatically associates each term with its value as a key-value pair; a `<div>` and a `<span>` sitting next to each other convey that pairing visually but not structurally, so a screen reader can\'t expose "Released: March 2026" as a related pair the way it can with `<dl>`.',
        },
        { id: 'c', text: 'False, but only because `<dl>` is required for SEO structured data.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Visual identity and accessibility-tree identity are different questions, which is the theme of this whole lesson. `<dl>` is the one element that says "these are paired" to assistive tech; a `<div>`/`<span>` pair only says that to sighted users who can see the layout.',
    },
  ],
};
