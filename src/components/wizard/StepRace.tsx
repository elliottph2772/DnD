import { BACKGROUNDS } from '../../data/backgrounds';
import { racesByFamily, raceByName } from '../../data/races';
import { asiPickOptions, type Draft, type Patch } from '../../lib/chargen';
import type { Ability } from '../../types';
import styles from './Wizard.module.css';

/**
 * Step 2 — "Where do you come from?"
 * Race (grouped by family), the floating ability increases for the two races
 * that choose them, then background.
 */
export default function StepRace({
  draft,
  patch,
}: {
  draft: Draft;
  patch: Patch;
}) {
  const race = raceByName(draft.race);
  const pickable = asiPickOptions(race);
  const need = race?.pick?.count ?? 0;
  const chosen = draft.asiPicks;

  const togglePick = (ability: Ability) => {
    const has = chosen.includes(ability);
    if (!has && chosen.length >= need) return;
    patch({
      asiPicks: has ? chosen.filter((a) => a !== ability) : [...chosen, ability],
    });
  };

  return (
    <div className={styles.body}>
      {racesByFamily().map(({ family, races }) => (
        <div key={family} className={styles.group}>
          <span className="label">{family}</span>
          <div className={`${styles.options} ${styles.cols}`}>
            {races.map((r) => (
              <button
                key={r.name}
                type="button"
                className={styles.option}
                aria-pressed={draft.race === r.name}
                // A different race means different floating picks; drop them.
                onClick={() => patch({ race: r.name, asiPicks: [] })}
              >
                <span className={styles.optName}>
                  <span>{r.name}</span>
                  <span className={styles.source}>{r.speed} ft</span>
                </span>
                <span className={styles.optDesc}>{r.note}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {race && race.pick && (
        <>
          <span className="label">
            Choose <span className="num">{need}</span> — +{race.pick.amount} each
          </span>
          <p className={styles.hint}>
            {chosen.length} of {need} assigned.
          </p>
          <div className={styles.chips}>
            {pickable.map((ability) => {
              const on = chosen.includes(ability);
              return (
                <button
                  key={ability}
                  type="button"
                  className={styles.chip}
                  aria-pressed={on}
                  disabled={!on && chosen.length >= need}
                  onClick={() => togglePick(ability)}
                >
                  {ability}
                </button>
              );
            })}
          </div>
        </>
      )}

      {race && race.traits.length > 0 && (
        <ul className={styles.traits}>
          {race.traits.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}

      <span className="label">Background</span>
      <div className={`${styles.options} ${styles.cols}`}>
        {BACKGROUNDS.map((bg) => (
          <button
            key={bg.name}
            type="button"
            className={styles.option}
            aria-pressed={draft.background === bg.name}
            onClick={() => patch({ background: bg.name })}
          >
            <span className={styles.optName}>
              <span>{bg.name}</span>
            </span>
            <span className={styles.optDesc}>{bg.skills}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
