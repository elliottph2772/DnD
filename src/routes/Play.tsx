import { useEffect, useMemo, useState } from 'react';
import GmDrawer from '../components/drawer/GmDrawer';
import RosterPanel from '../components/RosterPanel';
import SeatList from '../components/SeatList';
import Sheet from '../components/sheet/Sheet';
import Wizard from '../components/wizard/Wizard';
import type { Route } from '../lib/route';
import { blankCharacter, pendingChat } from '../lib/world';
import { useWorld } from '../store/world';
import styles from './Shell.module.css';

/**
 * The player view. Reads the world, writes its own seat, inserts into chat —
 * nothing else.
 *
 * A GM opening this page with a verified token also gets the remote drawer, so
 * they can run the table from the same phone everyone else is using. `lock=1`
 * on the player invite hides the unlock field entirely, so handing out the
 * invite never hints that there is a GM door here at all.
 */
export default function Play({ route }: { route: Route }) {
  const conn = useWorld((s) => s.conn);
  const status = useWorld((s) => s.status);
  const world = useWorld((s) => s.world);
  const slot = useWorld((s) => s.slot);
  const connect = useWorld((s) => s.connect);
  const declare = useWorld((s) => s.declare);
  const party = useWorld((s) => s.party);
  const setMyCharacter = useWorld((s) => s.setMyCharacter);
  const addToRoster = useWorld((s) => s.addToRoster);
  const isGM = useWorld((s) => s.isGM);
  const unlockGM = useWorld((s) => s.unlockGM);
  const lockGM = useWorld((s) => s.lockGM);
  // Select the raw inputs and derive here. `s.pending()` filters, so it returns
  // a new array on every call; as a selector that reference never settles and
  // Zustand's useSyncExternalStore snapshot loops until React gives up. The
  // store keeps pending() for callers outside React.
  const chat = useWorld((s) => s.chat);
  const cursor = useWorld((s) => s.world.chat_cursor);
  const pending = useMemo(() => pendingChat(chat, cursor), [chat, cursor]);

  const [text, setText] = useState('');
  const [pass, setPass] = useState('');
  // Which roster character sits down, and whether the wizard is open. The
  // wizard now builds for the roster, not for a seat — a character exists
  // before it joins anything.
  const [chosen, setChosen] = useState('');
  const [building, setBuilding] = useState(false);

  useEffect(() => {
    if (route.code && conn === 'idle') void connect(route.code);
  }, [route.code, conn, connect]);

  // The GM's half of this page: the drawer once verified, or the passphrase
  // door before that. A `lock=1` invite shows neither.
  const gm = isGM ? (
    <GmDrawer onLock={lockGM} />
  ) : route.locked ? null : (
    <section className={styles.section}>
      <div className={styles.row}>
        <input
          className="input"
          placeholder="GM passphrase — three words"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          spellCheck={false}
        />
        <button
          type="button"
          className="btn btn-secondary tap"
          disabled={conn !== 'live' || !pass.trim()}
          onClick={() => void unlockGM(pass)}
        >
          Unlock
        </button>
      </div>
    </section>
  );

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

  const me = slot > 0 ? party[slot - 1] : null;

  // Building for the roster. A character is made before it joins a campaign,
  // and belongs to the person rather than to the chair.
  if (building) {
    return (
      <div className={styles.page}>
        <header className={styles.head}>
          <h1 className={styles.title}>A new character</h1>
          <span className={styles.status}>Yours, for any campaign</span>
        </header>
        {gm}
        <Wizard
          character={blankCharacter()}
          onDone={(next) => {
            void addToRoster(next).then((id) => {
              if (id) setChosen(id);
              setBuilding(false);
            });
          }}
        />
      </div>
    );
  }

  // A built character gets the sheet; the lobby below is for anyone still
  // choosing a seat.
  if (me?.built) {
    return (
      <div className={styles.page}>
        <header className={styles.head}>
          <h1 className={styles.title}>{world.campaign || route.code}</h1>
          <span className={`${styles.status} ${conn === 'live' ? styles.live : ''}`}>
            Seat {slot} · {status || 'Connecting…'}
          </span>
        </header>
        {gm}
        <Sheet
          character={me}
          world={world}
          pending={pending}
          onChange={(next) => setMyCharacter(next)}
          onDeclare={(body) => void declare(body)}
        />
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

      {gm}

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
        <RosterPanel chosen={chosen} onChoose={setChosen} onNew={() => setBuilding(true)} />
      </section>

      <section className={styles.section}>
        <span className="label">The table</span>
        {!chosen && (
          <p className={styles.hint}>Choose a character above, then take a seat.</p>
        )}
        <SeatList claimable characterId={chosen} />
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
