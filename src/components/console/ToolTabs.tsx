import { useState } from 'react';
import BestiaryTab from './BestiaryTab';
import BiomeTab from './BiomeTab';
import CombatTab from './CombatTab';
import SyncTab from './SyncTab';
import WorldTab from './WorldTab';
import styles from './Console.module.css';

const TABS = ['Combat', 'Biome', 'Bestiary', 'World', 'Sync'] as const;
type Tab = (typeof TABS)[number];

/** The right-hand column: five tools, one at a time. */
export default function ToolTabs() {
  const [tab, setTab] = useState<Tab>('Combat');

  return (
    <aside className={styles.right}>
      <div className={styles.tabs} role="tablist">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={tab === name}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>

      <div className={styles.scroll}>
        {tab === 'Combat' && <CombatTab />}
        {tab === 'Biome' && <BiomeTab />}
        {tab === 'Bestiary' && <BestiaryTab />}
        {tab === 'World' && <WorldTab />}
        {tab === 'Sync' && <SyncTab />}
      </div>
    </aside>
  );
}
