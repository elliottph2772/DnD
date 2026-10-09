import { useEffect, useState } from 'react';
import consoleStyles from '../components/console/Console.module.css';
import ConsoleHeader from '../components/console/ConsoleHeader';
import PartyRail from '../components/console/PartyRail';
import ToolTabs from '../components/console/ToolTabs';
import Transcript from '../components/console/Transcript';
import { createCampaign } from '../lib/agent';
import type { Route } from '../lib/route';
import { useWorld } from '../store/world';
import styles from './Shell.module.css';

/**
 * The GM console. It shows nothing — not a campaign list, not a world — until
 * gm-agent confirms the credential, because `campaigns` stays readable by the
 * publishable key and this page is served publicly.
 */
export default function Console({ route }: { route: Route }) {
  const conn = useWorld((s) => s.conn);
  const status = useWorld((s) => s.status);
  const isGM = useWorld((s) => s.isGM);
  const sbUrl = useWorld((s) => s.sbUrl);
  const connect = useWorld((s) => s.connect);
  const unlockGM = useWorld((s) => s.unlockGM);

  const [codeInput, setCodeInput] = useState(route.code);
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [minting, setMinting] = useState(false);
  const [minted, setMinted] = useState('');

  // A GM link carries both halves, so it connects on its own.
  useEffect(() => {
    if (route.code && route.gmToken && conn === 'idle') void connect(route.code);
  }, [route.code, route.gmToken, conn, connect]);

  // Creating a campaign is a server action: gm-agent mints the code and the
  // credentials together, because migration 0003 took inserts away from the
  // publishable key.
  const mint = async () => {
    if (minting) return;
    setMinting(true);
    try {
      const made = await createCampaign(sbUrl, name.trim() || 'A new campaign');
      setMinted(
        `${made.code} — passphrase: ${made.gm_pass}. Write it down; this is the only time it is shown.`,
      );
      window.location.hash = `#gm&c=${made.code}&t=${made.gm_token}`;
      window.location.reload();
    } catch (e) {
      setMinted((e as Error).message);
    } finally {
      setMinting(false);
    }
  };

  if (!isGM) {
    return (
      <div className={styles.page}>
        <header className={styles.head}>
          <h1 className={styles.title}>D&amp;D Game Master Console</h1>
          <span className={`${styles.status} ${conn === 'live' ? styles.live : ''}`}>
            {status || 'Not connected'}
          </span>
        </header>

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

        <section className={styles.section}>
          <span className="label">Or start a new campaign</span>
          <div className={styles.row}>
            <input
              className="input"
              placeholder="Campaign name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-secondary tap"
              onClick={() => void mint()}
              disabled={minting}
            >
              {minting ? 'Minting…' : 'Create'}
            </button>
          </div>
          {minted && <p className={styles.hint}>{minted}</p>}
        </section>
      </div>
    );
  }

  // The unlocked console is its own full-height app shell, not a page inside
  // the reading measure the player view wants.
  return (
    <div className={consoleStyles.shell}>
      <ConsoleHeader />
      <div className={consoleStyles.grid}>
        <PartyRail />
        <Transcript />
        <ToolTabs />
      </div>
    </div>
  );
}
