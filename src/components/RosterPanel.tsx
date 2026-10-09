import { describe, ordered, playable } from '../lib/roster';
import { useWorld } from '../store/world';
import styles from './RosterPanel.module.css';

/**
 * Your characters. They belong to you rather than to any campaign, so the
 * same character can play several tables — see lib/roster.ts for why a seat
 * holds a copy rather than the row itself.
 *
 * Choosing one here is what the seat list claims with.
 */
export default function RosterPanel({
  chosen,
  onChoose,
  onNew,
}: {
  chosen: string;
  onChoose: (id: string) => void;
  onNew: () => void;
}) {
  const roster = useWorld((s) => s.roster);
  const removeFromRoster = useWorld((s) => s.removeFromRoster);

  const ready = playable(ordered(roster));

  return (
    <div className={styles.panel}>
      <span className="label">Your characters</span>

      {ready.length === 0 ? (
        <p className={styles.hint}>
          None yet. Make one — it stays yours, and can play more than one campaign.
        </p>
      ) : (
        ready.map((entry) => {
          const picked = chosen === entry.id;
          return (
            <div key={entry.id} className={styles.row}>
              <button
                type="button"
                className={styles.card}
                aria-pressed={picked}
                onClick={() => onChoose(entry.id)}
              >
                <span className={styles.name}>{entry.data.name || 'Unnamed'}</span>
                <span className={styles.sub}>{describe(entry)}</span>
              </button>
              <button
                type="button"
                className={`btn btn-ghost tap ${styles.drop}`}
                aria-label={`Delete ${entry.data.name || 'character'}`}
                onClick={() => void removeFromRoster(entry.id)}
              >
                ✕
              </button>
            </div>
          );
        })
      )}

      <button type="button" className="btn btn-secondary tap" onClick={onNew}>
        New character
      </button>
    </div>
  );
}
