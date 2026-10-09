import { useState } from 'react';
import { CONDITIONS, DURATIONS } from '../../data/rules';
import { useWorld } from '../../store/world';
import type { Combatant } from '../../types';
import styles from './Console.module.css';

const d20 = () => Math.floor(Math.random() * 20) + 1;

/**
 * Combat: initiative, enemies, and the conditions block.
 *
 * Both selects here derive their value from the options rather than holding a
 * number of their own. The prototype's duration select displayed one thing
 * while its state said another (see docs/BUILD-PLAN.md); deriving means the
 * two cannot drift.
 */
export default function CombatTab() {
  const world = useWorld((s) => s.world);
  const party = useWorld((s) => s.party);
  const patchWorld = useWorld((s) => s.patchWorld);
  const nextRound = useWorld((s) => s.nextRound);
  const applyConditionTo = useWorld((s) => s.applyConditionTo);
  const releaseConditionOn = useWorld((s) => s.releaseConditionOn);

  const [target, setTarget] = useState(0);
  const [condName, setCondName] = useState(CONDITIONS[0].name);
  const [durLabel, setDurLabel] = useState(DURATIONS[0].label);
  const [override, setOverride] = useState('');

  const seated = party
    .map((c, i) => ({ c, slot: i + 1 }))
    .filter((x) => x.c.built);

  // Derive, never trust: a target that has left the table falls back to the
  // first seat, and the select shows what will actually be used.
  const activeTarget = seated.some((x) => x.slot === target) ? target : (seated[0]?.slot ?? 0);
  const condition = CONDITIONS.find((x) => x.name === condName) ?? CONDITIONS[0];
  const duration = DURATIONS.find((d) => d.label === durLabel) ?? DURATIONS[0];

  const rollInitiative = () => {
    const rolls: Combatant[] = [
      ...seated.map(({ c }) => ({ name: c.name, init: d20() + (c.initMod || 0), foe: false })),
      ...(world.enemies || []).map((e) => ({
        name: e.name,
        init: d20() + (e.initMod || 0),
        foe: true,
      })),
    ].sort((a, b) => b.init - a.init);
    void patchWorld({ order: rolls, turnIdx: 0 });
  };

  const nextTurn = () => {
    const order = world.order || [];
    if (order.length === 0) return;
    const next = world.turnIdx + 1;
    // Wrapping past the last combatant is the end of the round.
    if (next >= order.length) {
      void patchWorld({ turnIdx: 0 });
      void nextRound();
      return;
    }
    void patchWorld({ turnIdx: next });
  };

  const apply = () => {
    if (!activeTarget) return;
    const typed = Number(override);
    const rounds = override.trim() !== '' && Number.isFinite(typed) ? typed : duration.rounds;
    void applyConditionTo(activeTarget, condition.name, duration.label, rounds);
    setOverride('');
  };

  // Everyone currently carrying something, flattened for the active list.
  const active = party.flatMap((c, i) =>
    (c.cond || []).map((cond) => ({ slot: i + 1, who: c.name, cond })),
  );

  return (
    <div className={styles.panel}>
      <div className={styles.row}>
        <button type="button" className="btn btn-primary tap" onClick={rollInitiative}>
          Roll initiative
        </button>
        <button
          type="button"
          className="btn btn-secondary tap"
          disabled={(world.order || []).length === 0}
          onClick={nextTurn}
        >
          Next turn
        </button>
      </div>

      {(world.order || []).length > 0 && (
        <div className={styles.card}>
          {world.order.map((row, i) => (
            <div key={`${row.name}-${i}`} className={styles.rowBetween}>
              <span style={{ color: i === world.turnIdx ? 'var(--color-accent-200)' : undefined }}>
                {i === world.turnIdx ? '▸ ' : ''}
                {row.name}
                {row.foe ? ' (foe)' : ''}
              </span>
              <span className="num">{row.init}</span>
            </div>
          ))}
        </div>
      )}

      {(world.enemies || []).length > 0 && (
        <>
          <span className="label">Enemies</span>
          <div className={styles.card}>
            {world.enemies.map((e, i) => (
              <div key={`${e.name}-${i}`} className={styles.rowBetween}>
                <span>{e.name}</span>
                <span className="num">
                  {e.hp}/{e.maxHp} · AC {e.ac}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className={styles.row}>
        <span className="label">
          Round <span className="num">{world.round}</span>
        </span>
        <button type="button" className="btn btn-secondary tap" onClick={() => void nextRound()}>
          +1 round
        </button>
      </div>

      {active.length > 0 && (
        <div className={styles.card}>
          {active.map(({ slot, who, cond }) => (
            <div key={`${slot}-${cond.name}`} className={styles.rowBetween}>
              <span>
                {who} · {cond.name}
              </span>
              <span className={styles.row}>
                <span className="num">
                  {cond.expires > 0 ? `${Math.max(0, cond.expires - world.round)} rd` : '—'}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => void releaseConditionOn(slot, cond.name)}
                >
                  Release
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      <span className="label">Apply a condition</span>
      {seated.length === 0 ? (
        <p className={styles.hint}>Nobody has built a character yet.</p>
      ) : (
        <>
          <select
            className="input"
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
            className="input"
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
            className="input"
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
            className="input"
            inputMode="numeric"
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
        </>
      )}
    </div>
  );
}
