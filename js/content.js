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
        boot: 'a heavy book, brass-bound, dusty.',
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
            hint: 'ink from insight. the well must not be dry. the page is still not written.'
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

    estateRooms: ['Library', 'Vault', 'Glasshouse', 'Cellars'],

    listenLines: [
        'wood ticks in the shutter-frame. nothing answers.',
        'a gap in the slats. gravel, or something that sounds like it.',
        'the last listen: a latch that is not on this side.'
    ],

    welcomeBack: function (oilPct, insightGained, oilEmpty) {
        if (oilEmpty) {
            return 'the house was dark for hours. the book is where you left it.';
        }
        var oilBit = oilPct >= 50 ? 'the oil still holds.' : 'the oil is lower.';
        if (insightGained >= 1) {
            return oilBit + ' insight gathered while you were gone: ' + insightGained + '.';
        }
        return oilBit + ' the page did not turn itself.';
    }
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
        costs: { insight: 8 },
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
        rate: 1.07,
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
        costs: { ink: 12 },
        rate: 1.15,
        kind: 'building',
        cap: 12,
        capKey: 'quills',
        reveal: function (s) {
            return (s.purchased.steel_nib || 0) >= 1 || s.resources.ink >= 6;
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
        costs: { ink: 12, passages: 1 },
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
        costs: { ink: 25, passages: 2 },
        kind: 'gate',
        reveal: function (s) {
            return Grimoire.hasUnlock(s, 'bolt_and_key') && s.resources.ink >= 12;
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
        flavor: 'another hand under the ink. the room admits more than it should.',
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
        flavor: 'you press the extra hand back under. the room is smaller again.',
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
        costs: { ink: 15 },
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
        line: 'the wick gutters. tallow would hold it.',
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
        }
    }
];

Grimoire.CONTENT.hints = {
    light: 'the room waits. one match, one wick.',
    decipher: 'press a faded mark until it yields. insight, and a rune on the leaf. D',
    trim: 'feed the wick from the drip. you keep the light. you spend the fat. W',
    distill: 'render tallow into ink. the book cannot drink insight.',
    distillMutated: 'the same press. a colder name. fat still becomes ink.',
    lexicon: 'bind what repeats. five finished leaves and eight drops make a cover.',
    doubt: 'a name that should not be here. dated tomorrow.',
    settings: 'the copy. export, import, or abandon this sitting.',
    insight: 'what the marks leave in you. spent on the small work of the desk.',
    tallow: 'fat from a living wick. trim for light, or distill for ink. not both.',
    ink: 'rendered tallow. for nibs, feathers, and the later tools of the room.',
    passages: 'a finished leaf. spent to catalog, to craft, to open what is shut.',
    quills: 'hands that write without you. they transcribe until you assign otherwise.',
    lexicons: 'bound repeats. the house reads these more readily than loose leaves.',
    matches: 'phosphorus for a dead wick. three at first darkness. a strike costs insight.',
    candle: 'the room\'s only clock. when it dies, the page does too.',
    candleMeter: 'how much of the bowl remains. the flame\'s height is the same truth.',
    desk: 'the book. the wick. the first work.',
    study: 'the room that was always larger. jobs, boards, the later tools.',
    estate: 'named dark. the grounds do not end where the lantern does.',
    binding: 'sealed. the rite is not for this sitting.',
    matchChoice: 'three insight, one match, a bowl that holds again.',
    sitChoice: 'you wait. an ember in eight seconds. the dark leaves a mark.',
    tease: 'the cost is visible. the work is not.'
};

Grimoire.CONTENT.projectHints = {
    catalog_page: 'one finished leaf, spent. after this, fat can be pressed into ink.',
    wick_stub: 'a saved end in the bowl. a little more light. once.',
    catch_drip: 'more fat from the same burn. a dish under the lip.',
    press_once: 'each buy adds 15 charges. Decipher spends one for +1 insight. buy again to add more. grey means you cannot pay the next cost yet.',
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
    under_text: 'open the aperture. the room admits more. the blotter notices.',
    suppress: 'close what was opened. the room is smaller. safer, if you want that.',
    listen_shutter: 'oil and a lexicon, spent on a sound. three times. then silence.',
    open_shutters: 'the sixth sentence, and three bound covers. the grounds do not end.',
    wax_reserve: 'a cake in the drawer. the wick eats slower. once.',
    second_desk: 'one more waiting row on the list. you see further.',
    margin_lamp: 'the dark sits further from the page. you still need the wick.',
    codex_bind: 'the sentences listed. you may read them again.'
};

