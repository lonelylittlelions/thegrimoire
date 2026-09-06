var Grimoire = window.Grimoire || (window.Grimoire = {});

Grimoire.CONTENT = {
    runePool: [
        'ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ',
        'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ', 'ᛝ', 'ᛟ', 'ᛞ',
        '✦', '✧', '✶', '✹', '✺', 'x', 'o', '0', '1', '2'
    ],

    flameFrames: [
        ['   (   ', '  ) \\  ', ' { _ } '],
        ['   )   ', '  / (  ', ' { _ } '],
        ['   (   ', '  ( \\  ', ' { _ } ']
    ],

    seasons: ['Spring', 'Equinox', 'Autumn', 'Solstice'],

    seasonLines: {
        Spring: 'the light is ordinary again.',
        Equinox: 'the wick lasts. the room is even.',
        Autumn: 'the air thins. oil will not keep as it did.',
        Solstice: 'the flame eats twice. the dark is punctual.'
    },

    subheadings: {
        boot: 'a heavy book. brass at the corners. dust on the top edge.',
        flame: 'the wick has a name. the room is less dark.',
        bolted: 'the door is bolted from the other side.',
        shutters: 'the shutters are open. the grounds are dark.'
    },

    // Number.MAX_SAFE_INTEGER (~9e15) is the v1 wall.
    // Reserve a mantissa/exponent pair for Horizon V; do not import decimal.js yet.
    sentences: [
        'a mark that was already there. you only noticed.',
        'the flame has been named. it does not answer.',
        'the margin holds a reply in a smaller hand.',
        'the door is bolted. the bolt is on the other side.',
        'the house is larger than the room you were given.',
        'the shutters want opening. they have wanted it.',
        'the grounds do not end where the lantern does.',
        'another desk, somewhere in the house, is occupied.',
        'the index lists a name that is not yours.',
        'the oil remembers a previous wick.',
        'a sentence you have not written is already stable.',
        'the lantern stops at the gravel.'
    ],

    jobs: {
        transcribe: {
            label: 'Transcribe',
            hint: 'insight, steadily. the leaf is not touched. this is the default hand.'
        },
        copy: {
            label: 'Copy',
            hint: 'ink from insight. the well must not run dry. the page is still not written.'
        },
        attend: {
            label: 'Attend the Page',
            hint: 'the only automatic writing. slow. a page takes minutes, not moments.'
        },
        ward: {
            label: 'Ward the Flame',
            hint: 'each warding feather slows the burn. the floor of the wick still holds.'
        }
    },

    estateRooms: {
        hall: { name: 'Hall', flavor: 'the crossing. doors in four directions.' },
        library: { name: 'Library', flavor: 'shelves. a table that wants a folio sewn.' },
        vault: { name: 'Vault', flavor: 'a dry basin, stained to a tide line. ink takes the tarnish if you charge it.' },
        glasshouse: { name: 'Glasshouse', flavor: 'wet earth under glass. it drips while you are elsewhere.' },
        cellars: { name: 'Cellars', flavor: 'cool stone. hides wait on hooks.' },
        gate: { name: 'the gate', flavor: 'gravel. the lantern stops here.' }
    },

    estateDiscover: {
        hall: 'the crossing. four dark mouths.',
        library: 'west: shelves. none of them lit.',
        vault: 'east: stone and a dry basin.',
        glasshouse: 'north: glass and a smell of wet earth.',
        cellars: 'down: cool stone. hooks in the dark.',
        gate: 'the lantern stops at the gravel.'
    },

    estateFinds: [
        {
            id: 'hook_grease',
            rooms: ['cellars'],
            name: 'hook grease',
            seen: 'a smear on a hook you passed before. still warm.',
            take: 'the grease is on your hands. hides will slip sooner.',
            buff: 'renders run short',
            kind: 'render',
            mul: 1.6,
            dur: 90
        },
        {
            id: 'blotting_sand',
            rooms: ['library'],
            name: 'blotting sand',
            seen: 'sand in a shelf gutter. it was not there the first time.',
            take: 'the sand takes the wet. leaves will dry sooner.',
            buff: 'collation runs short',
            kind: 'collate',
            mul: 1.6,
            dur: 90
        },
        {
            id: 'tarnish_flake',
            rooms: ['vault'],
            name: 'tarnish flake',
            seen: 'a flake on the rim. you missed it walking out.',
            take: 'the flake goes in. the bath will not idle.',
            buff: 'the bath hurries',
            kind: 'bath',
            mul: 1.6,
            dur: 90
        },
        {
            id: 'warm_pane',
            rooms: ['glasshouse'],
            name: 'condensate',
            seen: 'a thicker bead on the glass. the house kept it for your return.',
            take: 'you take the bead. the drip is less shy.',
            buff: 'the glasshouse drips faster',
            kind: 'drip',
            mul: 1.8,
            dur: 120
        },
        {
            id: 'wick_end',
            rooms: ['hall', 'gate'],
            name: 'wick-end',
            seen: 'a saved end in a crack. you walked over it once.',
            take: 'the bowl accepts it. the wick eats slower for a while.',
            buff: 'the wick is less hungry',
            kind: 'oil',
            mul: 0.7,
            dur: 120
        },
        {
            id: 'margin_dust',
            rooms: ['library', 'hall'],
            name: 'margin dust',
            seen: 'a film of dust that still holds a letter.',
            take: 'the dust is on the desk now. transcribe comes easier.',
            buff: 'transcribe runs warmer',
            kind: 'transcribe',
            mul: 1.4,
            dur: 90
        },
        {
            id: 'stopped_draft',
            rooms: ['hall', 'cellars', 'gate'],
            name: 'stopped draft',
            seen: 'a rag in a gap. the air is even on the second pass.',
            take: 'the house work does not fight the air.',
            buff: 'the house works faster',
            kind: 'house',
            mul: 1.3,
            dur: 75
        },
        {
            id: 'house_key',
            rooms: ['hall', 'library', 'cellars', 'gate'],
            name: 'house key',
            seen: 'a small key in a crack. you have passed it twice.',
            take: 'it fits a drawer you have not opened.',
            kind: 'key'
        }
    ],

    listenLines: [
        'wood ticks in the shutter-frame. nothing answers.',
        'a gap in the slats. gravel, or something that sounds like it.',
        'the third time: a latch, and it is not on this side.'
    ],

    estateListen: {
        hall: {
            idle: 'wood in the crossing. four doors, none of them speaking.',
            cooking: 'something ticks behind a door. a batch, not a guest.',
            dark: 'the mouths of the house. without a wick they keep their names.',
            empty: 'the drive took a packet. the hall does not sound different. that is the difference.'
        },
        gate: {
            idle: 'gravel. the lantern stops. nothing on the road.',
            cooking: 'the house is working behind you. the gate does not care.',
            dark: 'the drive without a wick. the gravel is the same color as the rest.',
            empty: 'the packet went. the stones have not moved.'
        }
    },

    welcomeBack: function (oilPct, insightGained, oilEmpty) {
        if (oilEmpty) {
            return 'the house was dark for hours. the book is where you left it.';
        }
        var oilBit = oilPct >= 50 ? 'the oil still holds.' : 'the oil is lower.';
        if (insightGained >= 1) {
            return oilBit + ' insight gathered while you were gone: ' + insightGained + '.';
        }
        return oilBit + ' the page did not turn itself.';
    },

    firstTallow: 'fat gathers on the lip.',
    firstInk: 'the well takes a drop.',
    firstVellum: 'a hide comes away clean. vellum.',
    firstExtracts: 'the glass sweats. a drop runs to the sill.',
    firstSilver: 'the bath gives back a coin, dull, one edge not struck.',
    firstFolio: 'the leaves are sewn along one edge. it will hold together on a road.',
    packetGone: 'the packet goes down the drive. nothing returns.',
    packetObit: 'obituaries are not copied here.',
    packetAgain: 'a second packet goes down the drive. still nothing returns.',
    drawerOpen: 'the latch gives. a slot the size of a folio, empty, and a note: again.',
    estateDrown: 'the wick died. what was cooking in the house has soured.',
    estateSalvageCellars: 'you scrape what will still take. some tallow comes back.',
    estateSalvageVault: 'the bath is ruined. a little ink comes off the rim.',
    estateDump: 'you empty it. nothing to keep.',
    estateVisit: 'the grounds have a shape. you can walk it.'
};

