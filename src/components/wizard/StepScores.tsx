import { classByName } from '../../data/classes';
import { raceByName } from '../../data/races';
import {
  ABILITIES,
  abilityMod,
  acFor,
  canLower,
  canRaise,
  finalScores,
  maxHpFor,
  PB_BUDGET,
  pointsLeft,
  racialBonuses,
  type Draft,
  type Patch,
} from '../../lib/chargen';
import type { Ability } from '../../types';
import styles from './Wizard.module.css';

const signed = (n: number): string => (n >= 0 ? `+${n}` : String(n));

/**
 * Step 4 — "What are you made of?"
 * Point buy across 27 points, 8 to 15, with the racial increase shown beside
 * each dial so the player sees the score they will actually play.
 */
export default function StepScores({
  draft,
  patch,
}: {
  draft: Draft;
  patch: Patch;
}) {
  const race = raceByName(draft.race);
  const cls = classByName(draft.cls);
  const bonus = racialBonuses(race, draft.asiPicks);
  const final = finalScores(draft.scores, race, draft.asiPicks);
  const left = pointsLeft(draft.scores);

  // Read the scores inside the updater, not from the render that made this
  // handler: two taps landing in one React batch would otherwise both compute
  // from the same snapshot and the second would undo the first.
  const nudge = (ability: Ability, by: 1 | -1) =>
    patch((d) => {
      const ok = by === 1 ? canRaise(d.scores, ability) : canLower(d.scores, ability);
      if (!ok) return {};
      return { scores: { ...d.scores, [ability]: d.scores[ability] + by } };
    });

  return (
    <div className={styles.body}>
      <div className={styles.budget}>
        <span className="label">Points left</span>
        <span className={left === 0 ? styles.budgetDone : styles.budgetSpent}>
          <span className="num">{left}</span> of <span className="num">{PB_BUDGET}</span>
        </span>
      </div>

      <div className={styles.scores}>
        {ABILITIES.map((ability) => {
          const base = draft.scores[ability];
          const add = bonus[ability] ?? 0;
          return (
            <div key={ability} className={styles.score}>
              <span className={styles.scoreName}>{ability}</span>
              <button
                type="button"
                className={styles.step}
                aria-label={`Lower ${ability}`}
                disabled={!canLower(draft.scores, ability)}
                onClick={() => nudge(ability, -1)}
              >
                −
              </button>
              <span className={styles.scoreValue}>{base}</span>
              <button
                type="button"
                className={styles.step}
                aria-label={`Raise ${ability}`}
                disabled={!canRaise(draft.scores, ability)}
                onClick={() => nudge(ability, 1)}
              >
                +
              </button>
              <span className={styles.scoreTotal}>
                {add > 0 && <span className={styles.bonus}>+{add} </span>}
                {final[ability]} ({signed(abilityMod(final[ability]))})
              </span>
            </div>
          );
        })}
      </div>

      {cls && (
        <p className={styles.hint}>
          That gives <span className="num">{maxHpFor(cls, race, final.CON)}</span> hit points and AC{' '}
          <span className="num">{acFor(cls, final)}</span>.{' '}
          {cls.primary.length > 0 && `A ${cls.name} leans on ${cls.primary.join(' and ')}.`}
        </p>
      )}
    </div>
  );
}
