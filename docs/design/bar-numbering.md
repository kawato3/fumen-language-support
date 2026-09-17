# Performance-order bar numbers

## Contract

`%PARAM={"bar_number":"on"}` enables this extension-specific renderer feature.
The default is `"off"`; every value other than the exact string `"on"` disables
it. Numbers count **performed bars**, not unique bars in the source. Counting
starts at `bar_start` (default `1`), continues across rehearsal groups and pages,
and never resets when the display is temporarily disabled. A pickup counts as
one bar; there is no automatic pickup detection. `bar_start: 0` can label it zero.

`bar_start` accepts any safe integer, including zero and negative numbers. Values
outside -9,007,199,254,740,991 through 9,007,199,254,740,991, fractional numbers and
non-number types fall back to 1 without coercion. The renderer reads the effective
setting at the first source measure, falling back to the renderer/global parameter
when that measure has no `bar_start` member. It passes the value once to
`numberBars(measures, start = 1)`, which owns validation and counter initialization.
Later settings, even on the same rendered row, do not change the starting value;
repeat/jump visits continue counting rather than reapplying it. `bar_start` does
not enable numbering by itself. Counter-overflow and traversal limits are unchanged.

Only the first measure of each **rendered row** receives a label. Repeated visits
produce an ordered comma-separated label such as `11,19`. The label is small,
right-aligned just left of the first boundary, with its top aligned to the top of
that boundary. It uses the existing margin, without changing row widths, wrapping,
page breaks or rehearsal-mark positions. Excessively wide numbers need not fit.
Row-local PARAM settings govern visibility. Inline rehearsal names do not create
extra labels; right-aligned rows and generated fixed-measure rows use their actual
rendered start. Preview and vector printing use the same renderer.

## Traversal rules

- A normal measure, including an empty measure or a simile, advances by one.
  A long rest `-N-` advances by N; its label is the first bar of the rest, not a
  list of all bars inside it. Invalid/non-positive/unsafe rest lengths stop counting.
- An ordinary repeat has two passes; `xN` specifies the total number of passes,
  including the first. Positive safe integers are required. Paired nested repeats
  and the shared end/start boundary `:||:` are supported. An initial repeat end
  without a start returns to the beginning of the score. Ambiguous overlapping or
  unmatched repeat structures stop counting rather than inventing a route.
- Numbered endings accept positive integers, optional periods, comma-separated
  lists and inclusive ranges (`[1.]`, `[1,3.]`, `[2-3.]`). Read the original ending
  text: upstream's integer helper does not expand ranges. Endings belong to the
  innermost repeat, optionally with a final ending immediately after its end.
  Skipping an ending must still process its repeat boundary. A trailing final
  ending must include the final pass. Unassociated or non-numeric endings stop
  counting before that measure. Arbitrary prose is never interpreted.
- D.S. returns to its matching numbered/unnumbered Segno; D.C. returns to the
  first measure. Each jump instruction is taken once. On returning, repeats are
  skipped and final endings selected, unless the destination Segno explicitly
  says `with repeat`. `straight` explicitly selects the default behavior.
  A `with repeat` jump into the middle of a repeat is ambiguous and stops counting.
- `al Fine` stops at Fine on the return journey. `al Coda` enables only the
  matching To Coda, which jumps to a unique later Coda. A bare D.S./D.C. permits
  either Fine or To Coda on return. The transfer is consumed upon reaching the
  Coda: later To Coda signs do not trigger another transfer from that return
  instruction. Fine can end the coda section. Before a return journey, Fine is ignored when
  jump instructions exist; without any jump instructions it ends counting.
  An ordinary final barline is not a navigation instruction.
- Missing/duplicate destinations, conflicting navigation instructions and
  unsupported repeat structures stop counting at the point they matter. They do
  not prevent ordinary rendering. An unreachable malformed measure does not
  invalidate an already established route.
- At the first reached `:||xX`, retain the numbers established up to that boundary,
  then stop: do not invent a repeat count or number subsequent bars. Earlier labels
  can therefore contain only their known visits, not every possible future visit.
  This is an expected partial result, not a notation error.

## Architecture and limits

