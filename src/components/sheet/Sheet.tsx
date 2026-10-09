import { useState } from 'react';
import SeatList from '../SeatList';
import { casts } from '../../lib/casting';
import { abilityMod, ABILITIES, proficiencyBonus } from '../../lib/chargen';
import type { Character, ChatLine, World } from '../../types';
import Conditions from './Conditions';
import Spellcasting from './Spellcasting';
import styles from './Sheet.module.css';

type Tab = 'story' | 'world' | 'party';

const signed = (n: number): string => (n >= 0 ? `+${n}` : String(n));

/**
 * The player's sheet, once the wizard has built a character.
 * Story / World / Party, per docs/UI-SPEC.md.
 */
export default function Sheet({
  character,
  world,
  pending,
  onChange,
  onDeclare,
}: {
  character: Character;
  world: World;
  pending: ChatLine[];
  onChange: (next: Character) => void;
  onDeclare: (text: string) => void;
}) {
  const [tab, setTab] = useState<Tab>('story');
  const [text, setText] = useState('');

  const hpPct = character.maxHp > 0 ? (character.hp / character.maxHp) * 100 : 0;

  const send = () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    onDeclare(body);
  };

  return (
    <div className={styles.sheet}>
      <div className={styles.identity}>
        <div className={styles.who}>
          <span className={styles.name}>{character.name || 'Unnamed'}</span>
          <span className={styles.sub}>
            {character.cls} · {character.race} · {character.background} · level{' '}
            <span className="num">{character.level}</span>
          </span>
        </div>
        <span className={styles.sub}>
          Proficiency <span className="num">{signed(proficiencyBonus(character.level))}</span>
        </span>
      </div>

      <div className={styles.stats}>
        <div className={`${styles.stat} ${styles.hpCard}`}>
          <span className="label">HP</span>
          <span className={styles.statValue}>
            {character.hp}
            <span className={styles.statMod}> / {character.maxHp}</span>
          </span>
          <div className={styles.hpBar}>
            <div
              className={`${styles.hpFill} ${hpPct <= 25 ? styles.hpLow : ''}`}
              style={{ width: `${Math.max(0, Math.min(100, hpPct))}%` }}
            />
          </div>
        </div>
        <div className={styles.stat}>
          <span className="label">AC</span>
          <span className={styles.statValue}>{character.ac}</span>
        </div>
        <div className={styles.stat}>
          <span className="label">Init</span>
          <span className={styles.statValue}>{signed(character.initMod)}</span>
        </div>
        <div className={styles.stat}>
          <span className="label">PP</span>
          <span className={styles.statValue}>{character.pp}</span>
        </div>
        {ABILITIES.map((ability) => (
          <div key={ability} className={styles.stat}>
            <span className="label">{ability}</span>
            <span className={styles.statValue}>{character.scores[ability]}</span>
            <span className={styles.statMod}>{signed(abilityMod(character.scores[ability]))}</span>
          </div>
        ))}
      </div>

      <div className={styles.tabs} role="tablist">
        {(['story', 'world', 'party'] as const).map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={tab === name}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {tab === 'story' && (
        <div className={styles.panel}>
          <span className="label">{world.scene || 'The table is quiet'}</span>
          <div className={styles.feed}>
            {world.feed.length === 0 ? (
              <p className={styles.hint}>Nothing has happened yet.</p>
            ) : (
              world.feed.map((line, i) => (
                <div key={i} className={styles.line}>
                  <span className="label">{line.speaker}</span>
                  <p className={styles.lineText}>{line.text}</p>
                </div>
              ))
            )}
          </div>

          <span className="label">Declare</span>
          <textarea
            className="input"
            rows={3}
            placeholder="Say or do something — ↵ to declare"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          {pending.length > 0 && (
            <p className={`${styles.hint} ${styles.pending}`}>
              {pending.length} declaration{pending.length === 1 ? '' : 's'} awaiting the GM
            </p>
          )}

          <Conditions character={character} round={world.round} />

          {casts(character) && <Spellcasting character={character} onChange={onChange} />}
        </div>
      )}

      {tab === 'world' && (
        <div className={styles.panel}>
          <div className={styles.rows}>
            <div className={styles.row}>
              <span className="label">Campaign</span>
              <span className={styles.rowValue}>{world.campaign}</span>
            </div>
            <div className={styles.row}>
              <span className="label">Scene</span>
              <span className={styles.rowValue}>{world.scene || '—'}</span>
            </div>
            <div className={styles.row}>
              <span className="label">Round</span>
              <span className={`${styles.rowValue} num`}>{world.round}</span>
            </div>
            <div className={styles.row}>
              <span className="label">Threat</span>
              <span className={`${styles.rowValue} num`}>{world.threat}</span>
            </div>
            <div className={styles.row}>
              <span className="label">Corruption</span>
              <span className={`${styles.rowValue} num`}>{world.corruption}</span>
            </div>
            {world.biome?.name && (
              <div className={styles.row}>
                <span className="label">Region</span>
                <span className={styles.rowValue}>{world.biome.name}</span>
              </div>
            )}
          </div>

          <span className="label">Quests</span>
          {world.quests.length === 0 ? (
            <p className={styles.hint}>Nothing on the board.</p>
          ) : (
            <div className={styles.rows}>
              {world.quests.map((q) => (
                <div key={q.title} className={styles.row}>
                  <span
                    className={
                      q.status === 'done'
                        ? styles.done
                        : q.status === 'failed'
                          ? styles.failed
                          : undefined
                    }
                  >
                    {q.title}
                  </span>
                  <span className="label">{q.status}</span>
                </div>
              ))}
            </div>
          )}

          <span className="label">What you remember</span>
          {world.journal.length === 0 ? (
            <p className={styles.hint}>Nothing written down yet.</p>
          ) : (
            <div className={styles.rows}>
              {world.journal.slice(-8).map((entry, i) => (
                <div key={i} className={styles.row}>
                  <span className={styles.rowValue}>{entry.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'party' && (
        <div className={styles.panel}>
          <SeatList claimable />
          <span className="label">You carry</span>
          <p className={styles.hint}>{character.inventory || 'Nothing worth listing.'}</p>
          <span className="label">Skills</span>
          <p className={styles.hint}>{character.skills || 'None.'}</p>
          {character.features.length > 0 && (
            <>
              <span className="label">Traits</span>
              <p className={styles.hint}>{character.features.join(' · ')}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
