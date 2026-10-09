import { useWorld } from '../../store/world';
import styles from './Console.module.css';

/**
 * The fixed bar across the top: who we are, which campaign, how far into the
 * session, and the two pressure gauges. Threat and corruption read as meters
 * rather than numbers in a list — they are the dials the GM watches.
 */
export default function ConsoleHeader() {
  const world = useWorld((s) => s.world);
  const code = useWorld((s) => s.code);
  const party = useWorld((s) => s.party);

  const built = party.filter((p) => p.built);
  const level = built.length
    ? Math.round(built.reduce((a, p) => a + p.level, 0) / built.length)
    : 0;

  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>
        <span className={styles.brandName}>Nocturne</span>
        <span className={styles.brandSub}>GM Agent</span>
      </div>
      <div className={styles.divider} />

      <div className={styles.field}>
        <span className="label">Campaign</span>
        <span className={styles.fieldValue}>
          {world.campaign || 'Untitled'} · <span className="num">{code}</span>
        </span>
      </div>

      <div className={styles.field}>
        <span className="label">Session</span>
        <span className={styles.fieldValue}>
          Round <span className="num">{world.round}</span>
          {level > 0 && (
            <>
              {' '}
              · Party lvl <span className="num">{level}</span>
            </>
          )}
        </span>
      </div>

      <div className={styles.spacer} />

      {(
        [
          ['Threat', world.threat, styles.threatFill],
          ['Corruption', world.corruption, styles.corruptionFill],
        ] as const
      ).map(([label, value, fill]) => (
        <div key={label} className={styles.meter}>
          <div className={styles.meterHead}>
            <span>{label}</span>
            <span className={`${styles.meterValue} num`}>{value}</span>
          </div>
          <div className={styles.meterTrack}>
            <div
              className={`${styles.meterFill} ${fill}`}
              style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
            />
          </div>
        </div>
      ))}
    </header>
  );
}