Add an independent, DOM-free `src/renderer/bar_numbering.mjs` to the reusable
upstream patch. It consumes Fumen measure nodes without changing them and returns
per-measure number arrays plus one optional structured stop reason. It does not
play audio, consult the clock, cache between renders or modify the parser.
The existing Babel loader also processes this `.mjs` file; the source remains
directly testable by Node while the distribution uses the same transpilation as
the rest of Fumen.

Preprocessing separates errors in route selection (unpaired repeats or ambiguous
ending selectors) from errors inside a measure. Traversal validates the selector,
chooses the ending, and only then validates the content of the selected measure.
This keeps unreachable content from invalidating a known route without allowing
an ambiguous selector to skip its own error.

A return journey retains its requested destination and an explicit phase:
`return` before the To Coda transfer and `coda` after it. Consuming that transfer
changes the phase, not the instruction's meaning. Nested-repeat resets use an
iterative stack of child iterators: no recursion, eager subtree copy or spreading
of input-sized arrays into function arguments. Each visited child consumes the
same control-work budget as the traversal.

The renderer calls it once after constructing rows, only if at least one row has
`bar_number === "on"`. It keeps the result local to that render, draws row labels
through Fumen's existing text helper, and returns an optional `barNumbering` status.
Existing renderer calls and drawing are unchanged while the feature is disabled.
The extension translates stop statuses into a non-blocking preview/print status;
status text is not printed into the score. Standalone consumers can inspect the
same render result without a VS Code dependency.

Prepare repeat and navigation lookups once; walk one deterministic route, not
every possible route. Limit traversal to 10,000 measure/control steps, including
ending-range comparisons and resets of nested repeat state. Limit
counter arithmetic to safe integers. These bounds apply to numbering, not the
score renderer. No timer-only guard (synchronous work could block that timer),
cross-render cache, new dependency or user-facing tuning switch is needed.
Preprocessing is proportional to the source nodes and ending text. Traversal work
and retained visit numbers are bounded by the step limit. Performance claims must
be checked after implementation.

The existing obsolete Sequencer is not reused: it is not exported and uses the old
track structure. The existing parser already provides the required symbols;
upstream engraving, parsing and chord-quality behavior stay out of scope.

