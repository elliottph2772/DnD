// D&D 5e casting rules: slot progressions, spells known, cantrips, prepared
// counts, the condition list and the duration vocabulary.
(function () {
  // prog: full | half | pact | none · kind: known | prepared | book | none
  var CASTER = {
    Barbarian: { kind: "none" },
    Fighter:   { kind: "none" },
    Monk:      { kind: "none" },
    Rogue:     { kind: "none" },
    Bard:      { kind: "known",    prog: "full", ability: "CHA", code: "B" },
    Cleric:    { kind: "prepared", prog: "full", ability: "WIS", code: "C" },
    Druid:     { kind: "prepared", prog: "full", ability: "WIS", code: "D" },
    Paladin:   { kind: "prepared", prog: "half", ability: "CHA", code: "P" },
    Ranger:    { kind: "known",    prog: "half", ability: "WIS", code: "R" },
    Sorcerer:  { kind: "known",    prog: "full", ability: "CHA", code: "S" },
    Warlock:   { kind: "known",    prog: "pact", ability: "CHA", code: "K" },
    Wizard:    { kind: "book",     prog: "full", ability: "INT", code: "W" }
  };

  // Slots by class level, 1st through 9th.
  var FULL = [
    [2],[3],[4,2],[4,3],[4,3,2],[4,3,3],[4,3,3,1],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,2],
    [4,3,3,3,2,1],[4,3,3,3,2,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1,1],
    [4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1,1],[4,3,3,3,3,1,1,1,1],[4,3,3,3,3,2,1,1,1],[4,3,3,3,3,2,2,1,1]
  ];
  var HALF = [
    [],[2],[3],[3],[4,2],[4,2],[4,3],[4,3],[4,3,2],[4,3,2],
    [4,3,3],[4,3,3],[4,3,3,1],[4,3,3,1],[4,3,3,2],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,1],[4,3,3,3,2],[4,3,3,3,2]
  ];
  // Warlock pact magic: [slot count, slot level]
  var PACT = [
    [1,1],[2,1],[2,2],[2,2],[2,3],[2,3],[2,4],[2,4],[2,5],[2,5],
    [3,5],[3,5],[3,5],[3,5],[3,5],[3,5],[4,5],[4,5],[4,5],[4,5]
  ];
  var KNOWN = {
    Bard:     [4,5,6,7,8,9,10,11,12,14,15,15,16,18,19,19,20,22,22,22],
    Sorcerer: [2,3,4,5,6,7,8,9,10,11,12,12,13,13,14,14,15,15,15,15],
    Warlock:  [2,3,4,5,6,7,8,9,10,10,11,11,12,12,13,13,14,14,15,15],
    Ranger:   [0,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11]
  };
  // Cantrips known: [count at 1st, at 4th, at 10th]
  var CANTRIPS = {
    Bard: [2,3,4], Cleric: [3,4,5], Druid: [2,3,4],
    Sorcerer: [4,5,6], Warlock: [2,3,4], Wizard: [3,4,5],
    Paladin: [0,0,0], Ranger: [0,0,0]
  };

  var clamp = function (n) { return Math.max(1, Math.min(20, n | 0)); };

  // Strip any subclass in parentheses: "Wizard (School of Evocation)" → "Wizard"
  var baseClass = function (cls) { return String(cls || "").split("(")[0].trim(); };

  var casterFor = function (cls) { return CASTER[baseClass(cls)] || { kind: "none" }; };

  // Slots as an object keyed by spell level: { "1": 4, "2": 3, ... }
  // Warlock pact slots come back under their single level.
  var slotsFor = function (cls, level) {
    var c = casterFor(cls), lv = clamp(level), out = {};
    if (c.kind === "none") return out;
    if (c.prog === "pact") {
      var p = PACT[lv - 1];
      out[String(p[1])] = p[0];
      return out;
    }
    var row = (c.prog === "half" ? HALF : FULL)[lv - 1] || [];
    row.forEach(function (n, i) { if (n > 0) out[String(i + 1)] = n; });
    return out;
  };

  var cantripsFor = function (cls, level) {
    var t = CANTRIPS[baseClass(cls)];
    if (!t) return 0;
    var lv = clamp(level);
    return lv >= 10 ? t[2] : lv >= 4 ? t[1] : t[0];
  };

  // How many spells the character picks and holds.
  //  known    → a fixed list they can cast from
  //  book     → wizard spellbook: 6 at 1st, 2 more per level after
  //  prepared → the whole class list is available; this is the prepare count
  var pickCountFor = function (cls, level, abilityMod) {
    var c = casterFor(cls), lv = clamp(level), base = baseClass(cls);
    if (c.kind === "none") return 0;
    if (c.kind === "known") return (KNOWN[base] || [])[lv - 1] || 0;
    if (c.kind === "book") return 6 + (lv - 1) * 2;
    var mod = Number(abilityMod) || 0;
    if (base === "Paladin") return Math.max(1, mod + Math.floor(lv / 2));
    return Math.max(1, mod + lv);
  };

  // Highest slot level the character has, for filtering the pickable list.
  var maxSpellLevel = function (cls, level) {
    var s = slotsFor(cls, level), best = 0;
    Object.keys(s).forEach(function (k) { if (s[k] > 0) best = Math.max(best, Number(k)); });
    return best;
  };

  var listFor = function (cls, level, spellLevel) {
    var c = casterFor(cls);
    if (c.kind === "none" || !window.SPELLS) return [];
    var cap = spellLevel === 0 ? 0 : (spellLevel || maxSpellLevel(cls, level));
    return window.SPELLS.filter(function (sp) {
      if (sp.classes.indexOf(c.code) === -1) return false;
      return spellLevel === 0 ? sp.level === 0 : (sp.level > 0 && sp.level <= cap);
    });
  };

  var spellByName = function (name) {
    if (!window.SPELLS) return null;
    for (var i = 0; i < window.SPELLS.length; i++) if (window.SPELLS[i].name === name) return window.SPELLS[i];
    return null;
  };

  // ------------------------------------------------------------- conditions
  var CONDITIONS = [
    ["Blinded", "Cannot see; attacks against it have advantage, its own have disadvantage."],
    ["Charmed", "Cannot attack the charmer, who has advantage on social checks against it."],
    ["Deafened", "Cannot hear; fails any check requiring hearing."],
    ["Frightened", "Disadvantage while the source is in sight; cannot move closer to it."],
    ["Grappled", "Speed 0; ends if the grappler is incapacitated or moved away."],
    ["Incapacitated", "Cannot take actions or reactions."],
    ["Invisible", "Unseen without magic; attacks against it have disadvantage, its own advantage."],
    ["Paralyzed", "Incapacitated, cannot move or speak; melee hits are critical."],
    ["Petrified", "Turned to stone: incapacitated, resistant to all damage, immune to poison."],
    ["Poisoned", "Disadvantage on attack rolls and ability checks."],
    ["Prone", "Melee attacks against it have advantage, ranged disadvantage; costs movement to rise."],
    ["Restrained", "Speed 0, attacks against it have advantage, disadvantage on Dex saves."],
    ["Stunned", "Incapacitated, cannot move, speaks falteringly; attacks against it have advantage."],
    ["Unconscious", "Incapacitated, prone, unaware; melee hits are critical."],
    ["Exhaustion 1", "Disadvantage on ability checks."],
    ["Exhaustion 2", "Speed halved."],
    ["Exhaustion 3", "Disadvantage on attack rolls and saving throws."],
    ["Exhaustion 4", "Hit point maximum halved."],
    ["Exhaustion 5", "Speed reduced to 0."],
    ["Exhaustion 6", "Death."]
  ].map(function (r) { return { name: r[0], text: r[1] }; });

  // rounds 0 means it does not expire on the clock.
  var DURATIONS = [
    { label: "End of your next turn", rounds: 1 },
    { label: "End of target's next turn", rounds: 1 },
    { label: "1 round", rounds: 1 },
    { label: "1 minute", rounds: 10 },
    { label: "10 minutes", rounds: 100 },
    { label: "1 hour", rounds: 600 },
    { label: "8 hours", rounds: 4800 },
    { label: "Save ends", rounds: 0, saveEnds: true },
    { label: "Concentration", rounds: 0, concentration: true },
    { label: "Until removed", rounds: 0 }
  ];

  window.RULES = {
    CASTER: CASTER, CONDITIONS: CONDITIONS, DURATIONS: DURATIONS,
    baseClass: baseClass, casterFor: casterFor, slotsFor: slotsFor,
    cantripsFor: cantripsFor, pickCountFor: pickCountFor,
    maxSpellLevel: maxSpellLevel, listFor: listFor, spellByName: spellByName,
    // Which slot levels a rest gives back. Pact slots return on a short rest.
    restoresOnShort: function (cls) { return casterFor(cls).prog === "pact"; }
  };
})();
