import { useEffect, useState } from 'react';
import SeatList from '../components/SeatList';
import { gmLink, playerLink, type Route } from '../lib/route';
import { useWorld } from '../store/world';
import styles from './Shell.module.css';

/**
 * The GM console. It shows nothing — not a campaign list, not a world — until
 * gm-agent confirms the credential, because `campaigns` stays readable by the
 * publishable key and this page is served publicly.
 *
 * Steps 7–8 of docs/BUILD-PLAN.md fill this out: transcript, quick actions,
 * Combat / Biome / Bestiary / World / Sync tabs.
 */
export default function Console({ route }: { route: Route }) {
  const conn = useWorld((s) => s.conn);
  const status = useWorld((s) => s.status);
  const code = useWorld((s) => s.code);
  const isGM = useWorld((s) => s.isGM);
  const world = useWorld((s) => s.world);
  const campaigns = useWorld((s) => s.campaigns);
  const hostedBase = useWorld((s) => s.hostedBase);
  const gmToken = useWorld((s) => s.gmToken);
  const connect = useWorld((s) => s.connect);
  const unlockGM = useWorld((s) => s.unlockGM);

  const [codeInput, setCodeInput] = useState(route.code);
  const [pass, setPass] = useState('');

  // A GM link carries both halves, so it connects on its own.
  useEffect(() => {
    if (route.code && route.gmToken && conn === 'idle') void connect(route.code);
  }, [route.code, route.gmToken, conn, connect]);

  const locked = !isGM;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>D&amp;D Game Master Console</h1>
        <span className={`${styles.status} ${conn === 'live' ? styles.live : ''}`}>
          {status || 'Not connected'}
        </span>
      </header>

      {locked ? (
        <section className={styles.section}>
          <span className="label">Game Master</span>
          <p className={styles.hint}>
            This console runs the world. Open it with your GM link, or enter a campaign code and its
            passphrase.
          </p>
          <div className={styles.row}>
            <input
              className="input"
              placeholder="Campaign code"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              autoCapitalize="characters"
              spellCheck={false}
            />
            <button
              type="button"
              className="btn btn-secondary tap"
              onClick={() => void connect(codeInput)}
              disabled={!codeInput.trim()}
            >
              Connect
            </button>
          </div>
          <div className={styles.row}>
            <input
              className="input"
              placeholder="Passphrase — three words"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              spellCheck={false}
            />
            <button
              type="button"
              className="btn btn-primary tap"
              onClick={() => void unlockGM(pass)}
              disabled={conn !== 'live' || !pass.trim()}
            >
              Unlock
            </button>
          </div>
          {conn !== 'live' && (
            <p className={styles.hint}>Connect to the campaign first, then unlock.</p>
          )}
        </section>
      ) : (
        <>
          <section className={styles.section}>
            <span className="label">{world.campaign || 'Untitled campaign'}</span>
            <p className={styles.scene}>{world.scene || 'No scene yet.'}</p>
            <p className={styles.hint}>
              Round <span className="num">{world.round}</span> · threat{' '}
              <span className="num">{world.threat}</span> · corruption{' '}
              <span className="num">{world.corruption}</span>
            </p>
          </section>

          <section className={styles.section}>
            <span className="label">Party</span>
            <SeatList />
          </section>

          <section className={styles.section}>
            <span className="label">Links</span>
            <p className={styles.hint}>Player invite — anyone with it can take a seat.</p>
            <input className="input" readOnly value={playerLink(hostedBase, code)} />
            <p className={styles.hint}>
              Game Master link — anyone holding it is the GM. Treat it like a password.
            </p>
            <input className="input" readOnly value={gmLink(hostedBase, code, gmToken)} />
          </section>

          <section className={styles.section}>
            <span className="label">Saved campaigns</span>
            {campaigns.length === 0 ? (
              <p className={styles.hint}>None yet.</p>
            ) : (
              <div className={styles.row}>
                {campaigns.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="btn btn-secondary tap"
                    onClick={() => void connect(c.id)}
                  >
                    {c.id}
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
