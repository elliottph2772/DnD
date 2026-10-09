import { useMemo, useState } from 'react';
import {
  blankDraft,
  buildCharacter,
  draftCasts,
  stepComplete,
  type Draft,
} from '../../lib/chargen';
import type { Character } from '../../types';
import StepClass from './StepClass';
import StepName from './StepName';
import StepRace from './StepRace';
import StepReview from './StepReview';
import StepScores from './StepScores';
import StepSpells from './StepSpells';
import styles from './Wizard.module.css';

/** Headings, verbatim from docs/UI-SPEC.md. */
const HEADINGS = [
  'What do you fight as?',
  'Where do you come from?',
  'What are you called?',
  'What are you made of?',
  'What magic do you carry?',
  'Ready?',
] as const;

const FIRST = 1;
const SPELLS = 5;
const LAST = 6;

/**
 * The six-step character wizard. Step 5 is skipped for a class that does not
 * cast, so a Fighter walks five steps and the counter says "of 5" — UI-SPEC:
 * "Step N of 6 (5 for non-casters)".
 *
 * The draft lives here and nowhere else. Nothing reaches the store until
 * "Take the field", so a half-built character is never written to the seat.
 */
export default function Wizard({
  character,
  onDone,
}: {
  character: Character;
  onDone: (next: Character) => void;
}) {
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [step, setStep] = useState(FIRST);

  const casts = draftCasts(draft);
  const total = casts ? 6 : 5;

  // Takes an updater as well as a plain patch: a step that derives its next
  // value from the current one (the point-buy dials) must read the draft
  // inside the updater, or two clicks in one React batch both compute from the
  // same snapshot and the second silently overwrites the first.
  const patch = (next: Partial<Draft> | ((d: Draft) => Partial<Draft>)) =>
    setDraft((d) => ({ ...d, ...(typeof next === 'function' ? next(d) : next) }));

  // The step number shown to the player: the spell step is missing for a
  // non-caster, so step 6 of 6 would otherwise read as "6 of 5".
  const shown = useMemo(() => (!casts && step === LAST ? SPELLS : step), [casts, step]);

  const ok = stepComplete(draft, step);
  const onLast = step === LAST;

  const back = () => {
    if (step === FIRST) return;
    setStep(!casts && step === LAST ? SPELLS - 1 : step - 1);
  };

  const next = () => {
    if (!ok) return;
    if (onLast) {
      onDone(buildCharacter(draft, character));
      return;
    }
    // Jump the spell step for a class with no spells to pick.
    setStep(!casts && step === SPELLS - 1 ? LAST : step + 1);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <h2 className={styles.heading}>{HEADINGS[step - 1]}</h2>
        <span className={styles.counter}>
          Step {shown} of {total}
        </span>
      </div>

      {step === 1 && <StepClass draft={draft} patch={patch} />}
      {step === 2 && <StepRace draft={draft} patch={patch} />}
      {step === 3 && <StepName draft={draft} patch={patch} onEnter={next} />}
      {step === 4 && <StepScores draft={draft} patch={patch} />}
      {step === 5 && <StepSpells draft={draft} patch={patch} />}
      {step === 6 && <StepReview draft={draft} />}

      <div className={styles.nav}>
        <button
          type="button"
          className="btn btn-secondary tap"
          onClick={back}
          disabled={step === FIRST}
        >
          Back
        </button>
        <button type="button" className="btn btn-primary tap" onClick={next} disabled={!ok}>
          {onLast ? 'Take the field' : 'Next'}
        </button>
      </div>
    </div>
  );
}