Grimoire.CONTENT.projects = [
    {
        id: 'name_flame',
        title: 'Name the Flame',
        flavor: 'you notice the wick. it has been burning since you sat down.',
        auto: true,
        once: true,
        tab: 'desk',
        costs: {},
        reveal: function () { return false; }
    },
    {
        id: 'catalog_page',
        title: 'Catalog the Page',
        flavor: 'you mark the leaf so the next one can be found.',
        once: true,
        tab: 'desk',
        costs: { passages: 1 },
        kind: 'gate',
        reveal: function (s) {
            return s.page.pagesFinished >= 1 || s.resources.passages >= 1;
        }
    },
    {
        id: 'wick_stub',
        title: 'Keep a Wick Stub',
        flavor: 'a short end, saved. the bowl takes it.',
        once: true,
        tab: 'desk',
        costs: { tallow: 5 },
        kind: 'micro',
        reveal: function (s) {
            return Grimoire.hasUnlock(s, 'name_flame');
        }
    },
    {
        id: 'catch_drip',
        title: 'Catch the Drip',
        flavor: 'a dish under the lip. fat does not reach the wood.',
        once: true,
        tab: 'desk',
        costs: { insight: 12 },
        kind: 'micro',
        reveal: function (s) {
            return Grimoire.hasUnlock(s, 'name_flame');
        }
    },
    {
        id: 'press_once',
        title: 'Press Once More',
        flavor: 'the next marks come easier. for a little while.',
        once: false,
        tab: 'desk',
        costs: { insight: 10 },
        rate: 1.15,
        cap: 3,
        kind: 'micro',
        reveal: function (s) {
            return Grimoire.hasUnlock(s, 'name_flame') && s.meta.totalInsightEarned >= 8;
        }
    },
    {
        id: 'steady_hand',
        title: 'Steady the Hand',
        flavor: 'fewer marks wash out. more of them stay.',
        once: true,
        tab: 'desk',
        costs: { insight: 15 },
        kind: 'micro',
        reveal: function (s) {
            return s.page.pagesFinished >= 1 || s.page.stableLettersLifetime >= 1;
        }
    },
    {
        id: 'steel_nib',
        title: 'Fit a Steel Nib',
        flavor: 'the point holds. each press leaves more.',
        once: false,
        tab: 'desk',
        costs: { ink: 4 },
        rate: 1.07,
        kind: 'micro',
        reveal: function (s) {
            return Grimoire.hasUnlock(s, 'catalog_page');
        }
    },
    {
        id: 'bind_quill',
        title: 'Bind a Quill',
        flavor: 'a raven feather, silver wire. it writes when you do not.',
        once: false,
        tab: 'desk',
        costs: { ink: 18 },
        rate: 1.15,
        kind: 'building',
        cap: 12,
        capKey: 'quills',
        reveal: function (s) {
            return (s.purchased.steel_nib || 0) >= 1 || s.resources.ink >= 9;
        }
    },
    {
        id: 'spare_matches',
        title: 'Spare Matches',
        flavor: 'two more. the box is not empty.',
        once: false,
        tab: 'desk',
        costs: { ink: 8 },
        rate: 1.15,
        kind: 'micro',
        reveal: function (s) {
            return s.meta.darknessSeen;
        }
    },
    {
        id: 'bolt_and_key',
        title: 'Bolt and Key',
        flavor: 'a thud from the hall. the door will not open from this side.',
        auto: true,
        once: true,
        tab: 'study',
        costs: {},
        reveal: function () { return false; }
    },
    {
        id: 'prism',
        title: 'Set a Prism',
        flavor: 'the flame is split. less of it is wasted on the air.',
        once: false,
        tab: 'study',
        costs: { ink: 22, passages: 1 },
        rate: 1.15,
        kind: 'building',
        reveal: function (s) {
            return Grimoire.hasUnlock(s, 'bolt_and_key');
        }
    },
    {
        id: 'shelf',
        title: 'Raise a Shelf',
        flavor: 'jars in a row. the drippings have somewhere to go.',
        once: false,
        tab: 'study',
        costs: { ink: 18 },
        kind: 'building',
        cap: 4,
        capKey: 'shelves',
        reveal: function (s) {
            return Grimoire.hasUnlock(s, 'bolt_and_key') && s.resources.ink >= 8;
        }
    },
    {
        id: 'spare_lamp',
        title: 'Spare Lamp',
        flavor: 'a second bowl. the cap of the light is higher.',
        once: false,
        tab: 'study',
        costs: { ink: 22, passages: 1 },
        kind: 'building',
        cap: 3,
        capKey: 'lamps',
        reveal: function (s) {
            return Grimoire.hasUnlock(s, 'bolt_and_key') && s.resources.ink >= 10;
        }
    },
    {
        id: 'attend_lesson',
        title: 'Lesson: Attend the Page',
        flavor: 'a quill can be taught to watch the leaf, not only to copy.',
        once: true,
        tab: 'study',
        costs: { ink: 15 },
        kind: 'gate',
        require: function (s) {
            return s.generators.quills >= 1;
        },
        reveal: function (s) {
            return Grimoire.hasUnlock(s, 'bolt_and_key') && s.generators.quills >= 1;
        }
    },
    {
        id: 'collation',
        title: 'Collation Board',
        flavor: 'leaves side by side. a lexicon can be bound from what repeats.',
        once: true,
        tab: 'study',
        costs: { ink: 40, passages: 3 },
        kind: 'gate',
        reveal: function (s) {
            return Grimoire.hasUnlock(s, 'bolt_and_key') && s.resources.ink >= 20;
        }
    },
    {
        id: 'index',
        title: 'Keep an Index',
        flavor: 'the chapter has a spine now. you can find a page by its number.',
        once: true,
        tab: 'study',
        costs: { lexicons: 3 },
        kind: 'gate',
        reveal: function (s) {
            return Grimoire.hasUnlock(s, 'collation') && s.resources.lexicons >= 1;
        }
    },
    {
        id: 'under_text',
        title: 'Read the Under-Text',
        flavor: 'the leaf was scraped once and written again. the first hand is still under yours.',
        once: true,
        tab: 'study',
        costs: { lexicons: 2, ink: 30 },
        kind: 'gate',
        reveal: function (s) {
            return Grimoire.hasUnlock(s, 'collation') && s.resources.lexicons >= 2;
        }
    },
    {
        id: 'suppress',
        title: 'Suppress the Margin',
        flavor: 'you let the top hand cover the other again. the room is smaller.',
        once: true,
        tab: 'study',
        costs: { lexicons: 2, ink: 30 },
        kind: 'gate',
        reveal: function (s) {
            return Grimoire.hasUnlock(s, 'collation') && s.resources.lexicons >= 2;
        }
    },
    {
        id: 'listen_shutter',
        title: 'Listen at the Shutter',
        flavor: '',
        once: false,
        tab: 'study',
        costs: { lexicons: 1, oil: 20 },
        kind: 'micro',
        cap: 3,
        reveal: function (s) {
            return Grimoire.hasUnlock(s, 'collation') && s.meta.sentencesCompleted >= 5;
        }
    },
    {
        id: 'open_shutters',
        title: 'Open the Shutters',
        flavor: 'the slats fold back. the grounds are dark. the lantern does not reach.',
        once: true,
        tab: 'study',
        costs: {},
        kind: 'gate',
        require: function (s) {
            return s.meta.sentencesCompleted >= 6 && s.resources.lexicons >= 3;
        },
        reveal: function (s) {
            return s.meta.sentencesCompleted >= 5 || s.resources.lexicons >= 2;
        }
    },
    {
        id: 'wax_reserve',
        title: 'Wax Reserve',
        flavor: 'a cake in the drawer. the wick is less greedy.',
        once: true,
        tab: 'study',
        costs: { ink: 40 },
        kind: 'building',
        reveal: function (s) {
            return Grimoire.hasUnlock(s, 'bolt_and_key') && s.resources.ink >= 20;
        }
    },
    {
        id: 'second_desk',
        title: 'Clear a Second Desk',
        flavor: 'two lists at once. you can see one more thing waiting.',
        once: true,
        tab: 'study',
        costs: { ink: 50, lexicons: 2 },
        kind: 'gate',
        reveal: function (s) {
            return Grimoire.hasUnlock(s, 'collation');
        }
    },
    {
        id: 'margin_lamp',
        title: 'Margin Lamp',
        flavor: 'a smaller light for the edge of the page. the dark is less close.',
        once: true,
        tab: 'study',
        costs: { ink: 24 },
        kind: 'micro',
        reveal: function (s) {
            return Grimoire.hasUnlock(s, 'bolt_and_key');
        }
    },
    {
        id: 'codex_bind',
        title: 'Bind the Codex',
        flavor: 'the sentences have a list. you can read them again.',
        once: true,
        tab: 'study',
        costs: { lexicons: 1 },
        kind: 'gate',
        reveal: function (s) {
            return Grimoire.hasUnlock(s, 'collation');
        }
    },
    {
        id: 'light_cellars',
        title: 'Light the Cellars',
        flavor: 'a cheap wick on a hook. the first room takes.',
        once: true,
        tab: 'estate',
        costs: { tallow: 8 },
        kind: 'gate',
        strictReveal: true,
        reveal: function (s) {
            return !!s.meta.shuttersOpen;
        }
    },
    {
        id: 'light_library',
        title: 'Light the Library',
        flavor: 'lamps for the shelves. the table can be used.',
        once: true,
        tab: 'estate',
        costs: { tallow: 12 },
        kind: 'gate',
        strictReveal: true,
        teaseWhen: function (s) {
            return Grimoire.hasUnlock(s, 'light_cellars');
        },
        reveal: function (s) {
            return Grimoire.hasUnlock(s, 'light_cellars') && s.resources.tallow >= 6;
        }
    },
    {
        id: 'light_glasshouse',
        title: 'Light the Glasshouse',
        flavor: 'a stove under glass. the earth will drip without you.',
        once: true,
        tab: 'estate',
        costs: { tallow: 18 },
        kind: 'gate',
        strictReveal: true,
        teaseWhen: function (s) {
            return Grimoire.hasUnlock(s, 'light_cellars') &&
                (s.resources.folios >= 1 || s.resources.vellum >= 1);
        },
        reveal: function (s) {
            return Grimoire.hasUnlock(s, 'light_cellars') &&
                (s.resources.folios >= 1 || s.resources.vellum >= 1) &&
                s.resources.tallow >= 9;
        }
    },
    {
        id: 'light_vault',
        title: 'Light the Vault',
        flavor: 'a flame over the basin. surplus ink has somewhere to go.',
        once: true,
        tab: 'estate',
        costs: { ink: 16 },
        kind: 'gate',
        strictReveal: true,
        teaseWhen: function (s) {
            if (!s.meta.shuttersOpen) return false;
            if (Grimoire.estate.litCount(s) < 1) return false;
            return s.resources.ink >= 40 || (s.generators.assignments.copy || 0) >= 1;
        },
        reveal: function (s) {
            if (!s.meta.shuttersOpen) return false;
            if (Grimoire.estate.litCount(s) < 1) return false;
            if (!(s.resources.ink >= 40 || (s.generators.assignments.copy || 0) >= 1)) return false;
            return s.resources.ink >= 16;
        }
    },
    {
        id: 'tool_cellars',
        title: 'Flensing Knife',
        flavor: 'the hide comes away faster.',
        once: false,
        tab: 'estate',
        costs: { ink: 10 },
        rate: 1.15,
        kind: 'building',
        reveal: function (s) {
            return Grimoire.hasUnlock(s, 'light_cellars');
        }
    },
    {
        id: 'tool_library',
        title: 'Reading Stand',
        flavor: 'the leaves stay where you put them.',
        once: false,
        tab: 'estate',
        costs: { ink: 14 },
        rate: 1.15,
        kind: 'building',
        reveal: function (s) {
            return Grimoire.hasUnlock(s, 'light_library');
        }
    },
    {
        id: 'tool_glasshouse',
        title: 'Misting Pan',
        flavor: 'the earth stays wet. the drip is less shy.',
        once: false,
        tab: 'estate',
        costs: { ink: 12 },
        rate: 1.15,
        kind: 'building',
        reveal: function (s) {
            return Grimoire.hasUnlock(s, 'light_glasshouse');
        }
    },
    {
        id: 'tool_vault',
        title: 'Acid Retort',
        flavor: 'the bath takes the tarnish sooner.',
        once: false,
        tab: 'estate',
        costs: { silver: 1 },
        rate: 1.15,
        kind: 'building',
        reveal: function (s) {
            return Grimoire.hasUnlock(s, 'light_vault') && s.resources.silver >= 1;
        }
    },
    {
        id: 'mechanical_cataloger',
        title: 'Mechanical Cataloger',
        flavor: 'it finishes the leaves while you are in another room. it does not wind down.',
        once: true,
        tab: 'estate',
        costs: { silver: 1, ink: 18 },
        kind: 'gate',
        strictReveal: true,
        teaseWhen: function (s) {
            return Grimoire.hasUnlock(s, 'light_vault') || s.resources.silver >= 1;
        },
        reveal: function (s) {
            return s.resources.silver >= 1 && s.resources.ink >= 9;
        }
    },
    {
        id: 'packet_gate',
        title: 'Leave a Packet at the Gate',
        flavor: 'one lexicon, one folio. down the drive. nothing comes back.',
        once: true,
        tab: 'estate',
        costs: { lexicons: 1, folios: 1 },
        kind: 'gate',
        strictReveal: true,
        teaseWhen: function (s) {
            return s.meta.shuttersOpen && (s.resources.folios >= 1 || Grimoire.hasUnlock(s, 'light_library'));
        },
        reveal: function (s) {
            return s.resources.folios >= 1 && s.resources.lexicons >= 1;
        }
    },
    {
        id: 'hall_lantern',
        title: 'Hang a Hall Lantern',
        flavor: 'a lantern in the crossing. the dark rooms keep their names.',
        once: true,
        tab: 'estate',
        costs: { tallow: 8 },
        kind: 'gate',
        strictReveal: true,
        teaseWhen: function (s) {
            return Grimoire.hasUnlock(s, 'light_cellars');
        },
        reveal: function (s) {
            return Grimoire.hasUnlock(s, 'light_cellars') && s.resources.tallow >= 4;
        }
    },
    {
        id: 'file_folios',
        title: 'File the Folios',
        flavor: 'three covers on a shelf. the house keeps them in order.',
        once: true,
        tab: 'estate',
        costs: { folios: 3 },
        kind: 'gate',
        strictReveal: true,
        teaseWhen: function (s) {
            return !!s.meta.packetLeft && (s.resources.folios >= 1 || Grimoire.hasUnlock(s, 'light_library'));
        },
        reveal: function (s) {
            return !!s.meta.packetLeft && s.resources.folios >= 1;
        }
    },
    {
        id: 'packet_again',
        title: 'Leave a Second Packet',
        flavor: 'two folios, one lexicon. down the drive again.',
        once: true,
        tab: 'estate',
        costs: { lexicons: 1, folios: 2 },
        kind: 'gate',
        strictReveal: true,
        teaseWhen: function (s) {
            return !!s.meta.drawerOpen && !s.meta.packetTwice;
        },
        reveal: function (s) {
            return !!s.meta.drawerOpen && !s.meta.packetTwice &&
                (s.resources.folios >= 1 || s.resources.lexicons >= 1);
        }
    }
];

