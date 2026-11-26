# UI and usability review

## Scope and approach

The redesign keeps every existing print option, default, calculation, file limit,
job transition, recovery rule, printer listing, filter, map interaction and study
control. It changes presentation and adds explanatory copy. No runtime library,
web font, external image request, animation framework or service was added.
The decorative printer banner is replaced with a compact page heading and a
three-step workflow guide. The guide describes the process; it does not lock
users into a wizard or introduce a new step.

The requested **ui-ux-pro-max** and **hci** skills informed the design. The first
design-system search returned university/portfolio guidance that did not fit a
printing utility. A narrower document-utility search returned Minimalism & Swiss
Style. Its restrained grid and hierarchy informed the result; its marketing-page
recipe was not appropriate for this workspace. The final system uses locally
available system fonts, warm neutral surfaces, a dark green action color, small
corner radii and the existing Lucide icons. No decorative motion was added.

## Course sources

- **Week14.2-Lecture21.pdf**, pp. 12–15: the ten heuristics and timely feedback;
  pp. 22, 28: familiar language; pp. 30, 38: user control; pp. 39, 48:
  consistency; pp. 50, 57: prevention; pp. 59–64: recognition.
- **Week15.1-Lecture22.pdf**, pp. 9, 14: flexibility and efficiency;
  pp. 16, 23: relevance and high signal-to-noise ratio; pp. 25, 30–32:
  constructive errors; pp. 34, 41: concise, task-focused help.
- Lecture 22 p. 23 suggests pruning non-core features. This redesign retains all
  features because the project instruction explicitly requires preservation.
