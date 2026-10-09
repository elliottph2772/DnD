import { useMemo, useState } from 'react';
import { pendingChat } from '../../lib/world';
import { useWorld } from '../../store/world';
import styles from './Console.module.css';

/**
 * The quick actions above the declare box. Advance is not among them: it is
 * the dedicated send button beside the textarea, and it carries whatever the
 * GM typed. These five send a line of their own instead.
 */
const QUICK: { label: string; declare: string }[] = [
  { label: 'Press deeper', declare: 'The party presses deeper, alert and deliberate.' },
  { label: 'Short rest', declare: 'The party takes a short rest.' },
  { label: 'Perception', declare: 'The party stops to look, listen and search the area carefully.' },
  { label: 'Escalate', declare: 'Something goes wrong — raise the pressure on the party now.' },
];

/**
 * The centre column: scene, transcript, the GM's own declare box, and the
 * quick actions that drive an agent turn.
 */
export default function Transcript() {
  const world = useWorld((s) => s.world);
  const chat = useWorld((s) => s.chat);
  const busy = useWorld((s) => s.busy);
  const note = useWorld((s) => s.note);
  const advance = useWorld((s) => s.advance);

  const [text, setText] = useState('');

  const pending = useMemo(
    () => pendingChat(chat, world.chat_cursor),
    [chat, world.chat_cursor],
  );

  const go = (declare: string) => {
    if (busy) return;
    setText('');
    void advance(declare);
  };

  return (
    <main className={styles.centre}>
      <div className={styles.panelHead}>
        <span className="label">Scene</span>
        <span className={styles.fieldValue}>{world.scene || 'No scene yet'}</span>
        <div className={styles.spacer} />
        {busy && <span className={styles.busy}>{busy}</span>}
      </div>

      <div className={styles.feedScroll}>
        {world.feed.length === 0 ? (
          <p className={styles.hint}>Nothing has happened yet. Advance to begin.</p>
        ) : (
          world.feed.map((line, i) => (
            <div key={i} className={styles.line}>
              <span
                className={`${styles.speaker} ${
                  line.speaker.toUpperCase() === 'GM' ? styles.speakerGm : ''
                }`}
              >
                {line.speaker}
              </span>
              <p className={styles.lineText}>{line.text}</p>
            </div>
          ))
        )}
      </div>

      {pending.length > 0 && (
        <div className={styles.pending}>
          <span className="label">
            {pending.length} declaration{pending.length === 1 ? '' : 's'} awaiting the GM
          </span>
          {pending.map((line) => (
            <span key={line.id}>
              {line.speaker}: {line.text}
            </span>
          ))}
        </div>
      )}

      <div className={styles.composer}>
      <div className={styles.quick}>
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

      <div className={styles.composerRow}>
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
      </div>

      {note && <p className={styles.note}>{note}</p>}
      </div>
    </main>
  );
}
