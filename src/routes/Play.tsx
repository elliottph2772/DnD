import { useEffect, useState } from 'react';
import SeatList from '../components/SeatList';
import type { Route } from '../lib/route';
import { useWorld } from '../store/world';
import styles from './Shell.module.css';

/**
 * The player view. Reads the world, writes its own seat, inserts into chat —
 * nothing else. Steps 4–6 of docs/BUILD-PLAN.md add the six-step wizard, the
 * sheet, casting and the read-only condition list.
 */
export default function Play({ route }: { route: Route }) {
  const conn = useWorld((s) => s.conn);
  const status = useWorld((s) => s.status);
  const world = useWorld((s) => s.world);
  const slot = useWorld((s) => s.slot);
  const connect = useWorld((s) => s.connect);
  const declare = useWorld((s) => s.declare);
  const pending = useWorld((s) => s.pending());

  const [text, setText] = useState('');

  useEffect(() => {
    if (route.code && conn === 'idle') void connect(route.code);
  }, [route.code, conn, connect]);

  const send = () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    void declare(body);
  };

  if (!route.code) {
    return (
      <div className={styles.page}>
        <header className={styles.head}>
          <h1 className={styles.title}>No campaign in this link</h1>
        </header>
        <p className={styles.hint}>Ask your GM for the invite link.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>{world.campaign || route.code}</h1>
        <span className={`${styles.status} ${conn === 'live' ? styles.live : ''}`}>
          {slot ? `Seat ${slot}` : 'No seat'} · {status || 'Connecting…'}
        </span>
      </header>

      <section className={styles.section}>
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
      </section>

      <section className={styles.section}>
        <span className="label">The table</span>
        <SeatList claimable />
      </section>

      {slot > 0 && (
        <section className={styles.section}>
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
        </section>
      )}
    </div>
  );
}
