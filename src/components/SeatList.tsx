import { useState } from 'react';
import { useWorld } from '../store/world';
import styles from './SeatList.module.css';

const SLOTS = [1, 2, 3, 4];

interface Props {
  /** Show Claim / Leave controls. The console watches; players sit down. */
  claimable?: boolean;
  /** Which roster character sits down when a seat is claimed. */
  characterId?: string;
}

/**
 * The four seats, live. Proof that sync works: claim one here and it dims on
 * every other screen at the table within the round-trip.
 */
export default function SeatList({ claimable = false, characterId = '' }: Props) {
  const party = useWorld((s) => s.party);
  const claims = useWorld((s) => s.claims);
  const mySlot = useWorld((s) => s.slot);
  const claiming = useWorld((s) => s.claiming);
  const myId = useWorld((s) => s.clientId);
  const claimSeat = useWorld((s) => s.claimSeat);
  const leaveSeat = useWorld((s) => s.leaveSeat);

  // Leaving a built seat wipes the character, in the database as well as
  // here, and there is no undo. Ask once before throwing away a sheet
  // somebody spent the wizard building.
  const [confirming, setConfirming] = useState(false);

  // Whether this client already holds a seat at this table.
  const seated = mySlot > 0;

  const leave = () => {
    setConfirming(false);
    void leaveSeat();
  };

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
                  char?.built && !confirming ? (
                    <button
                      type="button"
                      className="btn btn-secondary tap"
                      onClick={() => setConfirming(true)}
                    >
                      Leave slot
                    </button>
                  ) : char?.built ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-secondary tap"
                        onClick={() => setConfirming(false)}
                      >
                        Keep
                      </button>
                      <button type="button" className={`btn tap ${styles.danger}`} onClick={leave}>
                        Discard {char.name || 'character'}
                      </button>
                    </>
                  ) : (
                    <button type="button" className="btn btn-secondary tap" onClick={leave}>
                      Leave slot
                    </button>
                  )
                ) : taken ? (
                  <span className={styles.note}>taken</span>
                ) : seated ? (
                  // One player, one seat. Holding a seat means the empty ones
                  // are not yours to take — leaving is the way to move, and it
                  // is the only path that asks about the character you built.
                  <span className={styles.note}>open</span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary tap"
                    // A seat is claimed with a character, so there is nothing
                    // to claim with until one is chosen.
                    disabled={claiming === slot || !characterId}
                    onClick={() => void claimSeat(slot, characterId)}
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
