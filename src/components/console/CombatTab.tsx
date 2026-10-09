import { useWorld } from '../../store/world';
import ConditionPicker from '../ConditionPicker';
import type { Combatant } from '../../types';
import styles from './Console.module.css';

const d20 = () => Math.floor(Math.random() * 20) + 1;

/**
 * Combat: initiative, enemies, the round clock, and the conditions block.
 * The conditions block itself is ConditionPicker, shared with the remote GM
 * drawer so the two cannot drift apart.
 */
export default function CombatTab() {
  const world = useWorld((s) => s.world);
  const party = useWorld((s) => s.party);
  const patchWorld = useWorld((s) => s.patchWorld);
  const nextRound = useWorld((s) => s.nextRound);

  const seated = party.map((c, i) => ({ c, slot: i + 1 })).filter((x) => x.c.built);

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

      <span className="label">Conditions</span>
      <ConditionPicker />
    </div>
  );
}
