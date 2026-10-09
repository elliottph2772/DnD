import { useState } from 'react';
import { DICE, diceLabel, roll, type D20Mode, type Roll } from '../../lib/dice';
import styles from './Console.module.css';

const MODES: { key: D20Mode; label: string }[] = [
  { key: 'flat', label: 'Flat' },
  { key: 'adv', label: 'Advantage' },
  { key: 'dis', label: 'Disadv.' },
];

/**
 * Pinned to the foot of the party rail. The GM rolls constantly and should
 * never have to reach for anything else. Advantage applies to a single d20
 * only — the rule lives in lib/dice.ts, not here.
 */
export default function DiceRoller() {
  const [mode, setMode] = useState<D20Mode>('flat');
  const [bonus, setBonus] = useState(0);
  const [last, setLast] = useState<Roll | null>(null);

  return (
    <div className={styles.pinned}>
      <div className={styles.diceHead}>
        <span className="label">Dice</span>
        <div className={styles.rule} />
        <span className="label">Bonus</span>
        <button
          type="button"
          className={styles.stepper}
          aria-label="Lower the bonus"
          onClick={() => setBonus((b) => b - 1)}
        >
          −
        </button>
        <input
          className={styles.bonus}
          inputMode="numeric"
          value={bonus}
          aria-label="Roll bonus"
          onChange={(e) => {
            const n = Number(e.target.value.replace(/[^0-9-]/g, ''));
            setBonus(Number.isFinite(n) ? n : 0);
          }}
        />
        <button
          type="button"
          className={styles.stepper}
          aria-label="Raise the bonus"
          onClick={() => setBonus((b) => b + 1)}
        >
          +
        </button>
      </div>

      <div className={styles.modes}>
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            className={styles.mode}
            aria-pressed={mode === m.key}
            onClick={() => setMode(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className={styles.tray}>
        {DICE.map(([count, sides]) => (
          <button
            key={`${count}d${sides}`}
            type="button"
            className={styles.die}
            onClick={() => setLast(roll(sides, count, bonus, mode))}
          >
            {diceLabel(count, sides)}
          </button>
        ))}
      </div>

      <div className={styles.result}>
        <span className={styles.resultDetail}>{last?.detail ?? ''}</span>
        <span className={styles.resultTotal}>{last ? last.total : ''}</span>
      </div>
    </div>
  );
}
