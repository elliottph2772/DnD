import { useState } from 'react';
import DiceRoller from './DiceRoller';
import { ordinal, slotRows } from '../../lib/casting';
import { useWorld } from '../../store/world';
import styles from './Console.module.css';

const SLOTS = [1, 2, 3, 4];

/**
 * One expandable card per seat: name, class, HP bar, ±HP, condition chips and
 * slot pips. Every edit goes through `patchSeat`, which runs gm-agent.
 */
export default function PartyRail() {
  const party = useWorld((s) => s.party);
  const round = useWorld((s) => s.world.round);
  const nudgeHp = useWorld((s) => s.nudgeHp);
  const releaseConditionOn = useWorld((s) => s.releaseConditionOn);

  const [open, setOpen] = useState<number>(0);

  const taken = party.filter((c) => c?.built).length;

  return (
    <aside className={styles.rail}>
      <div className={styles.panelHead}>
        <span className="label">The Party</span>
        <div className={styles.spacer} />
        <span className="label">
          <span className="num">{taken}</span> of 4
        </span>
      </div>

      <div className={styles.scroll}>
        {SLOTS.map((slot) => {
        const c = party[slot - 1];
        const built = c?.built;
        const expanded = open === slot;
        const pct = built && c.maxHp > 0 ? (c.hp / c.maxHp) * 100 : 0;

        return (
          <div key={slot} className={styles.seatCard}>
            <button
              type="button"
              className={styles.seatHead}
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? 0 : slot)}
            >
              <span className={styles.seatName}>
                {built ? c.name : `Seat ${slot}`}
              </span>
              <span className={styles.seatCls}>{expanded ? '−' : '+'}</span>
            </button>

            {!built ? (
              <span className={styles.seatCls}>empty</span>
            ) : (
              <>
                <span className={styles.seatCls}>
                  {c.cls} · level <span className="num">{c.level}</span>
                </span>

                <div className={styles.hpLine}>
                  <span className={styles.hpText}>
                    {c.hp}/{c.maxHp}
                  </span>
                  <div className={styles.bar}>
                    <div
                      className={`${styles.barFill} ${pct <= 25 ? styles.barLow : ''}`}
                      style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                    />
                  </div>
                </div>

                {c.cond.length > 0 && (
                  <div className={styles.chips}>
                    {c.cond.map((cond) => (
                      <span key={cond.name} className={styles.chip}>
                        {cond.name}
                        <span className="num">
                          {cond.expires > 0 ? ` ${Math.max(0, cond.expires - round)}` : ''}
                        </span>
                        <button
                          type="button"
                          className={styles.release}
                          aria-label={`Release ${cond.name}`}
                          onClick={() => void releaseConditionOn(slot, cond.name)}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {expanded && (
                  <>
                    <div className={styles.nudges}>
                      {[-5, -1, 1, 5].map((by) => (
                        <button
                          key={by}
                          type="button"
                          className={styles.nudge}
                          onClick={() => void nudgeHp(slot, by)}
                        >
                          {by > 0 ? `+${by}` : by}
                        </button>
                      ))}
                    </div>

                    {slotRows(c).map((row) => (
                      <div key={row.level} className={styles.hpLine}>
                        <span className={styles.hpText}>{ordinal(row.level)}</span>
                        <div className={styles.pips}>
                          {Array.from({ length: row.total }, (_, i) => (
                            <span
                              key={i}
                              className={`${styles.pip} ${i < row.used ? styles.pipSpent : ''}`}
                            />
                          ))}
                        </div>
                      </div>
                    ))}

                    <span className={styles.seatCls}>
                      AC <span className="num">{c.ac}</span> · init{' '}
                      <span className="num">{c.initMod >= 0 ? `+${c.initMod}` : c.initMod}</span> ·
                      PP <span className="num">{c.pp}</span>
                    </span>
                  </>
                )}
              </>
            )}
          </div>
          );
        })}
      </div>

      <DiceRoller />
    </aside>
  );
}