Grimoire.CONTENT.events = [
    {
        id: 'draft_under_door',
        once: true,
        when: function (s) {
            return Grimoire.hasUnlock(s, 'name_flame') && s.meta.playMs > 120000;
        },
        line: 'a draft under the door. the flame leans.',
        apply: function (s) {
            s.resources.oil = Math.max(0, s.resources.oil - 8);
        }
    },
    {
        id: 'wick_gutters',
        once: false,
        when: function (s) {
            return Grimoire.hasUnlock(s, 'name_flame') && s.resources.oil > 0 &&
                s.resources.oil < 25 && s.meta.candleLit;
        },
        line: 'the wick gutters. it wants feeding.',
        apply: function () {}
    },
    {
        id: 'page_weight',
        once: true,
        when: function (s) {
            return s.page.pagesFinished >= 1;
        },
        line: 'the book is heavier by one leaf.',
        apply: function () {}
    },
    {
        id: 'visitor_at_bolt',
        once: true,
        when: function (s) {
            return Grimoire.hasUnlock(s, 'bolt_and_key') && s.meta.playMs > 0;
        },
        line: 'a knock. you wait. no one is there.',
        apply: function () {}
    },
    {
        id: 'wrong_hour',
        once: false,
        horizon: 2,
        when: function (s) {
            return Grimoire.hasUnlock(s, 'bolt_and_key') && s.meta.playMs > 3600000;
        },
        line: 'the hall clock strikes thirteen.',
        apply: function (s) {
            s.meta.bleedLevel = Math.min(100, s.meta.bleedLevel + 1);
        }
    },
    {
        id: 'ink_unbidden',
        once: false,
        horizon: 2,
        when: function (s) {
            return Grimoire.hasUnlock(s, 'catalog_page') && Grimoire.hasUnlock(s, 'bolt_and_key');
        },
        line: 'a drop of ink on the blotter. you did not press.',
        apply: function (s) {
            s.resources.ink += 1;
            Grimoire.noteFirstInk(s);
        }
    }
];

