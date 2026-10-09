// The Ashfall Compact — the first campaign module.
//
// Built out of the fiction the agent generated in the first live campaign
// (Grennhal, the salted road, Lake Ossen's broken dam, the Hollowed), so an
// existing table reads this as canon rather than a replacement.
//
// Levels 3–6. Grim, cold, and about a debt nobody alive agreed to.

import type { CampaignModule } from './types';

export const ASHFALL: CampaignModule = {
  id: 'ashfall',
  title: 'The Ashfall Compact',
  version: '1.0.0',
  author: 'Nocturne',
  blurb:
    'A town stops ringing its bell. The road out has been salted for three miles. Something has been counting, and the count is nearly done.',
  tone: 'Grim dark',
  difficulty: 'Deadly',
  levels: [3, 6],

  core: {
    premise:
      'Forty years ago the people of Grennhal made a compact: a name a year, given willingly, and in exchange the thing beneath Lake Ossen would stay beneath it. The dam broke the same winter and the lake drained, and the town salted the road so nothing would grow to hide what walked on it. The bell was rung every dusk to mark that the debt was current. Eight days ago the bell stopped. The town is empty, and the party is walking the only road out.',
    canon: [
      'The compact is real and binding. It was made by the town, not by any god, and it cannot be prayed away.',
      'The debt is counted in names, not lives. A name given willingly settles a year. A name taken by force settles nothing and is remembered against the taker.',
      'Salt interrupts the counting. Broken salt lines are how the party can tell where something crossed.',
      'The thing beneath the lake has never been seen whole and never should be. It is known by its ledger and its patience.',
      'Nobody in Grennhal was killed. They walked out, and the party should find evidence of walking, never of slaughter.',
    ],
    antagonist: {
      name: 'The Tally',
      goal: 'To close the ledger. It is owed forty years of names and has collected eight days of them in a single week.',
      adaptation:
        'It learns what the party values and begins counting that instead. It never attacks what it can simply wait for.',
    },
    factions: [
      {
        name: 'The Compact',
        rep: 10,
        text: 'What remains of the families who signed. They keep the terms and resent anyone who calls it a curse.',
      },
      {
        name: 'Grennhal survivors',
        rep: 25,
        text: 'The handful who did not walk. They hid, and they know they hid, and it shows.',
      },
      {
        name: 'The Hollowed',
        rep: -30,
        text: 'Those who gave their own names and kept walking. They are not dead and not hostile, and that is worse.',
      },
    ],
  },

  locations: [
    {
      id: 'grennhal',
      name: 'Grennhal',
      summary: 'An emptied town with its doors unlocked and its hearths cold eight days.',
      text: 'Forty houses around a green gone to mud. Every door stands unlocked and most stand open. Meals are on tables, set and untouched and now growing fur. There is no blood anywhere, no sign of struggle, no bodies. The bell tower at the green’s north end is open to the sky; the bell is still in it, and the rope has been cut at head height from the inside. Boot prints leave the town in one direction only — south, onto the salted road — and they are unhurried and evenly spaced, the stride of people walking somewhere they have decided to go.',
      npcs: ['mara'],
      exits: [{ to: 'salted-road', text: 'South, onto the salted road' }],
      secrets: [
        'The bell rope was cut from inside the tower, by someone who climbed up to do it and did not come down.',
        'The ledger in the warden’s house lists forty names with forty years beside them. The last eight entries are in a different, hurried hand.',
        'One house has its salt line unbroken across the threshold. Nobody walked out of that one.',
      ],
    },
    {
      id: 'salted-road',
      name: 'The Salted Road',
      summary: 'Three miles of road crusted white, where nothing has grown in forty years.',
      text: 'The imperial paving is buried under a crust of salt thick enough to bear weight and loud enough to announce it. Every step cracks, a dry tick like bone snapping in a far room. The embankments to either side are slumped and sour with brine. The boot prints from Grennhal run down the middle, still unhurried. Somewhere in the second mile a second set joins them — bare, longer in the stride, and pressed deeper at the heel the way a man walks when he is carrying something heavy.',
      npcs: [],
      exits: [
        { to: 'grennhal', text: 'North, back to the town' },
        { to: 'black-spruce', text: 'South, where the treeline begins' },
        { to: 'drowned-dam', text: 'East, down the embankment toward the old lake bed' },
      ],
      secrets: [
        'The second set of prints never crosses the salt. It walks the crust where the crust is thickest, as if the salt is not the problem but the breaking of it is.',
        'At the two-mile post, somebody has tied a rag at knee height. It is recently knotted and still damp.',
      ],
      foes: ['salt-hound'],
    },
    {
      id: 'black-spruce',
      name: 'The Black Spruce',
      summary: 'A treeline too still, where the lower branches are snapped at chest height.',
      text: 'Black spruce, close-grown and grey. The lower branches are dead and snapped off at the height of a man’s chest in a continuous line, as if something has pushed through them at a steady walk for years. Needles lie in drifts that do not stir. The air tastes of cold iron and old smoke, and ash is ground into the path. Sound does not carry here. Two people standing six feet apart have to raise their voices.',
      npcs: ['the-hollowed-woman'],
      exits: [
        { to: 'salted-road', text: 'North, back to the road' },
        { to: 'waystation', text: 'South, where a roofline shows through the trunks' },
      ],
      secrets: [
        'The snapped branches run in both directions and have been renewed every year. Older breaks have healed over; the newest are this week’s.',
        'A second trail turns back toward Grennhal and stops at a tree with the bark stripped in a neat ring at head height. There are forty such rings in this wood.',
      ],
      foes: ['the-counted'],
    },
    {
      id: 'drowned-dam',
      name: 'The Broken Dam at Lake Ossen',
      summary: 'A drained lake bed and the dam that failed the winter the compact was signed.',
      text: 'The dam is a wall of fitted stone with a bite taken out of its middle, and below it the lake bed stretches off flat and cracked into plates that tip underfoot. The bottom is not mud but a pale evaporite that holds a footprint for years. There are a great many footprints. They all lead out, none in. Where the water was deepest there is a rectangular opening in the bed itself, dressed stone, with steps going down into standing brine.',
      npcs: [],
      exits: [{ to: 'salted-road', text: 'West, back up the embankment' }],
      secrets: [
        'The dam did not fail. The stones were pulled out from the inside, and they are stacked neatly on the lake-bed floor where they fell.',
        'The steps down are counted — each riser has a number cut into it — and the numbers do not start at one.',
      ],
      foes: ['brine-drowned'],
    },
    {
      id: 'waystation',
      name: 'The Ashfall Waystation',
      summary: 'A shuttered stone house where the road was meant to be safe.',
      text: 'A single-storey house of the same imperial stone as the road, with a slate roof and shutters barred from inside. A salt line crosses its threshold, poured thick and recently renewed. Smoke, very thin, comes from the chimney. There is a brass plate beside the door engraved with the terms of the compact in small even letters, and below the terms a list of names with years beside them. The last line is this year, and the name beside it has been scratched out and written again twice.',
      npcs: ['keeper-aldo', 'bell-warden'],
      exits: [{ to: 'black-spruce', text: 'North, back under the spruce' }],
      secrets: [
        'The keeper has been renewing the salt line alone for eight days and has not slept.',
        'The scratched-out name on the plate is the keeper’s own, written and unwritten and written again.',
      ],
    },
  ],

  npcs: [
    {
      id: 'mara',
      name: 'Mara Thess',
      role: 'The one who hid',
      summary: 'A woman in her fifties who did not walk out, and knows exactly what that cost.',
      text: 'Thin, practical, filthy. She has been living in the one house whose salt line is unbroken and has not been outside it in eight days. She talks fast and keeps the party between herself and the door. She will trade what she knows for escort out, and she will not go south.',
      wants: 'To get out of Grennhal travelling north, with people around her, before dusk.',
      secret:
        'She broke her own salt line once, on the third night, to pull her brother back inside. He came as far as the threshold and then thanked her and kept walking. She has not re-swept that doorway since.',
    },
    {
      id: 'the-hollowed-woman',
      name: 'The woman who keeps walking',
      role: 'Hollowed',
      summary: 'A Grennhal woman walking the spruce path at an unhurried, even pace.',
      text: 'She is dressed for a cold evening eight days ago. She walks, and if the party walks beside her she will answer questions pleasantly and at length, and she will not stop walking while she does it. She is neither hostile nor afraid. She knows her name was given and does not resent it. If asked to stop she will say she would rather not.',
      wants: 'To reach the lake bed before the count is called, because that is where one goes.',
      secret:
        'She can still be turned back, but only by someone who gives a name in her place, and she will tell the party this only if they ask her directly what would stop her.',
    },
    {
      id: 'keeper-aldo',
      name: 'Aldo Venn',
      role: 'Keeper of the waystation',
      summary: 'A sleepless man renewing a salt line he no longer believes will hold.',
      text: 'Grey, courteous, wrecked. He keeps the waystation because his family has kept it for four generations and because the brass plate has his name on it for this year. He will let the party in. He will feed them. He will not open the shutters, and he will become extremely still if anyone suggests that the compact could simply be refused.',
      wants: 'Somebody else to be on the plate for this year.',
      secret:
        'He has already written and unwritten his own name twice. The third time he writes it, it will take.',
    },
    {
      id: 'bell-warden',
      name: 'Hesk',
      role: 'Bell-warden of Grennhal',
      summary: 'The man who cut the bell rope, sheltering at the waystation and saying little.',
      text: 'Broad, burnt-handed, forty-odd. He climbed the tower eight days ago and cut the rope above his own head so the bell could not be rung, then climbed down the outside and walked south. He will not say why where Aldo can hear him. He is not mad and he is not sorry.',
      wants: 'For the counting to stop, by any means, including ones the party will not like.',
      secret:
        'He stopped the bell on purpose to force the debt to come due all at once, believing a thing that collects forty names in a week can be met and killed, where a thing that collects one a year never can.',
    },
  ],

  scenes: [
    {
      id: 'the-second-trail',
      title: 'The second trail',
      trigger:
        'The party examines the boot prints anywhere on the salted road, or asks what else has been along it.',
      text: 'A second set of prints joins the first in the second mile — bare feet, a longer stride, pressed deep at the heel. It never breaks the crust. Where the townspeople’s prints wander slightly, this one does not.',
      branches: [
        {
          choice: 'They follow it east, off the road',
          outcome: 'It takes them down the embankment to the drowned dam, arriving at dusk.',
        },
        {
          choice: 'They stay on the road',
          outcome:
            'The second trail keeps pace with them for a mile and then stops dead, mid-stride, with nothing after it.',
        },
        {
          choice: 'They try to destroy or disrupt the salt',
          outcome:
            'The crust gives way to brine beneath. Whatever has been keeping to the thick crust now has no reason to. Raise the threat and bring a salt-hound in before the next rest.',
        },
      ],
    },
    {
      id: 'the-ledger',
      title: 'The warden’s ledger',
      trigger: 'The party searches any house in Grennhal thoroughly, or asks Mara what the bell was for.',
      text: 'Forty names, forty years, in four different hands as wardens succeeded one another. The final eight entries are this week, all in the same hurried script, all dated to a single day.',
      branches: [
        {
          choice: 'They read the last eight names aloud',
          outcome:
            'Every name read aloud is heard. That night, something walks the salt outside wherever they are camped, and does not come in.',
        },
        {
          choice: 'They take the ledger with them',
          outcome:
            'Aldo at the waystation recognises it immediately and will trade a great deal to have it, including the truth about the plate.',
        },
        {
          choice: 'They burn it',
          outcome:
            'Nothing happens, which unsettles them more than anything would have. The count is not kept in the book.',
        },
      ],
      once: true,
    },
    {
      id: 'the-threshold',
      title: 'The waystation door',
      trigger: 'The party reaches the waystation and asks to be let in.',
      text: 'Aldo opens the shutter a hand’s width, looks at each of them in turn and counts them under his breath before he lifts the bar. He asks them to step over the salt line, not scuff it, and he sweeps it closed behind them with a brush kept by the door for that purpose.',
      branches: [
        {
          choice: 'They break or scuff the line, by accident or otherwise',
          outcome:
            'Aldo does not shout. He goes very quiet, re-pours it, and will not meet anyone’s eye for the rest of the evening. Something tests the door before dawn.',
        },
        {
          choice: 'They ask about the scratched-out name',
          outcome:
            'He says it is a clerical matter. If pressed with any kindness at all, he breaks and tells them he has written his own name twice and unwritten it twice.',
        },
        {
          choice: 'They bring Hesk in with them',
          outcome:
            'Aldo recognises him as the man who stopped the bell. The two of them will not be in the same room. One of them leaves in the night.',
        },
      ],
      once: true,
    },
    {
      id: 'the-count-called',
      title: 'The count called',
      trigger:
        'The party descends the counted steps at the drowned dam, or any time the campaign threat reaches 70.',
      text: 'The numbers on the risers run backward as they descend. At the bottom is standing brine and a dressed stone chamber, and in the chamber something begins, unhurriedly, to count aloud. It is not counting the steps. It names a thing each of them has, and moves on to the next.',
      branches: [
        {
          choice: 'They give a name willingly',
          outcome:
            'The count stops at once. The debt is settled for a year. Whoever gave it begins walking, and will reach the lake bed in eight days unless someone gives a name in their place.',
        },
        {
          choice: 'They attack it',
          outcome:
            'It does not defend itself and cannot be hurt by anything they have. It continues counting while they try. Every round of attack adds a name to what it is owed.',
        },
        {
          choice: 'They refuse and leave',
          outcome:
            'It lets them go and keeps counting. It has their names now and will begin arriving at the places they value. This is the long road and it is survivable.',
        },
        {
          choice: 'They offer the compact itself — the terms, the plate, the ledger',
          outcome:
            'This is the opening. It has never been offered its own terms back. Run this as a negotiation, not a fight, and let a clever party find the flaw: the compact binds the town, and the town has walked out of it.',
        },
      ],
      once: true,
    },
  ],

  bestiary: [
    {
      id: 'salt-hound',
      name: 'Salt Hound',
      kind: 'Medium aberration, unaligned',
      cr: '3',
      ac: 14,
      hp: 52,
      speed: '40 ft.',
      stats: { STR: 16, DEX: 15, CON: 15, INT: 4, WIS: 12, CHA: 6 },
      traits: [
        {
          name: 'Crust-Walker',
          text: 'Moves across the salt crust without breaking it and without sound. Has advantage on Stealth while on salt.',
        },
        {
          name: 'Brine Blood',
          text: 'When it takes damage, the salt beneath it darkens. Creatures that end their turn adjacent take 3 (1d6) acid damage.',
        },
      ],
      actions: [
        { name: 'Bite', text: '+5 to hit, 10 (2d6+3) piercing damage.' },
        {
          name: 'Drag Under',
          text: 'Against a prone or restrained target: +5 to hit, 7 (1d8+3) bludgeoning and the target is pulled 10 feet through the crust.',
        },
      ],
      tactics:
        'It separates one traveller from the rest by breaking the crust behind them, then works that one alone. It will not press an attack against three or more standing together.',
    },
    {
      id: 'the-counted',
      name: 'One of the Counted',
      kind: 'Medium humanoid (hollowed), neutral',
      cr: '2',
      ac: 12,
      hp: 38,
      speed: '30 ft. (never stops)',
      stats: { STR: 12, DEX: 11, CON: 14, INT: 10, WIS: 13, CHA: 14 },
      traits: [
        {
          name: 'Will Not Stop',
          text: 'Must move at least 20 feet toward the lake bed on each of its turns. If prevented, it takes no action but to free itself, without malice.',
        },
        {
          name: 'Given Freely',
          text: 'Cannot be frightened or charmed. Damage does not stop it walking; it simply walks damaged.',
        },
      ],
      actions: [
        {
          name: 'Answer Pleasantly',
          text: 'Speaks with anyone who walks alongside. A creature that listens for a full minute must make a DC 13 Wisdom save or be charmed until it stops walking.',
        },
      ],
      tactics:
        'Not a combatant. It is an obstacle and a conversation. Killing one is easy, pointless, and remembered against the party by the Tally.',
    },
    {
      id: 'brine-drowned',
      name: 'Brine-Drowned',
      kind: 'Medium undead, chaotic evil',
      cr: '4',
      ac: 13,
      hp: 68,
      speed: '20 ft., swim 30 ft.',
      stats: { STR: 17, DEX: 10, CON: 17, INT: 6, WIS: 10, CHA: 8 },
      traits: [
        {
          name: 'Preserved',
          text: 'Forty years in brine have left it whole. Immune to poison and disease; resistant to cold and necrotic.',
        },
        {
          name: 'Not Counted',
          text: 'It was taken by force rather than given, and it knows. It attacks anything that speaks a name aloud in its hearing, with advantage.',
        },
      ],
      actions: [
        { name: 'Slam', text: '+6 to hit, 13 (2d8+4) bludgeoning damage.' },
        {
          name: 'Salt-Choke (Recharge 5–6)',
          text: 'One creature within 10 feet makes a DC 14 Constitution save or takes 18 (4d8) and cannot speak until the end of its next turn.',
        },
      ],
      tactics:
        'Rises from standing brine when the party is at its deepest point in the lake bed. Fights to destruction. It wants to be stopped.',
    },
    {
      id: 'the-tally',
      name: 'The Tally',
      kind: 'Unknowable, lawful neutral',
      cr: '—',
      ac: 0,
      hp: 0,
      speed: '—',
      stats: { STR: 0, DEX: 0, CON: 0, INT: 20, WIS: 20, CHA: 18 },
      traits: [
        {
          name: 'Not A Statblock',
          text: 'The Tally cannot be fought and has no combat numbers on purpose. Any attack against it succeeds in landing and changes nothing.',
        },
        {
          name: 'Patient',
          text: 'It never pursues. It arrives where the thing it is counting already is.',
        },
      ],
      tactics:
        'Run it as a negotiation and a dread, never an encounter. It is scrupulously fair, answers questions honestly, and will accept any settlement that matches the terms it was given. The campaign is won by reading the terms, not by damage.',
    },
  ],

  opening: {
    location: 'grennhal',
    scene: 'Grennhal, eight days quiet',
    text: 'The bell has not been rung for eight days, and the town below it is empty. Doors stand open on cold hearths and set tables. There is no blood and there are no bodies — only boot prints, forty-odd sets, leaving south down a road that somebody salted three miles deep so that nothing would ever grow beside it.\n\nIt is an hour before dusk. What do you do?',
  },

  quests: [
    { title: 'Find out where the people of Grennhal walked to', status: 'active' },
    { title: 'Reach the Ashfall waystation before second dark', status: 'active' },
  ],
};
