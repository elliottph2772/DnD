import { useState } from 'react';
import { useWorld } from '../../store/world';
import styles from './Drawer.module.css';

/** The cycle a quest walks through on tap. */
const NEXT_STATUS = { active: 'done', done: 'failed', failed: 'active' } as const;

/** File a journal entry, and tap a quest to move it along. */
export default function DrawerLog() {
  const world = useWorld((s) => s.world);
  const patchWorld = useWorld((s) => s.patchWorld);

  const [title, setTitle] = useState('');
  const [text, setText] = useState('');

  const file = () => {
    const t = title.trim();
    if (!t) return;
    setTitle('');
    setText('');
    void patchWorld({ journal: [...world.journal, { title: t, text: text.trim() }].slice(-20) });
  };

  const cycle = (questTitle: string) =>
    void patchWorld({
      quests: world.quests.map((q) =>
        q.title === questTitle ? { ...q, status: NEXT_STATUS[q.status] } : q,
      ),
    });

  return (
    <div className={styles.section}>
      <input
        className="input tap"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        className="input tap"
        placeholder="What happened"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') file();
        }}
      />
      <button
        type="button"
        className="btn btn-secondary tap"
        disabled={!title.trim()}
        onClick={file}
      >
        File
      </button>

      <span className="label">Quests</span>
      {world.quests.length === 0 ? (
        <p className={styles.hint}>Nothing on the board.</p>
      ) : (
        world.quests.map((q) => (
          <button key={q.title} type="button" className={styles.quest} onClick={() => cycle(q.title)}>
            <span
              className={
                q.status === 'done' ? styles.done : q.status === 'failed' ? styles.failed : undefined
              }
            >
              {q.title}
            </span>
            <span className={styles.status3}>{q.status}</span>
          </button>
        ))
      )}

      {world.journal.length > 0 && (
        <>
          <span className="label">Filed</span>
          {world.journal.slice(-6).reverse().map((entry, i) => (
            <p key={i} className={styles.hint}>
              {entry.title}
            </p>
          ))}
        </>
      )}
    </div>
  );
}