Sources checked against the pinned Fumen 1.3.3 source:
[structure](https://hbjpn.github.io/fumen/structure/),
[repeat signs](https://hbjpn.github.io/fumen/repeat-sign/),
`src/parser/parser.js`, `src/common/common.js`, `src/renderer/default_renderer.js`
and the obsolete `src/sequencer/sequencer.js`. No dependency upgrade is required.

## Test scenarios

Use table-driven pure traversal tests with explicit expected numbers for every
source measure. Fixtures must not calculate their own expected answers. Then use
the real bundled parser/renderer in Chrome to prove the adapter and placement;
do not test Fumen's unrelated engraving quality.

| ID | Scenario | Required evidence |
| --- | --- | --- |
| N01 | Straight score, groups, blanks, rests, pickup, simile | Starts at 1; continues without resets; long rest adds N |
| N02 | Ordinary, x1, x3 repeats | Exact per-measure visit numbers and following number |
| N03 | Initial implicit start, shared end/start, nested repeats | Correct independent passes; no duplicate boundary handling |
| N04 | First/second endings, lists and ranges | Skipped bars not counted; repeat control still executes |
| N05 | D.C./D.S. with Fine or Coda, numbered targets, bare jumps | First pass and return order, one-shot jumps/transfers, Fine after Coda, correct termination |
| N06 | Returns with straight/with repeat; final ending selection | Explicitly different visit numbers; no accidental repeat reset |
| N07 | xX at row end, inside repeat, skipped branch | Stops only when reached; known prefix retained |
| N08 | Invalid counts, free-text/unassociated/ambiguous endings, missing/duplicate targets | Stable stop reason; no fabricated later numbers; unplayed content does not stop a valid route |
| N09 | Extreme repetition, unsafe counters, wide skipped repeat subtrees | Bounded work; no infinite loop, large numeric-range allocation or argument-stack overflow |
| N10 | Multiple calls using the same input | No mutation, retained state or cache |
| N11 | Zero, negative and positive starts; invalid types; safe integer boundaries | Start applied once across repeats, return jumps and rests; invalid values use 1; overflow stops |
| R01 | Missing/off/invalid setting | Identical existing drawing; no numbering status/work |
| R02 | Row starts, inline groups, right alignment, generated rows, page breaks | Exactly one label per actual row with the correct visit list |
| R03 | Staff/no staff, repeat start, rehearsal mark, comment, Segno | Right/top alignment; labels left of boundaries, no layout change |
| R04 | Local on/off/on settings; repeated renders | Visibility only; continuous count; old labels/status cleared |
| R05 | Partial or stopped numbering | Score still renders; English/Japanese status explains omission |
| R06 | Custom start, first-measure scope, later settings, invalid values, hidden first row | Actual labels honor the start; no reset; bar_start alone does not enable numbering |
| P01 | Chrome vector replay | Labels survive replay; original and replayed canvas agree |
| C01 | Existing chord labels, formatter, packaging and patch identity | Existing contracts remain valid; standalone patch matches bundle |
| L01 | Long realistic score and pathological repeat | Report measured numbering time separately from rendering; verify cap |

## Delivery boundary

Implement and test locally. Update English/Japanese user help and reusable-patch
documentation. Do not bump the release version, create a VSIX, install into the
user's VS Code, commit, push, tag or publish as part of this implementation.
Retain the old published patch content; new cumulative patch content is prepared
under the next planned extension version and only published with that release.

## Verification record

Local verification on macOS, 2026-09-17:

- RED: traversal fixtures initially returned no numbers; the real renderer did
  not draw `1,3` / `5`; the print page did not report an indefinite repeat.
  Each failed for the missing behavior before its corresponding implementation.
- Pure traversal: 62 cases in the applied patch's `test/bar-numbering.test.mjs`.
  Additional regression cases cover an ending at a new repeat start, a return
  inside an enclosing repeat, a long ending list consuming the control budget,
  consumed Coda transfers, unreachable content errors, ambiguous ending selectors
  a skipped subtree containing 130,000 child repeats, and configurable starting
  numbers including zero, negative values, invalid types and integer boundaries.
- `npm run check`: TypeScript/build checks and 92 unit cases passed.
- Chrome browser suites (chord labels, bar numbers and vector printing):
  49 cases passed, including custom starts, English/Japanese notices and exact vector replay.
- Isolated VS Code 1.90.0 integration: 21 cases passed, including partial-numbering
  status and recovery after repair. The ordinary user profile was not modified.
- Applied the cumulative patch to a fresh pinned upstream checkout; `git apply
  --check` passed, the resulting distribution matched the extension byte-for-byte,
  and both the traversal tests and the standalone chord-label tests passed.
- Parsed 15 fenced user-help examples and validated 54 local documentation links.
  Visually inspected `docs/examples/bar-numbers.fumen`: expected row labels are
  `1,9`, `5,13`, `15`, `17,21`, `19`, `23`, with no displacement of score elements.
- A local Node benchmark (100 measured runs after warm-up) on 1,024 source bars /
  2,048 performed bars had approximately 0.17 ms median and 0.28 ms p95 for numbering
  alone. This is not a cross-device guarantee or an end-to-end rendering benchmark.
  Extreme repetition stops at the configured control-work limit.

A strict design-based review, including one independent traversal review, found
and repaired three defects: a consumed Coda transfer re-enabled unrelated transfers;
content validation ran before ending selection; and an eager descendant spread
could throw before the traversal limit. Each regression failed before the repair.
The structural fixes are explicit journey phases, separate entry/content errors,
and budgeted lazy descendant iteration. Browser regressions use the real parser;
their label matcher distinguishes row-start numbers from numbered Coda symbols.
The review also checked renderer placement/defaults, preview/print status lifecycle,
localization, vector replay and standalone-patch identity. No upstream parser or
unrelated engraving changes were needed.

The `bar_start` addition was also tested RED before implementation: pure traversal,
actual row labels and vector replay all still started at 1. Initialization now
accepts a validated signed integer once per render, without changing navigation,
repeat passes or the amount of traversal work.

Existing engraving and chord-label tests were retained; no assertions were removed
to accommodate numbering. Windows/Linux execution and a physical print/PDF viewer
check were not performed; Chrome's actual Canvas recording/replay path was tested.
