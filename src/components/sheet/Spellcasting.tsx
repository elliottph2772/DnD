import { useMemo, useState } from 'react';
import { casterFor, listFor, spellByName } from '../../data/rules';
import {
  activeSlot,
  canCast,
  castAt,
  castableNames,
  castingMod,
  longRest,
  needsNewPicks,
  ordinal,
  preparableNames,
  preparedLimit,
  prepares,
  shortRest,
  slotRows,
  togglePrepared,
} from '../../lib/casting';
import { proficiencyBonus } from '../../lib/chargen';
import type { Character } from '../../types';
import styles from './Sheet.module.css';

type Tab = 'cast' | 'prepare' | 'list';

/**
 * The casting panel: slot pips, rests, and the Cast / Prepare / Spell list
 * tabs. Every change goes out through `onChange`, which the sheet hands to
 * the store's debounced seat write.
 */
export default function Spellcasting({
  character,
  onChange,
}: {
  character: Character;
  onChange: (next: Character) => void;
}) {
  const caster = casterFor(character.cls);
  const rows = slotRows(character);
  const dc = 8 + proficiencyBonus(character.level) + castingMod(character);
  const canPrepare = prepares(character);

  const [tab, setTab] = useState<Tab>('cast');
  const [picked, setPicked] = useState('');
  const [slot, setSlot] = useState(0);

  const castable = castableNames(character);
  const spell = picked ? spellByName(picked) : null;

  // The slot levels this spell could go out on, recomputed whenever the pick
  // or the spent slots change.
  const options = useMemo(
    () => (spell && spell.level > 0 ? slotRows(character)
      .filter((r) => r.level >= spell.level && r.left > 0)
      .map((r) => r.level) : []),
    [spell, character],
  );

  // The slot actually in play, derived rather than trusted — see activeSlot
  // in lib/casting.ts for why the select must not keep its own stale number.
  const slotInPlay = spell ? activeSlot(character, spell.level, slot) : 0;

  const choose = (name: string) => {
    setPicked(name);
    const s = spellByName(name);
    // Default to the spell's own level, so Cast is one tap for the common case.
    setSlot(s && s.level > 0 ? s.level : 0);
  };

  const doCast = () => {
    if (!spell || spell.level === 0) return; // cantrips cost nothing
    if (slotInPlay <= 0) return;
    const next = castAt(character, slotInPlay);
    if (next !== character) onChange(next);
  };

  const blocked = Boolean(spell) && spell!.level > 0 && !canCast(character, spell!.level);

  return (
    <div className={styles.panel}>
      <span className="label">Spellcasting</span>
      <p className={styles.hint}>
        Spellcasting ability {caster.ability} · save DC <span className="num">{dc}</span> · attack{' '}
        <span className="num">
          {proficiencyBonus(character.level) + castingMod(character) >= 0 ? '+' : ''}
          {proficiencyBonus(character.level) + castingMod(character)}
        </span>
      </p>

      {needsNewPicks(character) && (
        <button type="button" className={styles.banner} onClick={() => setTab('list')}>
          You are level {character.level} — choose your spells
        </button>
      )}

      {rows.map((row) => (
        <div key={row.level} className={styles.slotRow}>
          <span className={styles.slotLabel}>{ordinal(row.level)}</span>
          <div className={styles.pips}>
            {Array.from({ length: row.total }, (_, i) => (
              <span
                key={i}
                className={`${styles.pip} ${i < row.used ? styles.pipSpent : ''}`}
                aria-label={i < row.used ? 'spent' : 'available'}
              />
            ))}
          </div>
        </div>
      ))}

      <div className={styles.rests}>
        <button
          type="button"
          className="btn btn-secondary tap"
          onClick={() => onChange(shortRest(character))}
        >
          Short rest
        </button>
        <button
          type="button"
          className="btn btn-secondary tap"
          onClick={() => onChange(longRest(character))}
        >
          Long rest
        </button>
      </div>

      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          className={styles.tab}
          aria-selected={tab === 'cast'}
          onClick={() => setTab('cast')}
        >
          Cast
        </button>
        {canPrepare && (
          <button
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={tab === 'prepare'}
            onClick={() => setTab('prepare')}
          >
            Prepare
          </button>
        )}
        <button
          type="button"
          role="tab"
          className={styles.tab}
          aria-selected={tab === 'list'}
          onClick={() => setTab('list')}
        >
          Spell list
        </button>
      </div>

      {tab === 'cast' && (
        <div className={styles.panel}>
          {castable.length === 0 ? (
            <p className={styles.hint}>Nothing prepared. Use the Prepare tab.</p>
          ) : (
            <>
              <div className={styles.castRow}>
                <select
                  className={`input ${styles.grow}`}
                  value={picked}
                  onChange={(e) => choose(e.target.value)}
                >
                  <option value="">Choose a spell</option>
                  {castable.map((name) => {
                    const s = spellByName(name);
                    return (
                      <option key={name} value={name}>
                        {name}
                        {s ? ` — ${s.level === 0 ? 'cantrip' : ordinal(s.level)}` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {spell && <p className={styles.hint}>{spell.text}</p>}

              {spell && spell.level > 0 && !blocked && (
                <div className={styles.castRow}>
                  <select
                    className="input"
                    value={slotInPlay}
                    onChange={(e) => setSlot(Number(e.target.value))}
                  >
                    {options.map((level) => (
                      <option key={level} value={level}>
                        {level === spell.level
                          ? `${ordinal(level)} slot`
                          : `Upcast from ${ordinal(level)}`}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-primary tap" onClick={doCast}>
                    Cast
                  </button>
                </div>
              )}

              {blocked && (
                <p className={styles.warn}>
                  No slot of that level or higher remains. Rest, or cast a cantrip.
                </p>
              )}

              {spell && spell.level === 0 && (
                <p className={styles.hint}>A cantrip costs no slot — cast it freely.</p>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'prepare' && canPrepare && (
        <div className={styles.panel}>
          <span className="label">
            Prepared — <span className="num">{character.prepared.length}</span> of{' '}
            <span className="num">{preparedLimit(character)}</span>
          </span>
          <div className={styles.spells}>
            {preparableNames(character).map((name) => {
              const s = spellByName(name);
              const on = character.prepared.includes(name);
              const full = character.prepared.length >= preparedLimit(character);
              return (
                <button
                  key={name}
                  type="button"
                  className={styles.spell}
                  aria-pressed={on}
                  disabled={!on && full}
                  onClick={() => onChange(togglePrepared(character, name))}
                >
                  <span className={styles.spellHead}>
                    <span>{name}</span>
                    {s && (
                      <span className={styles.spellMeta}>
                        {s.level === 0 ? 'Cantrip' : `Level ${s.level}`} · {s.school}
                      </span>
                    )}
                  </span>
                  {s && <span className={styles.spellText}>{s.text}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'list' && (
        <div className={styles.panel}>
          <p className={styles.hint}>
            Everything your class can reach at level {character.level}. What you hold is lit.
          </p>
          <div className={styles.spells}>
            {[...listFor(character.cls, character.level, 0), ...listFor(character.cls, character.level)].map(
              (s) => {
                const held =
                  character.cantrips.includes(s.name) || character.spells.includes(s.name);
                return (
                  <div
                    key={`${s.level}-${s.name}`}
                    className={styles.spell}
                    aria-pressed={held}
                  >
                    <span className={styles.spellHead}>
                      <span>{s.name}</span>
                      <span className={styles.spellMeta}>
                        {s.level === 0 ? 'Cantrip' : `Level ${s.level}`} · {s.school}
                      </span>
                    </span>
                    <span className={styles.spellText}>{s.text}</span>
                  </div>
                );
              },
            )}
          </div>
        </div>
      )}
    </div>
  );
}
