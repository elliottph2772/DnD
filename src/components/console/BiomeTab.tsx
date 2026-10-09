import { useState } from 'react';
import { useWorld } from '../../store/world';
import styles from './Console.module.css';

/** A region the agent generated: prose, hazards, points of interest, map. */
interface BiomeShape {
  name?: string;
  terrain?: string;
  weather?: string;
  sensory?: string;
  inhabitants?: string;
  hazards?: { name: string; dc: string; text: string }[];
  points_of_interest?: { name: string; text: string }[];
  loot?: string[];
  map?: { grid?: string[]; legend?: { sym: string; meaning: string }[] };
}

export default function BiomeTab() {
  const biome = useWorld((s) => s.world.biome) as BiomeShape | null;
  const busy = useWorld((s) => s.busy);
  const generateBiome = useWorld((s) => s.generateBiome);

  const [brief, setBrief] = useState('');

  return (
    <div className={styles.panel}>
      <input
        className="input"
        placeholder="A brief — or leave it to the agent"
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
      />
      <button
        type="button"
        className="btn btn-primary tap"
        disabled={Boolean(busy)}
        onClick={() => void generateBiome(brief.trim())}
      >
        Generate region
      </button>

      {!biome?.name ? (
        <p className={styles.hint}>No region surveyed yet.</p>
      ) : (
        <>
          <span className="label">{biome.name}</span>
          {biome.terrain && <p className={styles.hint}>{biome.terrain}</p>}
          {biome.weather && <p className={styles.hint}>Weather — {biome.weather}</p>}
          {biome.sensory && <p className={styles.hint}>{biome.sensory}</p>}
          {biome.inhabitants && <p className={styles.hint}>{biome.inhabitants}</p>}

          {Array.isArray(biome.map?.grid) && biome.map.grid.length > 0 && (
            <pre className={styles.map}>{biome.map.grid.join('\n')}</pre>
          )}

          {Array.isArray(biome.map?.legend) && biome.map.legend.length > 0 && (
            <p className={styles.hint}>
              {biome.map.legend.map((l) => `${l.sym} ${l.meaning}`).join(' · ')}
            </p>
          )}

          {Array.isArray(biome.hazards) && biome.hazards.length > 0 && (
            <>
              <span className="label">Hazards</span>
              <div className={styles.card}>
                {biome.hazards.map((h) => (
                  <div key={h.name} className={styles.rowBetween}>
                    <span>{h.name}</span>
                    <span className="num">{h.dc}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {Array.isArray(biome.points_of_interest) && biome.points_of_interest.length > 0 && (
            <>
              <span className="label">Worth a look</span>
              <div className={styles.card}>
                {biome.points_of_interest.map((p) => (
                  <div key={p.name} className={styles.panel}>
                    <span>{p.name}</span>
                    <span className={styles.hint}>{p.text}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