Grimoire.CONTENT.hints = {
    light: 'the room waits. one match, one wick.',
    decipher: 'press a faded mark until it yields. insight, and a rune on the leaf. D',
    trim: 'feed the wick from the drip. you keep the light. you spend the fat. W',
    distill: 'render tallow into ink. the book cannot drink insight.',
    distillMutated: 'the same press. a colder name. fat still becomes ink.',
    lexicon: 'bind what repeats. five passages that hold, eight drops of ink, one cover.',
    doubt: 'a name that should not be here. dated tomorrow.',
    settings: 'the copy. export, import, or abandon this sitting.',
    insight: 'what the marks leave in you. spent on the small work of the desk.',
    tallow: 'fat from a living wick. trim for light, or distill for ink. not both.',
    ink: 'rendered tallow. for nibs, feathers, and the later tools of the room.',
    passages: 'a stretch that finally reads. spent to catalog, to craft, to open what is shut.',
    quills: 'hands that write without you. they transcribe until you assign otherwise.',
    lexicons: 'bound repeats. the house reads these more readily than loose leaves.',
    matches: 'phosphorus for a dead wick. three at first darkness. a strike costs insight.',
    candle: 'the room\'s only clock. when it dies, the page does too.',
    candleMeter: 'how much of the bowl remains. the flame\'s height is the same truth.',
    desk: 'the book. the wick. the first work.',
    study: 'the room that was always larger. jobs, boards, the later tools.',
    studyArt: 'the larger room. feathers take stations. the lamp answers a ward. the leaf only moves for Attend.',
    estate: 'the house has a shape. walk it. one room at a time.',
    binding: 'sealed. the rite is not for this sitting.',
    estateMap: 'click a door beside you, or use the arrows. a bar in a room means work is cooking. ! is a scrap left on a return walk.',
    estateFind: 'not on the first pass. walk a room again and sometimes a scrap is waiting. take it for a short help.',
    estateListen: 'the hall and the gate have a sound. it changes if the house is working, dark, or empty.',
    estateDrawer: 'a drawer in the hall. it wants a key from a return walk, and a drive that has already taken a packet.',
    salvageBatch: 'the wick died while this was cooking. scrape back a little, or dump it.',
    renderHide: 'tallow and time. a hide becomes vellum. you may leave it. standing here, it finishes sooner.',
    collateFolio: 'vellum and ink. the bar fills while you stand here, or a quill, or the Cataloger.',
    chargeBath: 'surplus ink into the basin. extracts hurry it. silver comes when it finishes. standing here, it finishes sooner.',
    tendGlass: 'it drips while you are away. standing here, or a quill, makes it less slow.',
    sendQuill: 'one feather may leave the study. it hurries the room it stands in. recall it to transcribe.',
    recallQuill: 'the house feather returns to Transcribe. Study has it again.',
    matchChoice: 'three insight, one match, a bowl that holds again.',
    sitChoice: 'you wait. an ember in eight seconds. the dark leaves a mark.',
    tease: 'the cost is visible. the work is not.',
    chapter: 'how much of the leaf has stayed. numbered after you keep an index.',
    vellum: 'hides rendered in the Cellars. Library collation spends them.',
    folios: 'sewn leaves. the gate wants them. a shelf will take extras after the first packet.',
    extracts: 'glasshouse drip. a vault bath will take a drop if you have one.',
    silver: 'from a vault bath, not from clicking. house tools and the Cataloger spend it.',
};

