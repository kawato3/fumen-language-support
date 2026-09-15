import { SIGNS } from './catalog';

export interface NotationInsert {
  /** Stable internal name; user-facing text is localized at the VS Code boundary. */
  id: string;
  label: string;
  /** A VS Code snippet. It always ends at the final cursor position. */
  body: string;
}

export interface NotationInsertGroup {
  label: string;
  items: readonly NotationInsert[];
}

const NAVIGATION_LABELS = [
  'Segno <S>', 'Coda <Coda>', 'To Coda <to Coda>', 'Dal Segno <D.S.>',
  'Dal Segno al Coda <D.S. al Coda>', 'Dal Segno al Fine <D.S. al Fine>',
  'Da Capo <D.C.>', 'Da Capo al Coda <D.C. al Coda>',
  'Da Capo al Fine <D.C. al Fine>', 'Fine <Fine>'
] as const;

const navigationSigns: readonly NotationInsert[] = SIGNS.map((sign, index) => ({
  id: `navigation.${sign.value.slice(1, -1).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  label: NAVIGATION_LABELS[index]!,
  body: `${sign.value} $0`
}));

/**
 * A deliberately finite palette of Fumen syntax. These are editing building
 * blocks, not musical suggestions: it never chooses chord names or progressions.
 */
export const NOTATION_INSERT_GROUPS: readonly NotationInsertGroup[] = [
  {
    label: 'Structure and bars',
    items: [
      { id: 'structure.measure-boundary', label: 'Bar line (|)', body: '| $0' },
      { id: 'structure.double-bar', label: 'Double bar (||)', body: '|| $0' },
      { id: 'structure.final-bar', label: 'Final bar (||.)', body: '||. $0' },
      { id: 'structure.repeat-start', label: 'Repeat start (||:)', body: '||: $0' },
      { id: 'structure.repeat-end', label: 'Repeat end (:||)', body: ':||$0' },
      { id: 'structure.repeat-end-with-count', label: 'Repeat end with count (:||x3)', body: ':||x${1:3}$0' },
      { id: 'structure.repeat-boundary', label: 'Repeat end and start (:||:)', body: ':||: $0' },
      { id: 'structure.measure-repeat', label: 'Measure repeat (./|/.)', body: './|/. $0' },
      { id: 'structure.section', label: 'Section label ([A])', body: '[${1:A}]$0' },
      { id: 'structure.time-signature', label: 'Time signature ((4/4))', body: '(${1:4}/${2:4}) $0' },
      { id: 'structure.left-alignment', label: 'Left-aligned row (<)', body: '<$0' },
      { id: 'structure.right-alignment', label: 'Right-aligned row (>)', body: '>$0' },
      { id: 'structure.four-bars', label: 'Four measures (editable)', body: '| ${1} | ${2} | ${3} | ${4} |\n$0' },
      { id: 'structure.eight-bars', label: 'Eight measures (editable)', body: '| ${1} | ${2} | ${3} | ${4} |\n| ${5} | ${6} | ${7} | ${8} |\n$0' },
      { id: 'structure.repeat-endings', label: 'Alternate endings (editable)', body: '||: ${1} | ${2} | [1.] ${3} | ${4} :||\n>| [2.] ${5} | ${6} ||.\n$0' }
    ]
  },
  { label: 'Navigation signs', items: navigationSigns },
  {
    label: 'Rhythm',
    items: [
      { id: 'rhythm.duration', label: 'Duration (:4)', body: ':${1|1,2,4,8,16,32,64,2.,4.,8.,16.|}$0' },
      { id: 'rhythm.rest', label: 'Rest (r:4)', body: 'r:${1|1,2,4,8,16,32,64,2.,4.,8.,16.|}$0' },
      { id: 'rhythm.multi-measure-rest', label: 'Multi-measure rest (-2-)', body: '-${1:2}-$0' },
      { id: 'rhythm.syncopation', label: 'Syncopation (<:16)', body: '<:${1:16} $0' }
    ]
  },
  {
    label: 'Text',
    items: [
      { id: 'text.annotation', label: "Annotation ('text'@)", body: "'${1:annotation}'@ $0" },
      { id: 'text.lyrics', label: 'Lyrics (`lyrics`@)', body: '`${1:lyrics}`@ $0' },
      { id: 'text.chord-row', label: 'Text on chord row ("text")', body: '"${1:text}" $0' }
    ]
  },
  {
    label: 'Score settings',
    items: [
      { id: 'settings.title', label: 'Title (%TITLE)', body: '%TITLE="${1:Song title}"$0' },
      { id: 'settings.artist', label: 'Artist (%ARTIST)', body: '%ARTIST="${1:Artist}"$0' },
      { id: 'settings.key', label: 'Key (%KEY)', body: '%KEY="${1:C}"$0' },
      { id: 'settings.staff-visibility', label: 'Staff visibility (%SHOW_STAFF)', body: '%SHOW_STAFF="${1|YES,NO,AUTO|}"$0' }
    ]
  }
];
