import { useState } from 'react';
import {
  exitsFrom,
  isRevealed,
  liveScenes,
  locationIn,
  moduleFor,
  npcIn,
} from '../../lib/module';
import { useWorld } from '../../store/world';
import styles from './Console.module.css';

/**
 * The campaign module, from the GM's side: where the party is, who is standing
 * there, what they have not found yet, and which scenes are still loaded.
 *
 * Revealing a secret here is what hands it to the agent — until the GM marks it
 * found, `moduleBrief` keeps it out of the prompt entirely.
 */
export default function ModuleTab() {
  const state = useWorld((s) => s.world.module);
  const moveParty = useWorld((s) => s.moveParty);
  const patchWorld = useWorld((s) => s.patchWorld);

  const [open, setOpen] = useState('');
  const module = moduleFor(state);

  if (!module || !state) {
    return (
      <div className={styles.panel}>
        <p className={styles.hint}>
          This campaign is not running a module — the agent is inventing it as it goes.
        </p>
      </div>
    );
  }

  const here = locationIn(module, state.at);
  const exits = exitsFrom(module, state);
  const scenes = liveScenes(module, state);

  const revealSecret = (ref: string, index: number) =>
    void patchWorld({
      module: { ...state, revealed: [...state.revealed, `${ref}:${index}`] },
    });

  return (
    <div className={styles.panel}>
      <span className="label">{module.title}</span>
      <p className={styles.hint}>
        v{module.version} · {module.tone} · levels {module.levels[0]}–{module.levels[1]}
      </p>

      <span className="label">The party is at</span>
      <div className={styles.card}>
        <span>{here?.name ?? state.at}</span>
        <span className={styles.hint}>{here?.summary}</span>
      </div>

      {exits.length > 0 && (
        <>
          <span className="label">Move them</span>
          {here?.exits.map((exit) => (
            <button
              key={exit.to}
              type="button"
              className="btn btn-secondary tap"
              onClick={() => void moveParty(exit.to)}
            >
              {exit.text}
            </button>
          ))}
        </>
      )}

      {here?.npcs.length ? (
        <>
          <span className="label">Standing here</span>
          {here.npcs.map((id) => {
            const npc = npcIn(module, id);
            if (!npc) return null;
            const shown = open === id;
            const known = isRevealed(state, npc.id, 0);
            return (
              <div key={id} className={styles.card}>
                <button
                  type="button"
                  className={styles.seatHead}
                  aria-expanded={shown}
                  onClick={() => setOpen(shown ? '' : id)}
                >
                  <span className={styles.seatName}>{npc.name}</span>
                  <span className={styles.seatCls}>{npc.role}</span>
                </button>
                <span className={styles.hint}>{npc.summary}</span>
                {shown && (
                  <>
                    <p className={styles.hint}>{npc.text}</p>
                    <p className={styles.hint}>
                      <strong>Wants.</strong> {npc.wants}
                    </p>
                    {npc.secret && (
                      <>
                        <p className={styles.hint}>
                          <strong>Holding back.</strong> {npc.secret}
                        </p>
                        {!known && (
                          <button
                            type="button"
                            className="btn btn-secondary tap"
                            onClick={() => revealSecret(npc.id, 0)}
                          >
                            The party earned this
                          </button>
                        )}
                        {known && <span className={styles.hint}>The party knows this.</span>}
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </>
      ) : null}

      {here?.secrets?.length ? (
        <>
          <span className="label">Still to find here</span>
          {here.secrets.map((secret, i) => {
            const known = isRevealed(state, here.id, i);
            return (
              <div key={secret} className={styles.card}>
                <span className={`${styles.hint} ${known ? '' : styles.dimSecret}`}>{secret}</span>
                {known ? (
                  <span className={styles.hint}>Found.</span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary tap"
                    onClick={() => revealSecret(here.id, i)}
                  >
                    They found it
                  </button>
                )}
              </div>
            );
          })}
        </>
      ) : null}

      {scenes.length > 0 && (
        <>
          <span className="label">Scenes still loaded</span>
          {scenes.map((scene) => (
            <div key={scene.id} className={styles.card}>
              <span>{scene.title}</span>
              <span className={styles.hint}>
                <strong>Fires when.</strong> {scene.trigger}
              </span>
            </div>
          ))}
        </>
      )}

      <span className="label">Canon</span>
      <p className={styles.hint}>
        The agent is told it may not contradict these. Where the party goes off the map it
        improvises in tone and writes what it invented into the journal.
      </p>
    </div>
  );
}
