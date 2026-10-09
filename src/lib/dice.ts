// The GM's dice. Pure functions — the only randomness comes in through `rng`,
// so every rule here is testable without stubbing globals.
//
// Ported from the console prototype's `roll`: a single d20 may be rolled with
// advantage or disadvantage, anything else is a straight sum.

export type D20Mode = 'flat' | 'adv' | 'dis';

export interface Roll {
  /** "adv [12, 5] → 12 + 3" or "2d6 [3 4] = 7" */
  detail: string;
  /** The sum of the dice, before the bonus. */
  sum: number;
  /** What the GM reads out. */
  total: number;
}

/** The dice tray, in the prototype's order. */
export const DICE: readonly [number, number][] = [
  [1, 4], [1, 6], [1, 8], [1, 10], [1, 12], [1, 20], [1, 100], [2, 4],
  [2, 6], [2, 8], [2, 10], [2, 12], [3, 6], [4, 6], [6, 6], [8, 6],
];

export const diceLabel = (count: number, sides: number): string =>
  `${count > 1 ? count : ''}d${sides}`;

const signed = (n: number): string => (n > 0 ? ` + ${n}` : ` − ${Math.abs(n)}`);

/**
 * Roll `count` dice of `sides`, add `bonus`.
 *
 * Advantage and disadvantage apply only to a single d20 — that is the 5e rule,
 * and rolling 2d6 "with advantage" is not a thing. Any other combination falls
 * through to a straight sum, so the mode can be left set without surprising
 * anyone when they reach for a damage die.
 */
export function roll(
  sides: number,
  count = 1,
  bonus = 0,
  mode: D20Mode = 'flat',
  rng: () => number = Math.random,
): Roll {
  const die = () => 1 + Math.floor(rng() * sides);
  let sum = 0;
  let detail: string;

  if (sides === 20 && count === 1 && mode !== 'flat') {
    const a = die();
    const b = die();
    sum = mode === 'adv' ? Math.max(a, b) : Math.min(a, b);
    detail = `${mode === 'adv' ? 'adv' : 'dis'} [${a}, ${b}] → ${sum}`;
  } else {
    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
      const r = die();
      rolls.push(r);
      sum += r;
    }
    detail = `${diceLabel(count, sides)} [${rolls.join(' ')}]${count > 1 ? ` = ${sum}` : ''}`;
  }

  if (bonus) detail += signed(bonus);
  return { detail, sum, total: sum + bonus };
}
