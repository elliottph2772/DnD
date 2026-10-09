import { useState } from 'react';
import type { ModelChoice } from '../../lib/agent';
import { gmLink, playerLink } from '../../lib/route';
import { useWorld } from '../../store/world';
import styles from './Console.module.css';

const MODELS: { value: ModelChoice; label: string; note: string }[] = [
  { value: 'opus', label: 'Opus', note: 'the default — narration is the product' },
  { value: 'sonnet', label: 'Sonnet', note: 'half the cost, still strong' },
  { value: 'haiku', label: 'Haiku', note: 'cheapest, for a grinding session' },
];

/** Connection, links, model, and the campaign list with its delete confirm. */
export default function SyncTab() {
  const code = useWorld((s) => s.code);
  const conn = useWorld((s) => s.conn);
  const status = useWorld((s) => s.status);
  const hostedBase = useWorld((s) => s.hostedBase);
  const gmToken = useWorld((s) => s.gmToken);
  const campaigns = useWorld((s) => s.campaigns);
  const model = useWorld((s) => s.model);
  const setModel = useWorld((s) => s.setModel);
  const connect = useWorld((s) => s.connect);
  const dropCampaign = useWorld((s) => s.dropCampaign);

  const [confirm, setConfirm] = useState('');
  const [copied, setCopied] = useState('');

  const copy = (what: string, value: string) => {
    void navigator.clipboard?.writeText(value).then(
      () => {
        setCopied(what);
        setTimeout(() => setCopied(''), 1600);
      },
      () => setCopied(''),
    );
  };

  return (
    <div className={styles.panel}>
      <div className={styles.rowBetween}>
        <span className="label">Connection</span>
        <span className={styles.hint}>{status || conn}</span>
      </div>

      <span className="label">Model</span>
      <select
        className="input"
        value={model}
        onChange={(e) => setModel(e.target.value as ModelChoice)}
      >
        {MODELS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label} — {m.note}
          </option>
        ))}
      </select>

      <span className="label">Player invite</span>
      <p className={styles.hint}>Anyone with it can take a seat.</p>
      <input className="input" readOnly value={playerLink(hostedBase, code)} />
      <button
        type="button"
        className="btn btn-secondary tap"
        onClick={() => copy('player', playerLink(hostedBase, code))}
      >
        {copied === 'player' ? 'Copied' : 'Copy'}
      </button>

      <span className="label">Game Master link</span>
      <p className={styles.hint}>Anyone holding it is the GM. Treat it like a password.</p>
      <input className="input" readOnly value={gmLink(hostedBase, code, gmToken)} />
      <button
        type="button"
        className="btn btn-secondary tap"
        onClick={() => copy('gm', gmLink(hostedBase, code, gmToken))}
      >
        {copied === 'gm' ? 'Copied' : 'Copy'}
      </button>

      <span className="label">Saved campaigns</span>
      {campaigns.length === 0 ? (
        <p className={styles.hint}>None yet.</p>
      ) : (
        <div className={styles.card}>
          {campaigns.map((c) => (
            <div key={c.id} className={styles.rowBetween}>
              <span className="num">{c.id}</span>
              <span className={styles.row}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={c.id === code}
                  onClick={() => void connect(c.id)}
                >
                  Open
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setConfirm(c.id)}
                >
                  Delete
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {confirm && (
        <div className={styles.backdrop} role="dialog" aria-modal="true">
          <div className={styles.dialog}>
            <h2 className={styles.dialogTitle}>Delete {confirm}?</h2>
            <p className={styles.dialogBody}>
              This removes the campaign and all four character sheets from the database. Anyone
              holding its invite link loses the game. There is no undo.
            </p>
            {confirm === code && (
              <p className={styles.dialogWarn}>
                This is the campaign you are connected to right now.
              </p>
            )}
            <div className={styles.dialogButtons}>
              <button
                type="button"
                className="btn btn-secondary tap"
                onClick={() => setConfirm('')}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn tap ${styles.danger}`}
                onClick={() => {
                  const id = confirm;
                  setConfirm('');
                  void dropCampaign(id);
                }}
              >
                Delete campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
