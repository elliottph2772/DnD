import { useState } from 'react';
import { useWorld } from '../../store/world';
import type { Enemy } from '../../types';
import styles from './Console.module.css';

interface Statblock {
  name?: string;
  kind?: string;
  cr?: string;
  ac?: number;
  hp?: number;
  speed?: string;
  stats?: Record<string, number>;
  traits?: { name: string; text: string }[];
  actions?: { name: string; text: string }[];
  tactics?: string;
}

const mod = (score: number) => Math.floor((Number(score) - 10) / 2);

/** Forged statblocks, and the button that sends one into the fight. */
export default function BestiaryTab() {
  const bestiary = (useWorld((s) => s.world.bestiary) ?? []) as Statblock[];
  const enemies = useWorld((s) => s.world.enemies);
  const busy = useWorld((s) => s.busy);
  const forgeFoe = useWorld((s) => s.forgeFoe);
  const patchWorld = useWorld((s) => s.patchWorld);

  const [brief, setBrief] = useState('');
  const [open, setOpen] = useState('');

  const deploy = (b: Statblock) => {
    const foe: Enemy = {
      name: b.name ?? 'Something',
      hp: b.hp ?? 20,
      maxHp: b.hp ?? 20,
      ac: b.ac ?? 12,
      initMod: mod(b.stats?.DEX ?? 10),
      notes: b.tactics ?? '',
    };
    // Enemies replace wholesale on an agent turn, so append rather than reset.
    void patchWorld({ enemies: [...(enemies ?? []), foe] });
  };

  return (
    <div className={styles.panel}>
      <input
        className="input"
        placeholder="A threat — or leave it to the agent"
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
      />
      <button
        type="button"
        className="btn btn-primary tap"
        disabled={Boolean(busy)}
        onClick={() => void forgeFoe(brief.trim())}
      >
        Forge a foe
      </button>

      {bestiary.length === 0 ? (
        <p className={styles.hint}>Nothing forged yet.</p>
      ) : (
        bestiary.map((b, i) => {
          const id = `${b.name}-${i}`;
          const expanded = open === id;
          return (
            <div key={id} className={styles.card}>
              <button
                type="button"
                className={styles.seatHead}
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? '' : id)}
              >
                <span className={styles.seatName}>{b.name}</span>
                <span className={styles.seatCls}>CR {b.cr ?? '?'}</span>
              </button>
              <span className={styles.hint}>{b.kind}</span>
              <span className={styles.hint}>
                AC <span className="num">{b.ac}</span> · HP{' '}
                <span className="num">{b.hp}</span> · {b.speed}
              </span>

              {expanded && (
                <>
                  {b.stats && (
                    <span className={styles.hint}>
                      {Object.entries(b.stats)
                        .map(([k, v]) => `${k} ${v}`)
                        .join(' · ')}
                    </span>
                  )}
                  {(b.traits ?? []).map((t) => (
                    <p key={t.name} className={styles.hint}>
                      <strong>{t.name}.</strong> {t.text}
                    </p>
                  ))}
                  {(b.actions ?? []).map((a) => (
                    <p key={a.name} className={styles.hint}>
                      <strong>{a.name}.</strong> {a.text}
                    </p>
                  ))}
                  {b.tactics && <p className={styles.hint}>{b.tactics}</p>}
                </>
              )}

              <button type="button" className="btn btn-secondary tap" onClick={() => deploy(b)}>
                Send it in
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
