import ConditionPicker from '../ConditionPicker';
import { useWorld } from '../../store/world';
import styles from './Drawer.module.css';

/**
 * Per-seat HP and conditions, then the same conditions block the console uses.
 * The ±HP steps are the thing a GM reaches for most at the table, so they get
 * four even full-height targets rather than a cramped row.
 */
export default function DrawerParty() {
  const party = useWorld((s) => s.party);
  const round = useWorld((s) => s.world.round);
  const nudgeHp = useWorld((s) => s.nudgeHp);
  const releaseConditionOn = useWorld((s) => s.releaseConditionOn);

  const seated = party.map((c, i) => ({ c, slot: i + 1 })).filter((x) => x.c.built);

  return (
    <div className={styles.section}>
      {seated.length === 0 ? (
        <p className={styles.hint}>Nobody has built a character yet.</p>
      ) : (
        seated.map(({ c, slot }) => {
          const pct = c.maxHp > 0 ? (c.hp / c.maxHp) * 100 : 0;
          return (
            <div key={slot} className={styles.seat}>
              <div className={styles.seatHead}>
                <span className={styles.name}>{c.name}</span>
                <span className={styles.hp}>
                  {c.hp}/{c.maxHp}
                </span>
              </div>

              <div className={styles.bar}>
                <div
                  className={`${styles.barFill} ${pct <= 25 ? styles.barLow : ''}`}
                  style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                />
              </div>

              <div className={styles.nudges}>
                {[-5, -1, 1, 5].map((by) => (
                  <button
                    key={by}
                    type="button"
                    className={styles.nudge}
                    aria-label={`${by > 0 ? 'Heal' : 'Damage'} ${c.name} by ${Math.abs(by)}`}
                    onClick={() => void nudgeHp(slot, by)}
                  >
                    {by > 0 ? `+${by}` : by}
                  </button>
                ))}
              </div>

              {c.cond.length > 0 && (
                <div className={styles.chips}>
                  {c.cond.map((cond) => (
                    <button
                      key={cond.name}
                      type="button"
                      className={`${styles.chip} tap`}
                      aria-label={`Release ${cond.name} on ${c.name}`}
                      onClick={() => void releaseConditionOn(slot, cond.name)}
                    >
                      {cond.name}
                      {cond.expires > 0 && (
                        <span className="num"> {Math.max(0, cond.expires - round)}</span>
                      )}{' '}
                      ✕
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}

      <span className="label">Conditions</span>
      <ConditionPicker />
    </div>
  );
}
