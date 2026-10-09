import { describe, expect, it } from 'vitest';
import { DICE, diceLabel, roll } from './dice';

/** A deterministic rng that walks the given 0..1 values, then repeats the last. */
const feed = (...values: number[]) => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
};

/** rng value that lands exactly on `face` for a die of `sides`. */
const face = (n: number, sides: number) => (n - 1) / sides;

describe('roll', () => {
  it('rolls a single die within range', () => {
    expect(roll(20, 1, 0, 'flat', () => 0).sum).toBe(1);
    expect(roll(20, 1, 0, 'flat', () => 0.999).sum).toBe(20);
  });

  it('sums several dice', () => {
    const r = roll(6, 3, 0, 'flat', feed(face(3, 6), face(4, 6), face(5, 6)));
    expect(r.sum).toBe(12);
    expect(r.detail).toBe('3d6 [3 4 5] = 12');
  });

  it('omits the running total for a single die', () => {
    const r = roll(8, 1, 0, 'flat', feed(face(5, 8)));
    expect(r.detail).toBe('d8 [5]');
  });

  it('adds a positive bonus with a plus', () => {
    const r = roll(20, 1, 3, 'flat', feed(face(10, 20)));
    expect(r.total).toBe(13);
    expect(r.detail).toBe('d20 [10] + 3');
  });

  it('shows a negative bonus as a minus', () => {
    const r = roll(20, 1, -2, 'flat', feed(face(10, 20)));
    expect(r.total).toBe(8);
    expect(r.detail).toContain('− 2');
  });

  it('leaves the detail alone when the bonus is zero', () => {
    expect(roll(20, 1, 0, 'flat', feed(face(10, 20))).detail).toBe('d20 [10]');
  });

  describe('advantage and disadvantage', () => {
    it('takes the higher of two on advantage', () => {
      const r = roll(20, 1, 0, 'adv', feed(face(7, 20), face(15, 20)));
      expect(r.sum).toBe(15);
      expect(r.detail).toBe('adv [7, 15] → 15');
    });

    it('takes the lower of two on disadvantage', () => {
      const r = roll(20, 1, 0, 'dis', feed(face(7, 20), face(15, 20)));
      expect(r.sum).toBe(7);
      expect(r.detail).toBe('dis [7, 15] → 7');
    });

    it('still applies the bonus after choosing', () => {
      const r = roll(20, 1, 5, 'adv', feed(face(7, 20), face(15, 20)));
      expect(r.total).toBe(20);
    });

    it('ignores the mode for a die that is not a d20 — 2d6 has no advantage', () => {
      const r = roll(6, 2, 0, 'adv', feed(face(2, 6), face(5, 6)));
      expect(r.sum).toBe(7);
      expect(r.detail).toBe('2d6 [2 5] = 7');
    });

    it('ignores the mode when rolling more than one d20', () => {
      const r = roll(20, 2, 0, 'adv', feed(face(3, 20), face(18, 20)));
      expect(r.sum).toBe(21);
      expect(r.detail).toContain('2d20');
    });
  });

  it('never rolls outside 1..sides across many rolls', () => {
    for (let i = 0; i < 400; i++) {
      const r = roll(20);
      expect(r.sum).toBeGreaterThanOrEqual(1);
      expect(r.sum).toBeLessThanOrEqual(20);
    }
  });
});

describe('diceLabel', () => {
  it('drops the count for a single die', () => {
    expect(diceLabel(1, 20)).toBe('d20');
    expect(diceLabel(2, 6)).toBe('2d6');
  });

  it('labels every die in the tray', () => {
    expect(DICE.map(([n, s]) => diceLabel(n, s))).toContain('d100');
    expect(DICE).toHaveLength(16);
  });
});
