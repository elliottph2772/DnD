// The 13 PHB backgrounds, converted from the prototype's BACKGROUNDS map.
// Skills are stored as the prototype stores them — a comma-joined string —
// because Character.skills is a string, not an array (see DECISIONS.md).

export interface BackgroundDef {
  name: string;
  /** Comma-joined, to match `Character.skills`. */
  skills: string;
  gear: string;
}

export const BACKGROUNDS: readonly BackgroundDef[] = [
  { name: 'Acolyte', skills: 'Insight, Religion', gear: 'Holy symbol, prayer book, 5 sticks of incense, vestments' },
  { name: 'Charlatan', skills: 'Deception, Sleight of Hand', gear: 'Forgery kit, con tools, fine clothes' },
  { name: 'Criminal', skills: 'Deception, Stealth', gear: 'Crowbar, dark hooded clothes, gaming set' },
  { name: 'Entertainer', skills: 'Acrobatics, Performance', gear: "Instrument, costume, an admirer's favour" },
  { name: 'Folk Hero', skills: 'Animal Handling, Survival', gear: "Artisan's tools, shovel, iron pot" },
  { name: 'Guild Artisan', skills: 'Insight, Persuasion', gear: "Artisan's tools, letter of introduction" },
  { name: 'Hermit', skills: 'Medicine, Religion', gear: 'Herbalism kit, scroll of private notes, winter blanket' },
  { name: 'Noble', skills: 'History, Persuasion', gear: 'Signet ring, scroll of pedigree, fine clothes' },
  { name: 'Outlander', skills: 'Athletics, Survival', gear: 'Staff, hunting trap, a trophy from a kill' },
  { name: 'Sage', skills: 'Arcana, History', gear: 'Ink, quill, small knife, a letter with an unanswered question' },
  { name: 'Sailor', skills: 'Athletics, Perception', gear: 'Belaying pin, 50 ft silk rope, lucky charm' },
  { name: 'Soldier', skills: 'Athletics, Intimidation', gear: 'Insignia of rank, trophy from a fallen enemy, dice set' },
  { name: 'Urchin', skills: 'Sleight of Hand, Stealth', gear: 'Small knife, city map, pet mouse, token of your parents' },
];

export const backgroundByName = (name: string): BackgroundDef | null =>
  BACKGROUNDS.find((b) => b.name === name) ?? null;
