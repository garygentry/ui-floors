# Screenshot sweep

Every page in the manifest at each width and scheme, with the layout checks; then read every screenshot, fix, and
confirm each fix.

## 1. Shoot

- Sweep a production build where you can (`--serve dist`, or the app's server in production mode). A dev server with
  hot reload works, but restart it after changes to shared packages or fonts, which hot reload can miss.
- `ui-floors sweep`, or the app's own sweep test. Screenshots and `report.json` go outside the repo's tracked files.
- A page that never reaches its ready selector is a `load` error: fix the selector or the page before reading on.

## 2. Triage each finding

Decide which of three it is:

1. **A real defect.** Fix it where the cause lives. Causes seen before: a width cap narrower than the content; chart
   label maths assuming narrower digits than the face has; `break-all`; caps in `ch` in a face with a wide zero; a
   column missing its end alignment; stacked links under 24 px; a ledger in a scroll box hiding columns on phones
   (stack its rows).
2. **Deliberate, for a reason.** Add an `ignore` entry with the reason, or `data-ui-floors-ignore` on the element.
   Examples: tables inside raw input shown as written; an ID column of digits; chart marks whose data table is in the
   DOM (WCAG 2.2's equivalent exception).
3. **Wrong: the check misreads correct UI.** Don't paper over it with exceptions across the app. Report it as a
   ui-floors bug with the page and element; until it's fixed, except it with a reason that names the bug.

Group findings by check and element before fixing anything.

## 3. Read every screenshot

Read every one at every width. With many pages, split them among parallel reviewers (sub-agents), each given the
screenshot paths and this list:

- text overprinting the next column, or cut off;
- chart labels colliding, ticks overprinting;
- words broken mid-word; IDs split at odd places;
- centred labels that should be left-aligned; misaligned headers; numbers not right-aligned;
- clipped icons; tables wider than the phone; a lone word wrapping;
- anything that differs between light and dark.

Lazy or virtualised sections show blank in full-page captures. Scroll the real page before calling them defects.
An app shell that scrolls inside a panel (`overflow: auto` under a fixed-height layout) shows only the panel's first
screen. Check a page that ends at the window's bottom edge, and scroll the panel in the real page to read the rest.

## 4. Fix, re-shoot, confirm

- Fix, then run a full second sweep: a shared fix can move other pages.
- For each fixed problem, add a `confirm` case (name, path, width, selector) and run `ui-floors confirm`. It
  screenshots the element at the width it was reported at. Read each confirm shot.

## 5. Report

The rounds, what was fixed and where, the exceptions and why, anything left and why.
