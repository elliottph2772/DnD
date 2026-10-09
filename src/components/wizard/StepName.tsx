import { backgroundByName } from '../../data/backgrounds';
import { classByName } from '../../data/classes';
import { classLabel, type Draft, type Patch } from '../../lib/chargen';
import styles from './Wizard.module.css';

/**
 * Step 3 — "What are you called?"
 * One field. The gear the character will carry is shown here because it is the
 * last quiet moment before the numbers start.
 */
export default function StepName({
  draft,
  patch,
  onEnter,
}: {
  draft: Draft;
  patch: Patch;
  onEnter: () => void;
}) {
  const cls = classByName(draft.cls);
  const bg = backgroundByName(draft.background);

  return (
    <div className={styles.body}>
      <input
        className="input"
        placeholder="A name"
        value={draft.name}
        autoFocus
        maxLength={40}
        onChange={(e) => patch({ name: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onEnter();
          }
        }}
      />
      <p className={styles.hint}>
        {classLabel(draft.cls, draft.sub)} · {draft.race} · {draft.background}
      </p>

      {(cls || bg) && (
        <>
          <span className="label">You carry</span>
          <p className={styles.hint}>{[cls?.kit, bg?.gear].filter(Boolean).join(', ')}</p>
        </>
      )}
    </div>
  );
}