- These two supplied lectures do not define the 5Es. The checklist below uses
  [Whitney Quesenbery's original framework](https://www.wqusability.com/articles/5es-upa2003.pdf).
  Nielsen's wording is cross-checked against the
  [Nielsen Norman Group source](https://www.nngroup.com/articles/ten-usability-heuristics/).

The PDFs remain in the parent HCI workspace rather than being copied into the
repository. Page references above are PDF page numbers.

## Five Es: design support and evaluation tasks

| Goal | Design support | What to observe in a participant session |
| --- | --- | --- |
| Effective | Document identity, actual preview, physical-sheet count and review summary remain visible and consistent. | Configure the 12-page handout as A4, portrait, black and white, long-edge duplex, four pages per side. Verify two physical sheets and the blank back before submitting. Record correct completion. |
| Efficient | Compact heading prioritizes controls. Desktop output count and review action appear above the preview, alongside settings. Copies support both typing and stepper controls. | Record time, unnecessary navigation and corrections for the same task. Compare to the original with equivalent tasks and counterbalanced order. |
| Engaging | Restrained colors, legible type, stable controls and direct copy suit a campus utility. | Ask users to rate comfort and clarity after completion; record their explanation. A visual preference is not evidence of task success. |
| Error tolerant | Inline errors, visible invalid fields, review blocking, edit/cancel exits and safe job recovery remain. New hints explain disabled page order and custom-range syntax. | Enter an invalid range and zero copies, then recover without losing other settings. Check the unconfirmed job without creating a duplicate. |
| Easy to learn | The workflow is visible. Help has a text label. Duplex descriptions explain how paper turns, and selection controls retain familiar names. | Observe first use without coaching. Ask the user to explain the difference between a source page, a printed side and a physical sheet. |

## Nielsen's ten heuristics

| Heuristic | Implementation or retained protection |
| --- | --- |
| 1. Visibility of system status | Existing document-loading feedback, reactive preview/counts, selected controls, navigation state and job status are retained. |
| 2. Match with the real world | Paper sizes, portrait/landscape, copies and front/back remain familiar. Added long-edge/book and short-edge/notepad explanations describe the physical action. |
| 3. User control and freedom | File changes, editable settings, collapsible layout section, dialog close/Escape, return to jobs and browser Back/Forward remain available. |
| 4. Consistency and standards | Shared colors, type, spacing, controls and focus rings across workspace, dialogs, jobs, map and directory. Native form controls remain. |
| 5. Error prevention | Original range/copy validation, crop warnings, review-before-submit, duplicate guard and restricted retry behavior remain unchanged. |
| 6. Recognition rather than recall | Selected document, labeled navigation, visible workflow, preview controls, file names and job IDs provide context. Help has both an icon and a word. |
| 7. Flexibility and efficiency | Every paper, duplex, color, orientation, layout, reading-order, range and scaling option remains. Desktop side-by-side and mobile settings/preview switching are retained. |
| 8. Aesthetic and minimalist design | Decorative illustration, gradient banner and preview background grid are replaced with plain surfaces. The interface prioritizes the document, settings, output and next action. |
| 9. Recognize, diagnose and recover | Existing specific file/range/copy errors remain; invalid fields receive a distinct border/background, and custom-range examples explain a correction. Unconfirmed jobs still guide receipt checks before resending. |
| 10. Help and documentation | Labeled Help, duplex hints, disabled page-order explanation, range example, preview legend, job recovery guidance and official ICTO links remain at their points of use. |

## Preservation checklist

- PDF/JPEG/PNG opening; five samples; existing PDF/image/file limits and errors.
- A4/A3/US Letter; portrait/landscape; color/grayscale; one-sided and both duplex
  edges; 1–99 copies; all six pages-per-side options; all four reading orders;
  all/current/custom page selection; fit/actual-size scaling.
- Original-page and physical-sheet previews; front/back; sheet/page navigation;
  binding, numbering, margin, crop, mixed-size and resolution feedback.
- Review/edit/submit; all simulated outcomes; session records; recheck, known
  failure retry, duplicate prevention, receipt details and recovery help.
- Directory search; payment and hours filters; actual/demo data modes; student
  allocation; map/list switching; heatmap, zoom/pan/keyboard controls; station
  details, sources and official map links; optional operator status feed.
- Study outcomes and reset; responsive navigation; keyboard focus; modal focus
  restoration and Escape; skip link; existing local-file privacy boundaries.

## Verification and limits

- TypeScript and Vite production build: passed.
- Existing unit tests: **21 passed**.
- Existing browser suite, sequential Chrome: **20 passed**, including automated
  WCAG A/AA checks for the workspace, review, recovery, printer finder and station details.
- After the final workspace layout refinement: **7 relevant browser tests passed**
  again, covering preview geometry, mobile/tablet/desktop submission, interrupted
  jobs, validation recovery and workspace/review/recovery accessibility.
- Responsive overflow checks: workspace at 320, 390, 768, 1024 and 1440 CSS pixels;
  directory at 320, 390, 768, 1024 and 1440; landscape at 844 × 390. Reduced-motion
  rendering and skip-link availability were also checked.
- Screenshots: `workspace.png`, `workspace-mobile.png`, `review-job.png`,
  `print-jobs.png` and `printer-directory.png` in this folder. No new runtime dependencies.

Engineering checks and browser screenshots assess regressions and layout. They
do not establish that the five Es have been achieved for real students. The
course's recommendation for several independent human evaluators and task-based
user testing remains applicable. No participant evidence or performance claim
is invented here.

Browser tests default to **one worker** to reduce peak memory. No background
agents or additional browser installation are needed when an installed Chrome
is provided through `PLAYWRIGHT_EXECUTABLE_PATH`.

## Guided help and multilingual update

Help now starts with four steps: choose a document, set up the printout, inspect
both sides, and review/submit. A small front/back diagram numbers eight source
pages across one sheet. An equivalent text description explains the diagram to
screen-reader users. This supports recognition, real-world mapping and help at
the point of use (Nielsen 2, 6 and 10; Easy to learn and Effective).

The header offers English, Traditional Chinese (`zh-Hant`) and European
Portuguese (`pt-PT`). The language choice is stored locally, is optional when
storage is unavailable, and updates the document language and page title.
Switching language does not remount the app or reset the current task. The
translation layer changes presentation; the layout, file validation, job state,
directory records and simulation rules remain intact. Directory search also
matches the translated building/room labels in the selected language.

The catalogue covers controls, accessible names, explanatory text, validation,
status and recovery, printer hours/payment/source labels, and interpolated
counts. Document contents, filenames, IDs and geographic/room codes remain
original. No translation service, runtime library, external font or network
request was added.

Additional verification: **24 unit tests passed**, including interpolation and
translation switching, and **25 browser checks passed** across the existing and
new suites. The new checks cover each language's help and review accessibility,
320–1440 px overflow, validation messages, retained draft settings and IDs,
remembered language, and translated directory search. The static catalogue
audit reports **428 translated entries** with no missing static UI messages.

## Responsiveness fixes

Two failure paths were reproduced independently:

1. **Stale modal state and scroll lock.** Closing the native dialog outside
   React's own buttons left React's dialog state active and `body` scrolling
   locked. Cleanup also ran after the modal DOM had been detached. Dialogs now
   synchronize native close events with application state, release their scroll
   lock exactly once, and close before DOM removal. Close, Escape, backdrop,
   navigation and native dismissal retain their normal behavior and focus return.
2. **Idle timer loop with stale session data.** A completed job could retain an
   old reply object in saved session data. The timer kept scheduling that past
   reply immediately, while the resolver correctly ignored already completed
   jobs, causing repeated updates indefinitely. The scheduler now considers
   only jobs still submitting. Timeout values are also bounded to prevent a
   far-future timestamp overflowing into a rapid timer loop. Existing jobs and
   their IDs are preserved; normal simulator replies still take 850 ms.

Regression checks cover native dismissal followed by actual wheel scrolling and
reopening, repeated mobile/desktop dismissal and navigation, five simulated idle
minutes in each main view, resume notifications, and stale completed-job reply
data. The old code failed both the native-close and stale-reply checks. The
stale-reply reproduction caps the broken timer after eight callbacks to avoid
stressing the test PC. A clean-session idle check did not reproduce a separate
idle failure; these findings do not establish what was stored in the user's
browser when their freeze occurred.

After these fixes: **30 browser tests passed**, **24 unit tests passed**, and the
TypeScript/Vite production build passed. All browser tests ran with one worker.
