/**
 * Headless pacing playthrough against the live Grimoire engine.
 * Loads the real systems (not view/debug) and drives a fake 200 ms clock.
 *
 * Usage: node tools/pacing-playthrough.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const TICK_MS = 200;
const DT = TICK_MS / 1000;
const MAX_MS = 8 * 60 * 60 * 1000;

const BIBLE = [
    { id: 'light', label: 'Light the Candle', lo: 0, hi: 0.25, unit: 'min' },
    { id: 'name_flame', label: 'Flame named', lo: 0.5, hi: 1.0, note: '~45 s at 8 Insight' },
    { id: 'catch_drip', label: 'Catch the Drip', lo: 0.75, hi: 2.0, note: '12 Insight, first buy after naming' },
    { id: 'first_page', label: 'First page', lo: 2, hi: 4 },
    { id: 'catalog', label: 'Catalog / Distill', lo: 2, hi: 4 },
    { id: 'first_ink', label: 'First ink', lo: 4, hi: 8 },
    { id: 'first_micro', label: 'Press Once / Steady', lo: 4, hi: 8 },
    { id: 'first_quill', label: 'First quill', lo: 10, hi: 15 },
    { id: 'study', label: 'Sentence 3 / Study', lo: 30, hi: 90, note: 'mixed 30–90; center 45–75; clicker may be earlier' },
    { id: 'first_lexicon', label: 'First Lexicon', lo: 60, hi: 120 },
    { id: 'solstice', label: 'First Solstice', lo: 240, hi: 240, note: 'three 80 min seasons' },
    { id: 'sentence_6', label: 'Sentence 6', lo: 180, hi: 300 },
    { id: 'shutters', label: 'Open the Shutters', lo: 180, hi: 300 },
    { id: 'sentence_12', label: 'Sentences 7–12', lo: 300, hi: 480 }
];

const POLICIES = [
    {
        id: 'clicker',
        name: 'Dedicated clicker',
        desc: 'Decipher every 200 ms while lit. Keeps clicking after Attend. Same candle/shop brain as the others.',
        clickEveryTicks: 1,
        burst: 0,
        idleTicks: 0,
        stopClickAfterAttend: false,
        slowClickAfterAttendEvery: 0,
        maxAttend: 3
    },
    {
        id: 'engaged',
        name: 'Engaged mixed',
        desc: 'About 1 Decipher/s while lit — a person still working the page, not a 5 CPS rush. Slows to 1/4s after Attend.',
        clickEveryTicks: 5,
        burst: 0,
        idleTicks: 0,
        stopClickAfterAttend: false,
        slowClickAfterAttendEvery: 20,
        maxAttend: 2
    },
    {
        id: 'mixed',
        name: 'Mixed sitting',
        desc: 'Bursts of 8 clicks, then ~20 s looking at the blotter/candle/shop. After Attend, mostly lets the quill write (1 click / 8 s).',
        clickEveryTicks: 1,
        burst: 8,
        idleTicks: 100,
        stopClickAfterAttend: false,
        slowClickAfterAttendEvery: 40,
        maxAttend: 1
    },
    {
        id: 'leisure',
        name: 'Leisure mixed',
        desc: 'One Decipher every 7 s (the rate that would put 552 runes near the 45–75 min Study window). Stops clicking after Attend.',
        clickEveryTicks: 35,
        burst: 0,
        idleTicks: 0,
        stopClickAfterAttend: true,
        slowClickAfterAttendEvery: 0,
        maxAttend: 1
    }
];

function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0;
        a = a + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function loadGame(clock) {
    const sandbox = {
        console,
        Math,
        JSON,
        Object,
        Array,
        String,
        Number,
        Boolean,
        Infinity,
        NaN,
        parseInt,
        parseFloat,
        isFinite,
        isNaN,
        undefined,
        encodeURIComponent,
        decodeURIComponent,
        unescape,
        escape,
        btoa: (s) => Buffer.from(s, 'utf8').toString('base64'),
        atob: (s) => Buffer.from(s, 'base64').toString('utf8'),
        performance: { now: () => clock.ms },
        Date: Object.assign(function FakeDate(...args) {
            if (!(this instanceof FakeDate)) {
                return new Date(clock.ms);
            }
            if (args.length === 0) return new Date(clock.ms);
            return new Date(...args);
        }, { now: () => clock.ms, parse: Date.parse, UTC: Date.UTC }),
        localStorage: {
            _d: {},
            getItem(k) { return this._d[k] == null ? null : this._d[k]; },
            setItem(k, v) { this._d[k] = String(v); },
            removeItem(k) { delete this._d[k]; }
        },
        sessionStorage: {
            _d: {},
            getItem(k) { return this._d[k] == null ? null : this._d[k]; },
            setItem(k, v) { this._d[k] = String(v); },
            removeItem(k) { delete this._d[k]; }
        },
        document: { addEventListener() {}, hidden: false },
        location: { reload() {} },
        window: null,
        Grimoire: {}
    };
    sandbox.window = sandbox;
    sandbox.global = sandbox;
    sandbox.Date.now = () => clock.ms;

    const files = [
        'js/content.js',
        'js/systems/economics.js',
        'js/state.js',
        'js/systems/candle.js',
        'js/systems/pages.js',
        'js/systems/jobs.js',
        'js/systems/estate.js',
        'js/systems/projects.js',
        'js/systems/bleed.js',
        'js/engine.js'
    ];
    const ctx = vm.createContext(sandbox);
    for (const f of files) {
        const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
        vm.runInContext(code, ctx, { filename: f });
    }
    vm.runInContext(`
        Grimoire.view = {
            alwaysTickVisuals: function () {},
            draw: function () {},
            stepFlame: function () {},
            stepAscii: function () {},
            playLightCue: function () {}
        };
        Grimoire.saveToStorage = function () { return true; };
    `, ctx);
    return ctx;
}

function fmtMin(ms) {
    if (ms == null) return null;
    return Math.round(ms / 1000 / 6) / 10;
}

function fmtClock(ms) {
    if (ms == null) return '—';
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return h + 'h ' + String(m).padStart(2, '0') + 'm';
    return m + 'm ' + String(sec).padStart(2, '0') + 's';
}

function verdict(ms, lo, hi) {
    if (ms == null) return 'missing';
    const min = ms / 60000;
    if (min < lo) return 'early';
    if (min > hi) return 'late';
    return 'on';
}

function wantInk(G, s) {
    if (!G.hasUnlock(s, 'catalog_page')) return false;
    if ((s.generators.quills || 0) < 3) return true;
    if (G.hasUnlock(s, 'bolt_and_key') && !G.hasUnlock(s, 'attend_lesson')) return true;
    if (G.hasUnlock(s, 'bolt_and_key') && !G.hasUnlock(s, 'collation')) return true;
    if (G.hasUnlock(s, 'collation') && s.resources.lexicons < 3) return true;
    if ((s.generators.quills || 0) < 6) return true;
    if (!G.hasUnlock(s, 'wax_reserve')) return true;
    if ((s.generators.prisms || 0) < 2) return true;
    return s.resources.tallow > G.candle.tallowCap(s) - 15;
}

function manageCandle(G, s, now) {
    const acts = { trim: 0, distill: 0, match: 0, sit: 0 };
    if (!s.meta.deskRevealed) return acts;
    const drowned = !s.meta.candleLit || s.resources.oil <= 0;
    const free = s.meta.trimsDone < 2;
    const canTrim = free || s.resources.tallow >= G.candle.TRIM_COST;

    if (drowned) {
        if (s.meta.emberUntil && now < s.meta.emberUntil) return acts;
        if (canTrim) {
            if (G.candle.trim(s)) acts.trim = 1;
            return acts;
        }
        if (s.resources.matches >= 1 && s.resources.insight >= 3) {
            if (G.candle.strikeMatch(s)) acts.match = 1;
            return acts;
        }
        if (G.candle.sitInDark(s)) acts.sit = 1;
        return acts;
    }

    const cap = G.candle.oilCap(s);
    const pct = cap > 0 ? s.resources.oil / cap : 0;
    if (pct < 0.32 && canTrim) {
        if (G.candle.trim(s)) acts.trim = 1;
        return acts;
    }

    if (G.hasUnlock(s, 'catalog_page') && s.resources.tallow >= 5) {
        const reserve = pct < 0.45 && !free ? 3 : 0;
        const hungry = wantInk(G, s);
        const nearCap = s.resources.tallow >= G.candle.tallowCap(s) - 8;
        while (s.resources.tallow >= 5 + reserve && (hungry || nearCap || s.resources.tallow >= 25)) {
            if (!G.candle.distill(s)) break;
            acts.distill += 1;
            if (!hungry && !nearCap && acts.distill >= 2) break;
            if (acts.distill >= 8) break;
        }
    }
    return acts;
}

function shop(G, s) {
    const bought = [];
    const P = G.projects;
    if (P.canLexicon(s) && s.resources.lexicons < 3) {
        if (P.bindLexicon(s)) bought.push('lexicon');
    } else if (P.canLexicon(s) && s.meta.shuttersOpen && s.resources.passages >= 10) {
        if (P.bindLexicon(s)) bought.push('lexicon');
    }

    const onDesk = !G.hasUnlock(s, 'bolt_and_key');
    const order = [
        'catalog_page',
        'catch_drip',
        'bind_quill',
        'attend_lesson',
        'collation',
        'open_shutters',
        'wick_stub',
        'press_once',
        'steel_nib',
        'prism',
        'wax_reserve',
        'spare_lamp',
        'shelf',
        'spare_matches',
        'steady_hand',
        'margin_lamp',
        'index',
        'codex_bind',
        'second_desk'
    ];
    for (const id of order) {
        const p = P.byId(id);
        if (!p) continue;
        if (onDesk && p.tab === 'study') continue;
        if (id === 'bind_quill') {
            var qn = s.generators.quills || 0;
            if (qn >= 8) continue;
            if (!G.hasUnlock(s, 'collation') && qn >= 2) continue;
            if (!s.meta.shuttersOpen && qn >= 4 && s.resources.lexicons < 3) continue;
        }
        if ((id === 'index' || id === 'codex_bind' || id === 'second_desk') && !s.meta.shuttersOpen) continue;
        if (!P.isRevealed(s, p) && !(p.require && P.canBuy(s, p))) continue;
        if (id === 'steel_nib' && (s.generators.quills || 0) < 1) continue;
        if (id === 'press_once' && (s.generators.quills || 0) >= 1 && s.meta.playMs > 20 * 60 * 1000) continue;
        if (id === 'spare_matches' && !s.meta.darknessSeen) continue;
        if (id === 'spare_matches' && (s.generators.quills || 0) < 1) continue;
        if (id === 'prism' && (s.generators.quills || 0) < 1) continue;
        if ((id === 'prism' || id === 'spare_lamp') && s.resources.lexicons < 3 && !s.meta.shuttersOpen) continue;
        if (id === 'steel_nib' && (s.generators.nibs || 0) >= 6) continue;
        if (!P.canBuy(s, p)) continue;
        if (P.buy(s, id)) bought.push(id);
        if (bought.length >= 3) break;
    }
    return bought;
}

function rebalanceJobs(G, s, policy) {
    if (!G.hasUnlock(s, 'bolt_and_key')) return;
    const q = s.generators.quills || 0;
    const a = { transcribe: 0, copy: 0, attend: 0, ward: 0 };
    if (q <= 0) {
        s.generators.assignments = a;
        return;
    }
    const needPages = s.meta.sentencesCompleted < 12;
    const needInk = wantInk(G, s);
    const solstice = s.meta.season === 3;
    let attendN = 0;
    if (G.hasUnlock(s, 'attend_lesson') && needPages) {
        const cap = policy.maxAttend == null ? 1 : policy.maxAttend;
        attendN = Math.min(cap, q);
        if (needInk && q >= 3) attendN = Math.min(attendN, q - 1);
    }
    let wardN = 0;
    if (solstice && q - attendN >= 2) wardN = 1;
    if (q >= 7 && q - attendN - wardN >= 1) wardN = Math.min(2, wardN + 1);
    let remain = q - attendN - wardN;
    if (remain < 0) {
        attendN += remain;
        remain = 0;
    }
    let copyN = 0;
    if (needInk && remain >= 2) copyN = Math.min(remain - 1, policy.id === 'clicker' ? 3 : 2);
    else if (needInk && remain === 1 && s.resources.insight > 20) copyN = 1;
    a.attend = attendN;
    a.ward = wardN;
    a.copy = copyN;
    a.transcribe = remain - copyN;
    s.generators.assignments = a;
}

function shouldClick(s, policy, tick, burstLeft, now) {
    if (!s.meta.deskRevealed) return { click: false, burstLeft };
    if (!s.meta.candleLit || s.resources.oil <= 0) return { click: false, burstLeft };
    if (s.meta.emberUntil && now < s.meta.emberUntil) return { click: false, burstLeft };
    const attended = s.unlocks.indexOf('attend_lesson') !== -1;
    if (attended && policy.stopClickAfterAttend) return { click: false, burstLeft };
    let every = policy.clickEveryTicks;
    if (attended && policy.slowClickAfterAttendEvery) every = policy.slowClickAfterAttendEvery;
    if (policy.burst > 0 && !(attended && policy.slowClickAfterAttendEvery)) {
        if (burstLeft > 0) return { click: true, burstLeft: burstLeft - 1 };
        const cycle = policy.burst + policy.idleTicks;
        const pos = tick % cycle;
        if (pos === 0) return { click: true, burstLeft: policy.burst - 1 };
        return { click: false, burstLeft: 0 };
    }
    if (tick % every === 0) return { click: true, burstLeft };
    return { click: false, burstLeft };
}

function snapshot(G, s) {
    return {
        tMin: Math.round(s.meta.playMs / 6000) / 10,
        insight: Math.floor(s.resources.insight),
        oil: Math.floor(s.resources.oil),
        tallow: Math.floor(s.resources.tallow),
        ink: Math.floor(s.resources.ink),
        passages: s.resources.passages,
        lexicons: s.resources.lexicons,
        pages: s.page.pagesFinished,
        sentences: s.meta.sentencesCompleted,
        quills: s.generators.quills || 0,
        season: G.CONTENT.seasons[s.meta.season] || 'Spring',
        decay: Math.round(G.candle.decayRate(s) * 100) / 100
    };
}

function runPolicy(policy, seed) {
    const clock = { ms: 1_000_000_000_000 };
    const rng = mulberry32(seed);
    const ctx = loadGame(clock);
    const G = ctx.Grimoire;
    ctx.Math.random = rng;
    ctx.Date.now = () => clock.ms;
    G.Date = ctx.Date;

    G.state = G.defaultState();
    G.pages.generate(G.state);
    const s = G.state;

    const beats = {};
    const markBeat = (id) => {
        if (beats[id] == null) beats[id] = s.meta.playMs;
    };

    const samples = [];
    const grey = {};
    const greyFirst30 = {};
    let longestGrey30 = { id: null, ms: 0 };
    let hungerGaps30 = 0;
    let clicks = 0;
    let distills = 0;
    let trims = 0;
    let sits = 0;
    let matches = 0;
    let darkMs = 0;
    let burstLeft = 0;
    let lastJobAt = -999;
    let tick = 0;
    const purchases = [];

    G.candle.lightFromBoot(s);
    markBeat('light');

    const maxTicks = Math.floor(MAX_MS / TICK_MS);
    for (tick = 0; tick < maxTicks; tick++) {
        clock.ms += TICK_MS;
        s.meta.playMs += TICK_MS;

        if (!s.meta.settingsUnlocked && s.meta.playMs >= 90000) {
            s.meta.settingsUnlocked = true;
            markBeat('settings');
        }

        const acts = manageCandle(G, s, clock.ms);
        trims += acts.trim;
        distills += acts.distill;
        sits += acts.sit;
        matches += acts.match;

        const clickPlan = shouldClick(s, policy, tick, burstLeft, clock.ms);
        burstLeft = clickPlan.burstLeft;
        if (clickPlan.click) {
            if (G.pages.decipherClick(s)) clicks += 1;
        }

        const bought = shop(G, s);
        for (const id of bought) {
            purchases.push({ id, t: s.meta.playMs });
        }
        if (tick - lastJobAt >= 25) {
            rebalanceJobs(G, s, policy);
            lastJobAt = tick;
        }

        G.engine.tick.call(G.engine, DT);

        if (!s.meta.candleLit || s.resources.oil <= 0) darkMs += TICK_MS;

        if (G.hasUnlock(s, 'name_flame')) markBeat('name_flame');
        if (s.meta.tallowLogged) markBeat('first_tallow');
        if (s.page.pagesFinished >= 1) markBeat('first_page');
        if (G.hasUnlock(s, 'catalog_page')) markBeat('catalog');
        if (s.meta.inkLogged) markBeat('first_ink');
        if (s.meta.darknessSeen) markBeat('first_darkness');
        if (s.purchased.catch_drip) markBeat('catch_drip');
        if ((s.purchased.press_once || s.purchased.steady_hand || s.purchased.wick_stub)) {
            markBeat('first_micro');
        }
        if ((s.generators.quills || 0) >= 1) markBeat('first_quill');
        if (G.hasUnlock(s, 'bolt_and_key')) markBeat('study');
        if (G.hasUnlock(s, 'attend_lesson')) markBeat('attend');
        if (G.hasUnlock(s, 'collation')) markBeat('collation');
        if (s.resources.lexicons >= 1) markBeat('first_lexicon');
        if (s.meta.sentencesCompleted >= 6) markBeat('sentence_6');
        if (s.meta.shuttersOpen) markBeat('shutters');
        if (s.meta.sentencesCompleted >= 12) markBeat('sentence_12');
        if (s.meta.season === 3 && beats.solstice == null) markBeat('solstice');
        for (let n = 1; n <= 12; n++) {
            if (s.meta.sentencesCompleted >= n) markBeat('sentence_' + n);
        }

        if (s.meta.playMs <= 30 * 60 * 1000) {
            const onDesk = !G.hasUnlock(s, 'bolt_and_key');
            const list = G.CONTENT.projects;
            let anyGrey = false;
            let anyBuy = false;
            for (let i = 0; i < list.length; i++) {
                const p = list[i];
                if (p.auto) continue;
                if (onDesk && p.tab === 'study') continue;
                if (!G.projects.isRevealed(s, p)) continue;
                if (G.projects.atCap(s, p) && p.id !== 'press_once') continue;
                if (G.projects.canBuy(s, p)) {
                    anyBuy = true;
                    continue;
                }
                anyGrey = true;
                grey[p.id] = (grey[p.id] || 0) + TICK_MS;
                greyFirst30[p.id] = (greyFirst30[p.id] || 0) + TICK_MS;
                if (greyFirst30[p.id] > longestGrey30.ms) {
                    longestGrey30 = { id: p.id, ms: greyFirst30[p.id] };
                }
            }
            if (anyGrey && !anyBuy && !clickPlan.click && acts.distill === 0 && acts.trim === 0) {
                hungerGaps30 += TICK_MS;
            }
        }

        if (tick % 300 === 0) samples.push(snapshot(G, s));

        if (s.meta.shuttersOpen && s.meta.sentencesCompleted >= 12 && s.meta.season === 3) {
            if (s.meta.playMs > beats.solstice + 5000) break;
        }
        if (s.meta.playMs >= MAX_MS) break;
    }
    samples.push(snapshot(G, s));

    const beatRows = BIBLE.map((b) => {
        const ms = beats[b.id];
        return {
            id: b.id,
            label: b.label,
            target: b.lo === b.hi ? '~' + b.lo + ' min' : b.lo + '–' + b.hi + ' min',
            lo: b.lo,
            hi: b.hi,
            note: b.note || '',
            ms: ms == null ? null : ms,
            clock: fmtClock(ms),
            minutes: ms == null ? null : Math.round(ms / 6000) / 10,
            verdict: verdict(ms, b.lo, b.hi)
        };
    });

    const greyList = Object.keys(greyFirst30)
        .map((id) => ({ id, ms: greyFirst30[id], s: Math.round(greyFirst30[id] / 1000) }))
        .sort((a, b) => b.ms - a.ms)
        .slice(0, 8);

    return {
        policy: policy.id,
        name: policy.name,
        desc: policy.desc,
        seed,
        endedMs: s.meta.playMs,
        endedClock: fmtClock(s.meta.playMs),
        beats,
        beatRows,
        samples,
        clicks,
        distills,
        trims,
        sits,
        matches,
        darkMin: Math.round(darkMs / 6000) / 10,
        snuffs: s.meta.snuffs || 0,
        hungerGaps30s: Math.round(hungerGaps30 / 1000),
        longestGrey30: longestGrey30.id
            ? { id: longestGrey30.id, s: Math.round(longestGrey30.ms / 1000) }
            : null,
        greyFirst30: greyList,
        purchases: purchases.map((p) => ({ id: p.id, clock: fmtClock(p.t), min: Math.round(p.t / 6000) / 10 })),
        final: {
            insight: Math.floor(s.resources.insight),
            oil: Math.floor(s.resources.oil),
            tallow: Math.floor(s.resources.tallow),
            ink: Math.floor(s.resources.ink),
            passages: s.resources.passages,
            lexicons: s.resources.lexicons,
            matches: s.resources.matches,
            pages: s.page.pagesFinished,
            runes: s.page.runesFinishedLifetime,
            sentences: s.meta.sentencesCompleted,
            quills: s.generators.quills || 0,
            nibs: s.generators.nibs || 0,
            prisms: s.generators.prisms || 0,
            lamps: s.generators.lamps || 0,
            shelves: s.generators.shelves || 0,
            boards: s.generators.boards || 0,
            attend: s.generators.assignments.attend || 0,
            copy: s.generators.assignments.copy || 0,
            transcribe: s.generators.assignments.transcribe || 0,
            ward: s.generators.assignments.ward || 0,
            season: G.CONTENT.seasons[s.meta.season],
            seasonTick: s.meta.seasonTick,
            bleed: Math.round(s.meta.bleedLevel * 10) / 10,
            shutters: !!s.meta.shuttersOpen,
            translation: G.translationPercent(s)
        }
    };
}

function main() {
    const seed = 20260905;
    const runs = POLICIES.map((p) => runPolicy(p, seed));
    const theory = {
        runesToStudy: 24 + 14 * 48,
        runesToS6: 24 + 26 * 48,
        runesToS12: 24 + 50 * 48,
        pagesToStudy: 15,
        pagesToS6: 27,
        pagesToS12: 51,
        pagesForDeskSentence: 5,
        attendPerQuill: 0.08,
        drip: 0.12,
        decay: 0.35,
        seasonMin: 80,
        solsticeAtMin: 240,
        note: 'Pages cannot be automated until Attend (post-Study). Study time is click-count / click rate on 552 runes, plus oil/darkness interruptions.'
    };
    const out = {
        generatedAt: new Date().toISOString(),
        engine: 'live js/* via vm, 200 ms ticks, 8 h cap',
        seed,
        theory,
        bible: BIBLE,
        runs
    };
    const jsonPath = path.join(ROOT, 'tools', 'pacing-results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(out, null, 2));
    const lines = [];
    lines.push('Grimoire pacing playthrough  seed=' + seed);
    lines.push('theory: ' + theory.runesToStudy + ' runes to Study, ' + theory.runesToS6 + ' to Sentence 6, Attend 0.08 runes/s');
    for (const r of runs) {
        lines.push('');
        lines.push('== ' + r.name + '  ended ' + r.endedClock + '  clicks=' + r.clicks + '  snuffs=' + r.snuffs + ' ==');
        for (const b of r.beatRows) {
            const mark = b.verdict === 'on' ? 'OK' : b.verdict === 'early' ? 'EARLY' : b.verdict === 'late' ? 'LATE' : 'MISS';
            lines.push('  [' + mark + '] ' + b.label + '  ' + b.clock + '  target ' + b.target);
        }
        if (r.longestGrey30) {
            lines.push('  grey>90s candidate: ' + r.longestGrey30.id + ' unaffordable ' + r.longestGrey30.s + 's in first 30 min');
        }
        lines.push('  final: p' + r.final.pages + ' S' + r.final.sentences + ' q' + r.final.quills +
            ' ink ' + r.final.ink + ' lex ' + r.final.lexicons + ' ' + r.final.season);
    }
    console.log(lines.join('\n'));
    console.log('\nWrote ' + jsonPath);
}

main();
