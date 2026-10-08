import { useWorld } from '../store/world';
import styles from './SeatList.module.css';

const SLOTS = [1, 2, 3, 4];

interface Props {
  /** Show Claim / Leave controls. The console watches; players sit down. */
  claimable?: boolean;
}

/**
 * The four seats, live. Proof that sync works: claim one here and it dims on
 * every other screen at the table within the round-trip.
 */
export default function SeatList({ claimable = false }: Props) {
  const party = useWorld((s) => s.party);
  const claims = useWorld((s) => s.claims);
  const mySlot = useWorld((s) => s.slot);
  const claiming = useWorld((s) => s.claiming);
  const myId = useWorld((s) => s.clientId);
  const claimSeat = useWorld((s) => s.claimSeat);
  const leaveSeat = useWorld((s) => s.leaveSeat);

  return (
    <div className={styles.list}>
      {SLOTS.map((slot) => {
        const char = party[slot - 1];
        const holder = claims[slot] || '';
        const isMine = mySlot === slot;
        const taken = Boolean(holder) && holder !== myId;

        return (
          <div
            key={slot}
            className={[styles.seat, taken && !isMine ? styles.taken : '', isMine ? styles.mine : '']
              .filter(Boolean)
              .join(' ')}
          >
            <div className={styles.who}>
              <span className="label">Seat {slot}</span>
              {char?.name ? (
                <span className={styles.name}>
                  {char.name} · {char.cls || 'unclassed'} · level <span className="num">{char.level}</span>
                </span>
              ) : (
                <span className={`${styles.name} ${styles.empty}`}>
                  {taken ? 'claimed, building a character' : 'empty'}
                </span>
              )}
            </div>

            {claimable && (
              <div className={styles.action}>
                {isMine ? (
                  <button type="button" className="btn btn-secondary tap" onClick={() => void leaveSeat()}>
                    Leave slot
                  </button>
                ) : taken ? (
                  <span className={styles.note}>taken</span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary tap"
                    disabled={claiming === slot}
                    onClick={() => void claimSeat(slot)}
                  >
                    {claiming === slot ? 'Claiming…' : 'Claim'}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
