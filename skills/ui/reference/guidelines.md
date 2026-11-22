# Hand-review checklist

A paraphrase of Vercel's [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/434b7f9/command.md)
(commit `434b7f9`, 2026-10-05), sorted by what the ui-floors checks already enforce and what you walk by hand. The
guidelines are MIT-licensed, copyright (c) 2025 Vercel Labs; the licence text is in this repo's `NOTICE`. The
sorting, and any error in the paraphrase, are ours. Read the original for the full wording.

## Enforced by a check

Don't re-review these by hand; the check reports them. Most are opinions in `STANDARD.md`, so a repo may have
turned them off.

| Guideline | Check |
| --- | --- |
| Never `transition: all` | lint `transition-all` |
| Honor `prefers-reduced-motion` (that something handles it) | lint `reduced-motion` |
| `font-variant-numeric: tabular-nums` for number columns | sweep `numeric-columns` |
| Interactive elements need visible focus; no `outline-none` without a replacement | sweep `focus-ring` |
| `touch-action: manipulation` | sweep `touch-action` |
| `<meta name="theme-color">` matches the page background | sweep `theme-color` |
| Avoid unwanted scrollbars; fix content overflow | sweep `hscroll`, `overflow-right` |
| Text containers handle long content | sweep `clipped`, `overlap`; lint `break-all` |
| Search inputs: `autocomplete="off"`, spellcheck off | sweep `search-input` |

## Walk by hand (judgement)

Check these over the source and the screenshots; record findings as high, medium or low.

- **Accessibility:** icon-only buttons and form controls labelled; `<button>` for actions and `<a>` for navigation, no
  click handlers on `<div>` or `<span>`; images with `alt`, decorative icons `aria-hidden`; async updates in an
  `aria-live` region; heading order and a skip link; `scroll-margin-top` on heading anchors.
- **Focus:** `:focus-visible` rather than `:focus`; `:focus-within` for compound controls; sticky headers and
  overlays don't cover the focused element.
- **Forms:** `name`, the right `type` and `inputmode`, `autocomplete` on auth fields; paste never blocked; labels
  clickable; one hit target for a checkbox and its label; errors inline, first error focused; submit enabled until the
  request starts; unsaved-changes warning.
- **Animation:** only `transform` and `opacity`; correct `transform-origin`; interruptible; long autoplay can be
  paused; every animation, not just one, respects reduced motion.
- **Typography:** `…` not `...`; curly quotes; non-breaking spaces in `10 MB` and `⌘ K`; loading labels end with `…`.
- **Content handling:** flex children with `min-w-0` where text truncates; empty strings and arrays render a real
  empty state.
- **Images:** width and height set; lazy below the fold.
- **Performance:** lists over about 50 items virtualised; no layout reads in render; fonts preloaded with
  `font-display: swap`.
- **Navigation and state:** filters, tabs and pagination in the URL; links are real links; destructive actions
  confirmed or undoable.
- **Touch:** overlays use `overscroll-behavior: contain` (the sweep sees overlays closed); `autoFocus` sparingly;
  gestures have a tap and keyboard alternative.
- **Theming:** `color-scheme` on `<html>` in dark; native `<select>` colours set.
- **Locale:** dates and numbers through `Intl`; identifiers marked `translate="no"`.
- **Hover:** hover and focus states more prominent than rest.
- **Anti-patterns:** zoom disabled (`user-scalable=no`, `maximum-scale=1`).

## Where the repo's rules win

Some guidelines are house style, not rules: Title Case for headings and buttons, placeholders ending with `…`. Where
the repo has its own rule, keep it and say so in the report.

## Server rendering

`priority` on above-the-fold images and hydration safety apply only to server-rendered apps. Check them if the app
renders on the server.
