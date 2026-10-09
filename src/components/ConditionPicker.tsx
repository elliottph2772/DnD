import { useState } from 'react';
import { CONDITIONS, DURATIONS } from '../data/rules';
import { useWorld } from '../store/world';
import styles from './ConditionPicker.module.css';

/**
 * Apply and release conditions. Shared by the console's Combat tab and the
 * remote GM drawer, because UI-SPEC calls for "the same Conditions block" in
 * both and the one thing it must not do is drift between them.
 *
 * Every select derives its value from the options rather than holding one of
 * its own. The prototype's duration select displayed one thing while its state
 * said another (docs/BUILD-PLAN.md records it); deriving means the shown value
 * and the applied value cannot disagree.
 */
export default function ConditionPicker() {
  const round = useWorld((s) => s.world.round);
  const party = useWorld((s) => s.party);
  const applyConditionTo = useWorld((s) => s.applyConditionTo);
  const releaseConditionOn = useWorld((s) => s.releaseConditionOn);

  const [target, setTarget] = useState(0);
  const [condName, setCondName] = useState(CONDITIONS[0].name);
  const [durLabel, setDurLabel] = useState(DURATIONS[0].label);
  const [override, setOverride] = useState('');

  const seated = party.map((c, i) => ({ c, slot: i + 1 })).filter((x) => x.c.built);

  // Derive, never trust: a target who has left the table falls back to the
  // first seat, and the select shows what will actually be used.
  const activeTarget = seated.some((x) => x.slot === target) ? target : (seated[0]?.slot ?? 0);
  const condition = CONDITIONS.find((x) => x.name === condName) ?? CONDITIONS[0];
  const duration = DURATIONS.find((d) => d.label === durLabel) ?? DURATIONS[0];

  const apply = () => {
    if (!activeTarget) return;
    const typed = Number(override);
    const rounds = override.trim() !== '' && Number.isFinite(typed) ? typed : duration.rounds;
    void applyConditionTo(activeTarget, condition.name, duration.label, rounds);
    setOverride('');
  };

  // Everyone carrying something, flattened for the active list.
  const active = party.flatMap((c, i) =>
    (c.cond || []).map((cond) => ({ slot: i + 1, who: c.name, cond })),
  );

  if (seated.length === 0) {
    return <p className={styles.hint}>Nobody has built a character yet.</p>;
  }

  return (
    <div className={styles.wrap}>
      {active.length > 0 && (
        <div className={styles.active}>
          {active.map(({ slot, who, cond }) => (
            <div key={`${slot}-${cond.name}`} className={styles.row}>
              <span>
                {who} · {cond.name}
              </span>
              <span className={styles.rowEnd}>
                <span className="num">
                  {cond.expires > 0 ? `${Math.max(0, cond.expires - round)} rd` : '—'}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost tap"
                  onClick={() => void releaseConditionOn(slot, cond.name)}
                >
                  Release
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      <select
        className="input tap"
        aria-label="Who it lands on"
        value={activeTarget}
        onChange={(e) => setTarget(Number(e.target.value))}
      >
        {seated.map(({ c, slot }) => (
          <option key={slot} value={slot}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        className="input tap"
        aria-label="Condition"
        value={condition.name}
        onChange={(e) => setCondName(e.target.value)}
      >
        {CONDITIONS.map((c) => (
          <option key={c.name} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>
      <p className={styles.hint}>{condition.text}</p>

      <select
        className="input tap"
        aria-label="How long"
        value={duration.label}
        onChange={(e) => setDurLabel(e.target.value)}
      >
        {DURATIONS.map((d) => (
          <option key={d.label} value={d.label}>
            {d.label}
          </option>
        ))}
      </select>

      <input
        className="input tap"
        inputMode="numeric"
        aria-label="Rounds override"
        placeholder={`Rounds — ${duration.rounds || 'no clock'}`}
        value={override}
        onChange={(e) => setOverride(e.target.value.replace(/[^0-9]/g, ''))}
      />
      <p className={styles.hint}>
        {duration.rounds > 0
          ? 'Rounds — override if the ruling differs.'
          : 'Does not tick down; release it by hand.'}
      </p>

      <button type="button" className="btn btn-primary tap" onClick={apply}>
        Apply
      </button>
    </div>
  );
}
