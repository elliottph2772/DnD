import { useState } from 'react';
import { useWorld } from '../../store/world';
import styles from './Console.module.css';

/** The cycle a quest title walks through on tap. */
const NEXT_STATUS = { active: 'done', done: 'failed', failed: 'active' } as const;

/** Scene, pressure dials, quests and the journal. No model calls here. */
export default function WorldTab() {
  const world = useWorld((s) => s.world);
  const patchWorld = useWorld((s) => s.patchWorld);

  const [scene, setScene] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');

  const setScore = (key: 'threat' | 'corruption', by: number) =>
    void patchWorld({ [key]: Math.max(0, Math.min(100, world[key] + by)) });

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
    <div className={styles.panel}>
      <span className="label">Scene</span>
      <input
        className="input"
        placeholder={world.scene || 'Name the scene'}
        value={scene}
        onChange={(e) => setScene(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && scene.trim()) {
            void patchWorld({ scene: scene.trim() });
            setScene('');
          }
        }}
      />

      {(['threat', 'corruption'] as const).map((key) => (
        <div key={key} className={styles.row}>
          <span className="label" style={{ flex: 1 }}>
            {key} <span className="num">{world[key]}</span>
          </span>
          <button type="button" className={styles.nudge} onClick={() => setScore(key, -5)}>
            −5
          </button>
          <button type="button" className={styles.nudge} onClick={() => setScore(key, 5)}>
            +5
          </button>
        </div>
      ))}

      <span className="label">Quests</span>
      {world.quests.length === 0 ? (
        <p className={styles.hint}>Nothing on the board.</p>
      ) : (
        <div className={styles.card}>
          {world.quests.map((q) => (
            <button
              key={q.title}
              type="button"
              className={styles.seatHead}
              onClick={() => cycle(q.title)}
            >
              <span className={styles.seatName}>{q.title}</span>
              <span className={styles.seatCls}>{q.status}</span>
            </button>
          ))}
        </div>
      )}

      <span className="label">Log</span>
      <input
        className="input"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        className="input"
        placeholder="What happened"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') file();
        }}
      />
      <button type="button" className="btn btn-secondary tap" onClick={file} disabled={!title.trim()}>
        File
      </button>

      {world.journal.length > 0 && (
        <div className={styles.card}>
          {world.journal.slice(-8).reverse().map((entry, i) => (
            <div key={i} className={styles.rowBetween}>
              <span>{entry.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
