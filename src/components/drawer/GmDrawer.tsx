import { useState } from 'react';
import { useWorld } from '../../store/world';
import DrawerLog from './DrawerLog';
import DrawerParty from './DrawerParty';
import DrawerScene from './DrawerScene';
import DrawerWorld from './DrawerWorld';
import styles from './Drawer.module.css';

const SECTIONS = ['Scene', 'World', 'Party', 'Log'] as const;
type Section = (typeof SECTIONS)[number];

/**
 * The whole console folded onto the phone the GM is holding at the table.
 * Shown on the hosted player page once `verify` has confirmed the token, so a
 * GM can sit with everyone else and still run the world.
 *
 * Everything here goes through the same store actions the console uses, which
 * means gm-agent, which means the credential is checked server side on every
 * one of them. Hiding the drawer is a convenience, not the security boundary.
 */
export default function GmDrawer({ onLock }: { onLock: () => void }) {
  const busy = useWorld((s) => s.busy);
  const note = useWorld((s) => s.note);

  const [section, setSection] = useState<Section>('Scene');
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <div className={styles.head}>
        <span className={styles.title}>Game Master</span>
        <div className={styles.spacer} />
        <button type="button" className="btn btn-secondary tap" onClick={() => setOpen(true)}>
          GM controls
        </button>
      </div>
    );
  }

  return (
    <div className={styles.drawer}>
      <div className={styles.head}>
        <span className={styles.title}>Game Master</span>
        <div className={styles.spacer} />
        <button type="button" className="btn btn-secondary tap" onClick={() => setOpen(false)}>
          Hide GM
        </button>
        {/* Lock drops the credential from this device — for handing the phone
            across the table, or putting it down in a room full of players. */}
        <button type="button" className="btn btn-secondary tap" onClick={onLock}>
          Lock
        </button>
      </div>

      <div className={styles.tabs} role="tablist">
        {SECTIONS.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={section === name}
            onClick={() => setSection(name)}
          >
            {name}
          </button>
        ))}
      </div>

      <div className={styles.status}>
        {busy && <span className={styles.busy}>{busy}</span>}
        {note && <p className={styles.note}>{note}</p>}
      </div>

      {section === 'Scene' && <DrawerScene />}
      {section === 'World' && <DrawerWorld />}
      {section === 'Party' && <DrawerParty />}
      {section === 'Log' && <DrawerLog />}
    </div>
  );
}
