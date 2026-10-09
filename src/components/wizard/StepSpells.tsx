import { casterFor, listFor } from '../../data/rules';
import {
  classLabel,
  finalScores,
  spellQuota,
  spellSaveDc,
  START_LEVEL,
  type Draft,
  type Patch,
} from '../../lib/chargen';
import { raceByName } from '../../data/races';
import type { Spell } from '../../data/spells';
import styles from './Wizard.module.css';

/** "Spells known" for a known caster, "Spellbook" for a wizard, else "Prepared spells". */
function pickLabel(kind: string): string {
  if (kind === 'book') return 'Spellbook';
  if (kind === 'prepared') return 'Prepared spells';
  return 'Spells known';
}

/**
 * Step 5 — "What magic do you carry?"
 * Cantrips, then the class's pickable list. Shown only for casters; the
 * wizard skips straight from step 4 to the summary for everyone else.
 */
export default function StepSpells({
  draft,
  patch,
}: {
  draft: Draft;
  patch: Patch;
}) {
  const label = classLabel(draft.cls, draft.sub);
  const caster = casterFor(label);
  const quota = spellQuota(draft);
  const scores = finalScores(draft.scores, raceByName(draft.race), draft.asiPicks);
  const dc = spellSaveDc(label, scores);

  const cantripList = listFor(label, START_LEVEL, 0);
  const spellList = listFor(label, START_LEVEL);

  const toggle = (key: 'cantrips' | 'spells', name: string, limit: number) => {
    const current = draft[key];
    const has = current.includes(name);
    if (!has && current.length >= limit) return;
    patch({ [key]: has ? current.filter((n) => n !== name) : [...current, name] });
  };

  const row = (spell: Spell, key: 'cantrips' | 'spells', limit: number) => {
    const chosen = draft[key].includes(spell.name);
    const full = draft[key].length >= limit;
    return (
      <button
        key={spell.name}
        type="button"
        className={`${styles.option} ${!chosen && full ? styles.dim : ''}`}
        aria-pressed={chosen}
        onClick={() => toggle(key, spell.name, limit)}
      >
        <span className={styles.optName}>
          <span>{spell.name}</span>
          <span className={styles.source}>
            {spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`} · {spell.school}
          </span>
        </span>
        <span className={styles.optDesc}>{spell.text}</span>
      </button>
    );
  };

  return (
    <div className={styles.body}>
      {caster.ability && (
        <p className={styles.hint}>
          Spellcasting ability {caster.ability}
          {dc !== null && (
            <>
              {' '}
              · save DC <span className="num">{dc}</span>
            </>
          )}
        </p>
      )}

      {quota.cantrips > 0 && (
        <>
          <span className="label">
            Cantrips — <span className="num">{draft.cantrips.length}</span> of{' '}
            <span className="num">{quota.cantrips}</span>
          </span>
          <div className={`${styles.options} ${styles.cols}`}>
            {cantripList.map((s) => row(s, 'cantrips', quota.cantrips))}
          </div>
        </>
      )}

      {quota.spells > 0 && (
        <>
          <span className="label">
            {pickLabel(caster.kind)} — <span className="num">{draft.spells.length}</span> of{' '}
            <span className="num">{quota.spells}</span>
          </span>
          {caster.kind === 'prepared' && (
            <p className={styles.hint}>
              You know the whole class list; these are the ones you have prepared. Change them from
              the sheet after a long rest.
            </p>
          )}
          <div className={`${styles.options} ${styles.cols}`}>
            {spellList.map((s) => row(s, 'spells', quota.spells))}
          </div>
        </>
      )}
    </div>
  );
}
