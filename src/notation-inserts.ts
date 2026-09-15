import { SIGNS } from './catalog';

export interface NotationInsert {
  /** Stable internal name; user-facing text is localized at the VS Code boundary. */
  id: string;
  label: string;
  description: string;
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
  description: sign.description,
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
      { id: 'structure.measure-boundary', label: 'Measure boundary |', description: 'Insert a bar line at the cursor.', body: '| $0' },
      { id: 'structure.double-bar', label: 'Double bar ||', description: 'Insert a double bar line.', body: '|| $0' },
      { id: 'structure.final-bar', label: 'Final bar ||.', description: 'Insert a final bar line.', body: '||. $0' },
      { id: 'structure.repeat-start', label: 'Repeat start ||:', description: 'Insert the start of a repeat.', body: '||: $0' },
      { id: 'structure.repeat-end', label: 'Repeat end :||', description: 'Insert the end of a repeat.', body: ':||$0' },
      { id: 'structure.repeat-end-with-count', label: 'Repeat end with count', description: 'Insert a repeat end and edit its count.', body: ':||x${1:3}$0' },
      { id: 'structure.repeat-boundary', label: 'Repeat end and start :||:', description: 'Insert the end and start of a repeat.', body: ':||: $0' },
      { id: 'structure.measure-repeat', label: 'Measure repeat ./|/.', description: 'Repeat the preceding measure.', body: './|/. $0' },
      { id: 'structure.section', label: 'Section label', description: 'Insert a section label outside a measure.', body: '[${1:A}]$0' },
      { id: 'structure.time-signature', label: 'Time signature', description: 'Insert an editable numerator and denominator.', body: '(${1:4}/${2:4}) $0' },
      { id: 'structure.left-alignment', label: 'Left-aligned row <', description: 'Insert the left-alignment marker at a row start.', body: '<$0' },
      { id: 'structure.right-alignment', label: 'Right-aligned row >', description: 'Insert the right-alignment marker at a row start.', body: '>$0' },
      { id: 'structure.four-bars', label: '4 bars', description: 'Insert four editable measures.', body: '| ${1} | ${2} | ${3} | ${4} |\n$0' },
      { id: 'structure.eight-bars', label: '8 bars', description: 'Insert two rows of four editable measures.', body: '| ${1} | ${2} | ${3} | ${4} |\n| ${5} | ${6} | ${7} | ${8} |\n$0' },
      { id: 'structure.repeat-endings', label: 'First and second endings', description: 'Insert a repeat with editable alternate endings.', body: '||: ${1} | ${2} | [1.] ${3} | ${4} :||\n>| [2.] ${5} | ${6} ||.\n$0' }
    ]
  },
  { label: 'Navigation signs', items: navigationSigns },
  {
    label: 'Rhythm',
    items: [
      { id: 'rhythm.duration', label: 'Duration', description: 'Choose a note duration, including dotted values.', body: ':${1|1,2,4,8,16,32,64,2.,4.,8.,16.|}$0' },
      { id: 'rhythm.rest', label: 'Rest', description: 'Insert a rest and choose its duration.', body: 'r:${1|1,2,4,8,16,32,64,2.,4.,8.,16.|}$0' },
      { id: 'rhythm.multi-measure-rest', label: 'Multi-measure rest', description: 'Insert a rest spanning an editable number of measures.', body: '-${1:2}-$0' },
      { id: 'rhythm.syncopation', label: 'Syncopation', description: 'Insert a syncopation duration before the following chord.', body: '<:${1:16} $0' }
    ]
  },
  {
    label: 'Text',
    items: [
      { id: 'text.annotation', label: 'Annotation above chord', description: 'Insert text attached above the following chord.', body: "'${1:annotation}'@ $0" },
      { id: 'text.lyrics', label: 'Lyrics', description: 'Insert lyrics attached below the following chord.', body: '`${1:lyrics}`@ $0' },
      { id: 'text.chord-row', label: 'Text on chord row', description: 'Insert text at the same height as chords.', body: '"${1:text}" $0' }
    ]
  },
  {
    label: 'Score settings',
    items: [
      { id: 'settings.title', label: 'Title setting', description: 'Insert the score title setting.', body: '%TITLE="${1:Song title}"$0' },
      { id: 'settings.artist', label: 'Artist setting', description: 'Insert the artist setting.', body: '%ARTIST="${1:Artist}"$0' },
      { id: 'settings.key', label: 'Key setting', description: 'Insert the original key setting.', body: '%KEY="${1:C}"$0' },
      { id: 'settings.staff-visibility', label: 'Staff visibility', description: 'Choose whether to show the staff.', body: '%SHOW_STAFF="${1|YES,NO,AUTO|}"$0' }
    ]
  }
];
