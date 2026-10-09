import { useState } from 'react';
import { useWorld } from '../../store/world';
import styles from './Drawer.module.css';

/** The five quick actions, and a line of the GM's own. */
const QUICK: { label: string; declare: string }[] = [
  { label: 'Press deeper', declare: 'The party presses deeper, alert and deliberate.' },
  { label: 'Short rest', declare: 'The party takes a short rest.' },
  { label: 'Perception', declare: 'The party stops to look, listen and search the area carefully.' },
  { label: 'Escalate', declare: 'Something goes wrong — raise the pressure on the party now.' },
];

export default function DrawerScene() {
  const scene = useWorld((s) => s.world.scene);
  const busy = useWorld((s) => s.busy);
  const advance = useWorld((s) => s.advance);

  const [text, setText] = useState('');

  const go = (declare: string) => {
    if (busy) return;
    setText('');
    void advance(declare);
  };

  return (
    <div className={styles.section}>
      <span className="label">{scene || 'No scene yet'}</span>

      <textarea
        className="input"
        rows={3}
        placeholder="Say or do something — ↵ to declare"
        value={text}
        disabled={Boolean(busy)}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            go(text.trim());
          }
        }}
      />

      <button
        type="button"
        className="btn btn-primary tap"
        disabled={Boolean(busy)}
        onClick={() => go(text.trim())}
      >
        Advance
      </button>

      <div className={styles.buttons}>
        {QUICK.map((q) => (
          <button
            key={q.label}
            type="button"
            className="btn btn-secondary tap"
            disabled={Boolean(busy)}
            onClick={() => go(q.declare)}
          >
            {q.label}
          </button>
        ))}
      </div>
    </div>
  );
}
