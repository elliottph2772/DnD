import { useState } from 'react';
import { useWorld } from '../../store/world';
import type { Combatant } from '../../types';
import styles from './Drawer.module.css';

const d20 = () => Math.floor(Math.random() * 20) + 1;

/** Region and foe generation, the round clock, and initiative. */
export default function DrawerWorld() {
  const world = useWorld((s) => s.world);
  const party = useWorld((s) => s.party);
  const busy = useWorld((s) => s.busy);
  const generateBiome = useWorld((s) => s.generateBiome);
  const forgeFoe = useWorld((s) => s.forgeFoe);
  const patchWorld = useWorld((s) => s.patchWorld);
  const nextRound = useWorld((s) => s.nextRound);

  const [brief, setBrief] = useState('');

  const rollInitiative = () => {
    const rolls: Combatant[] = [
      ...party
        .filter((c) => c.built)
        .map((c) => ({ name: c.name, init: d20() + (c.initMod || 0), foe: false })),
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

  return (
    <div className={styles.section}>
      <input
        className="input tap"
        placeholder="A brief — or leave it to the agent"
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
      />
      <div className={styles.buttons}>
        <button
          type="button"
          className="btn btn-primary tap"
          disabled={Boolean(busy)}
          onClick={() => void generateBiome(brief.trim())}
        >
          Generate region
        </button>
        <button
          type="button"
          className="btn btn-primary tap"
          disabled={Boolean(busy)}
          onClick={() => void forgeFoe(brief.trim())}
        >
          Forge a foe
        </button>
      </div>

      <span className="label">
        Round <span className="num">{world.round}</span>
        {world.order.length > 0 && world.order[world.turnIdx] && (
          <> · {world.order[world.turnIdx].name}</>
        )}
      </span>

      <div className={styles.buttons}>
        <button type="button" className="btn btn-secondary tap" onClick={rollInitiative}>
          Roll initiative
        </button>
        <button
          type="button"
          className="btn btn-secondary tap"
          disabled={world.order.length === 0}
          onClick={nextTurn}
        >
          Next turn
        </button>
      </div>

      {world.biome?.name && <p className={styles.hint}>Region — {world.biome.name}</p>}
      {(world.enemies || []).length > 0 && (
        <p className={styles.hint}>
          In play — {world.enemies.map((e) => `${e.name} ${e.hp}/${e.maxHp}`).join(' · ')}
        </p>
      )}
    </div>
  );
}