Grimoire.CONTENT.projectHints = {
    catalog_page: 'one finished leaf, spent. after this, fat can be pressed into ink.',
    wick_stub: 'a saved end in the bowl. a little more light. once.',
    catch_drip: 'more fat from the same burn. a dish under the lip.',
    press_once: 'three packs only. each adds 15 charges. Decipher spends one for +1 insight. a short help before a quill can be bound.',
    steady_hand: 'more letters stay on the leaf. one in three, not one in four.',
    steel_nib: 'each click leaves more insight. cheap at first. the price climbs.',
    bind_quill: 'a feather that transcribes while you look away. it will not turn the page for you.',
    spare_matches: 'two more lights. the box will not hold more than twelve.',
    prism: 'the flame is split. oil lasts. each next prism helps less.',
    shelf: 'jars for drippings. more tallow can be kept.',
    spare_lamp: 'another bowl. more oil can be kept.',
    attend_lesson: 'unlocks a job: a quill may watch the leaf. slow. the only automatic writing.',
    collation: 'a board for repeats. after this, lexicons can be bound.',
    index: 'the chapter numbered. you can find a page by its place.',
    under_text: 'read what is under the scraping. the room admits more. the blotter notices.',
    suppress: 'close what was opened. the room is smaller. safer, if you want that.',
    listen_shutter: 'oil and a lexicon, spent on a sound. three times. then silence.',
    open_shutters: 'the sixth sentence, and three bound covers. the grounds do not end.',
    wax_reserve: 'a cake in the drawer. the wick eats slower. once.',
    second_desk: 'one more waiting row on the list. you see further.',
    margin_lamp: 'the dark sits further from the page. you still need the wick.',
    codex_bind: 'the sentences listed. you may read them again.',
    light_cellars: 'the first wick in the house. cheap tallow. a hide can be rendered here.',
    light_library: 'lamps for the shelves. collation needs the vellum the Cellars made.',
    light_glasshouse: 'a stove under glass. extracts drip on the season clock. no sudden gifts.',
    light_vault: 'a flame over the basin. ink you already have becomes silver, slowly.',
    tool_cellars: 'shortens a render. the price climbs. there is no second workforce.',
    tool_library: 'shortens a collation. the Cataloger is separate, and permanent.',
    tool_glasshouse: 'the drip is less shy. still the same 80-minute season.',
    tool_vault: 'the bath finishes sooner. paid in silver you already rendered.',
    mechanical_cataloger: 'Library collations finish while you walk elsewhere. it never decays.',
    packet_gate: 'one lexicon and one folio, left on the gravel. nothing returns. obituaries stay a memory, not a craft.',
    hall_lantern: 'hung in the crossing. unlit wings keep their names on the map. they still need their own Light.',
    file_folios: 'three sewn covers, filed. the house work runs a little shorter. after the first packet.',
    packet_again: 'two folios and a lexicon, after the drawer. still nothing returns.'
};

