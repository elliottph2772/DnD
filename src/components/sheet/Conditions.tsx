import type { Character } from '../../types';
import styles from './Sheet.module.css';

/**
 * The conditions riding on this character. Read-only by design: the GM applies
 * and clears them, and they tick down with the round clock.
 */
export default function Conditions({
  character,
  round,
}: {
  character: Character;
  round: number;
}) {
  const active = character.cond ?? [];

  return (
    <div className={styles.panel}>
      <span className="label">Conditions</span>
      {active.length === 0 ? (
        <p className={styles.hint}>Nothing is riding on you.</p>
      ) : (
        <div className={styles.condList}>
          {active.map((c) => {
            // `expires` is an absolute round number; 0 means it has no clock
            // and the GM releases it by hand.
            const left = c.expires > 0 ? Math.max(0, c.expires - round) : 0;
            return (
              <div key={`${c.name}-${c.expires}`} className={styles.cond}>
                <span className={styles.condName}>{c.name}</span>
                <span className={styles.condRounds}>
                  {c.expires > 0 ? `${left} rd` : c.label || 'until removed'}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <p className={styles.hint}>
        Conditions are applied and cleared by the GM. They tick down with the round.
      </p>
    </div>
  );
}
