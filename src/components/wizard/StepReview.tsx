import { classByName } from '../../data/classes';
import { raceByName } from '../../data/races';
import { casterFor } from '../../data/rules';
import {
  ABILITIES,
  abilityMod,
  acFor,
  classLabel,
  finalScores,
  maxHpFor,
  passivePerception,
  skillsFor,
  spellSaveDc,
  START_LEVEL,
  type Draft,
} from '../../lib/chargen';
import styles from './Wizard.module.css';

const signed = (n: number): string => (n >= 0 ? `+${n}` : String(n));

/**
 * Step 6 — "Ready?"
 * Every number the sheet will carry, before it is written to the seat.
 */
export default function StepReview({ draft }: { draft: Draft }) {
  const cls = classByName(draft.cls);
  const race = raceByName(draft.race);
  const label = classLabel(draft.cls, draft.sub);
  const scores = finalScores(draft.scores, race, draft.asiPicks);
  const skills = skillsFor(draft.background, draft.classSkills);
  const caster = casterFor(label);
  const dc = spellSaveDc(label, scores);

  return (
    <div className={styles.body}>
      <div className={styles.statGrid}>
        {ABILITIES.map((ability) => (
          <div key={ability} className={styles.stat}>
            <span className={styles.scoreName}>{ability}</span>
            <span className={styles.statValue}>{scores[ability]}</span>
            <span className={styles.statMod}>{signed(abilityMod(scores[ability]))}</span>
          </div>
        ))}
      </div>

      <div className={styles.summary}>
        <div className={styles.row}>
          <span className="label">Name</span>
          <span className={styles.rowValue}>{draft.name.trim()}</span>
        </div>
        <div className={styles.row}>
          <span className="label">Class</span>
          <span className={styles.rowValue}>{label}</span>
        </div>
        <div className={styles.row}>
          <span className="label">Race</span>
          <span className={styles.rowValue}>{draft.race}</span>
        </div>
        <div className={styles.row}>
          <span className="label">Background</span>
          <span className={styles.rowValue}>{draft.background}</span>
        </div>
        <div className={styles.row}>
          <span className="label">Level</span>
          <span className={`${styles.rowValue} num`}>{START_LEVEL}</span>
        </div>
        <div className={styles.row}>
          <span className="label">Hit points</span>
          <span className={`${styles.rowValue} num`}>{maxHpFor(cls, race, scores.CON)}</span>
        </div>
        <div className={styles.row}>
          <span className="label">Armour class</span>
          <span className={`${styles.rowValue} num`}>{acFor(cls, scores)}</span>
        </div>
        <div className={styles.row}>
          <span className="label">Initiative</span>
          <span className={`${styles.rowValue} num`}>{signed(abilityMod(scores.DEX))}</span>
        </div>
        <div className={styles.row}>
          <span className="label">Passive perception</span>
          <span className={`${styles.rowValue} num`}>{passivePerception(scores, skills)}</span>
        </div>
        <div className={styles.row}>
          <span className="label">Skills</span>
          <span className={styles.rowValue}>{skills.join(', ')}</span>
        </div>
        {caster.kind !== 'none' && (
          <>
            <div className={styles.row}>
              <span className="label">Spell save DC</span>
              <span className={`${styles.rowValue} num`}>{dc}</span>
            </div>
            {draft.cantrips.length > 0 && (
              <div className={styles.row}>
                <span className="label">Cantrips</span>
                <span className={styles.rowValue}>{draft.cantrips.join(', ')}</span>
              </div>
            )}
            {draft.spells.length > 0 && (
              <div className={styles.row}>
                <span className="label">Spells</span>
                <span className={styles.rowValue}>{draft.spells.join(', ')}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
