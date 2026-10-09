import { CLASSES, classByName, skillChoicesFor } from '../../data/classes';
import type { Draft, Patch } from '../../lib/chargen';
import styles from './Wizard.module.css';

/**
 * Step 1 — "What do you fight as?"
 * Class, then its subclass, then the skills the class gets to choose.
 * Changing class clears the subclass and skills: neither survives the move.
 */
export default function StepClass({
  draft,
  patch,
}: {
  draft: Draft;
  patch: Patch;
}) {
  const cls = classByName(draft.cls);
  const choices = cls ? skillChoicesFor(cls) : [];
  const full = cls ? draft.classSkills.length >= cls.skillCount : false;

  const toggleSkill = (skill: string) => {
    const has = draft.classSkills.includes(skill);
    if (!has && full) return;
    patch({
      classSkills: has
        ? draft.classSkills.filter((s) => s !== skill)
        : [...draft.classSkills, skill],
    });
  };

  return (
    <div className={styles.body}>
      <div className={`${styles.options} ${styles.cols}`}>
        {CLASSES.map((c) => (
          <button
            key={c.name}
            type="button"
            className={styles.option}
            aria-pressed={draft.cls === c.name}
            onClick={() => patch({ cls: c.name, sub: '', classSkills: [] })}
          >
            <span className={styles.optName}>
              <span>{c.name}</span>
              <span className={styles.source}>d{c.hd}</span>
            </span>
            <span className={styles.optDesc}>{c.desc}</span>
          </button>
        ))}
      </div>

      {cls && (
        <>
          <span className="label">{cls.subLabel}</span>
          <div className={`${styles.options} ${styles.cols}`}>
            {cls.subs.map((sub) => (
              <button
                key={sub.name}
                type="button"
                className={`${styles.option} ${draft.sub && draft.sub !== sub.name ? styles.dim : ''}`}
                aria-pressed={draft.sub === sub.name}
                onClick={() => patch({ sub: sub.name })}
              >
                <span className={styles.optName}>
                  <span>{sub.name}</span>
                  <span className={styles.source}>{sub.source}</span>
                </span>
                <span className={styles.optDesc}>{sub.desc}</span>
              </button>
            ))}
          </div>

          <span className="label">
            Skills — <span className="num">{draft.classSkills.length}</span> of{' '}
            <span className="num">{cls.skillCount}</span>
          </span>
          <p className={styles.hint}>
            Saving throws: {cls.saves.join(' and ')} · {cls.armor.label}
          </p>
          <div className={styles.chips}>
            {choices.map((skill) => {
              const on = draft.classSkills.includes(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  className={styles.chip}
                  aria-pressed={on}
                  disabled={!on && full}
                  onClick={() => toggleSkill(skill)}
                >
                  {skill}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
