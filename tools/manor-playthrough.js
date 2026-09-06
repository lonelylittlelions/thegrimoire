/**
 * Headless Manor (Horizon III) playthrough against the live engine.
 * Seeds a v1 shutters save (Cellars not pre-lit) and walks the house.
 *
 * Usage: node tools/manor-playthrough.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const TICK_MS = 200;
const DT = TICK_MS / 1000;
const MAX_MS = 45 * 60 * 1000;
const ARRIVED_MS = 3.5 * 60 * 60 * 1000;

const BIBLE = [
    { id: 'light_cellars', label: 'First Light (Cellars)', lo: 0, hi: 3 },
    { id: 'leave_render', label: 'Leave a Render cooking', lo: 0, hi: 6 },
    { id: 'return_render', label: 'Return to that Render', lo: 0, hi: 8 },
    { id: 'first_vellum', label: 'First vellum', lo: 0, hi: 10 },
    { id: 'light_library', label: 'Light the Library', lo: 0, hi: 15 },
    { id: 'first_folio', label: 'First folio', lo: 0, hi: 20 },
    { id: 'light_vault', label: 'Light the Vault', lo: 0, hi: 25 },
    { id: 'first_silver', label: 'First silver', lo: 0, hi: 30 },
    { id: 'packet', label: 'Packet while house unfinished', lo: 0, hi: 35 },
    { id: 'first_scrap', label: 'Scrap on a return walk', lo: 0, hi: 20 },
    { id: 'light_glasshouse', label: 'Light the Glasshouse', lo: 0, hi: 40 },
    { id: 'overnight', label: 'Overnight: batch done, no auto-start', lo: 0, hi: 45 }
];

const POLICIES = [
    {
        id: 'patrol',
        name: 'Patrol sitter',
        desc: 'Starts a batch, walks away, comes back. Sends the house quill. Patrols for scraps. Packets before the last Light.',
        leaveBatches: true,
        sendQuill: true,
        patrolScraps: true
    },
    {
        id: 'camp',
        name: 'Camp sitter',
        desc: 'Stands in the room until the bar finishes. No house quill. Less walking, fewer scraps.',
        leaveBatches: false,
        sendQuill: false,
        patrolScraps: false
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
        console, Math, JSON, Object, Array, String, Number, Boolean, Infinity, NaN,
        parseInt, parseFloat, isFinite, isNaN, undefined,
        encodeURIComponent, decodeURIComponent, unescape, escape,
        btoa: (s) => Buffer.from(s, 'utf8').toString('base64'),
        atob: (s) => Buffer.from(s, 'base64').toString('utf8'),
        performance: { now: () => clock.ms },
        Date: Object.assign(function FakeDate(...args) {
            if (!(this instanceof FakeDate)) return new Date(clock.ms);
            if (args.length === 0) return new Date(clock.ms);
            return new Date(...args);
        }, { now: () => clock.ms, parse: Date.parse, UTC: Date.UTC }),
        localStorage: { _d: {}, getItem(k) { return this._d[k] == null ? null : this._d[k]; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } },
        sessionStorage: { _d: {}, getItem(k) { return this._d[k] == null ? null : this._d[k]; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } },
        document: { addEventListener() {}, hidden: false },
        location: { reload() {} },
        window: null,
        Grimoire: {}
    };
    sandbox.window = sandbox;
    sandbox.global = sandbox;
    sandbox.Date.now = () => clock.ms;
    const files = [
        'js/content.js', 'js/systems/economics.js', 'js/state.js', 'js/systems/candle.js',
        'js/systems/pages.js', 'js/systems/jobs.js', 'js/systems/estate.js',
        'js/systems/projects.js', 'js/systems/bleed.js', 'js/engine.js'
    ];
    const ctx = vm.createContext(sandbox);
    for (const f of files) {
        vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
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

function nextStep(E, from, dest) {
    if (from === dest) return null;
    const q = [from];
    const prev = {};
    prev[from] = null;
    while (q.length) {
        const cur = q.shift();
        const n = E.neighbors[cur];
        if (!n) continue;
        for (const dir of Object.keys(n)) {
            const to = n[dir];
            if (prev[to] !== undefined) continue;
            prev[to] = cur;
            if (to === dest) {
                let walk = to;
                while (prev[walk] !== from) walk = prev[walk];
                return walk;
            }
            q.push(to);
        }
    }
    return null;
}

function seedShutters(G, s) {
    const ids = ['name_flame', 'catalog_page', 'bolt_and_key', 'attend_lesson', 'collation', 'open_shutters'];
    for (const id of ids) G.addUnlock(s, id);
    s.meta.deskRevealed = true;
    s.meta.candleLit = true;
    s.meta.wickSeen = true;
    s.meta.shuttersOpen = true;
    s.meta.totalInsightEarned = 400;
    s.meta.playMs = ARRIVED_MS;
    s.meta.sentencesCompleted = 6;
    s.page.pagesFinished = 27;
    s.resources.oil = 200;
    s.resources.tallow = 16;
    s.resources.ink = 20;
    s.resources.passages = 12;
    s.resources.lexicons = 0;
    s.resources.matches = 5;
    s.generators.quills = 6;
    s.generators.nibs = 3;
    s.purchased.catch_drip = 1;
    s.purchased.steel_nib = 3;
    s.meta.tallowDripBonus = 0.02;
    s.generators.assignments = { transcribe: 4, copy: 1, attend: 1, ward: 0 };
    G.estate.ensure(s);
    s.meta.estateRoom = 'hall';
    s.meta.dispatchedQuill = null;
    s.meta.activeTab = 'estate';
    G.jobs.syncNewQuills(s);
}

function manageCandle(G, s, now) {
    const drowned = !s.meta.candleLit || s.resources.oil <= 0;
    const free = s.meta.trimsDone < 2;
    const canTrim = free || s.resources.tallow >= G.candle.TRIM_COST;
    if (drowned) {
        if (s.meta.emberUntil && now < s.meta.emberUntil) return;
        if (canTrim) { G.candle.trim(s); return; }
        if (s.resources.matches >= 1 && s.resources.insight >= 3) { G.candle.strikeMatch(s); return; }
        G.candle.sitInDark(s);
        return;
    }
    const cap = G.candle.oilCap(s);
    const pct = cap > 0 ? s.resources.oil / cap : 0;
    if (pct < 0.32 && canTrim) G.candle.trim(s);
    if (G.hasUnlock(s, 'catalog_page') && s.resources.tallow >= 5 && s.resources.ink < 20) {
        const reserve = 16;
        if (s.resources.tallow >= 5 + reserve) G.candle.distill(s);
    }
}

function runPolicy(policy, seed) {
    const clock = { ms: 1_700_000_000_000 };
    const rng = mulberry32(seed);
    const ctx = loadGame(clock);
    const G = ctx.Grimoire;
    ctx.Math.random = rng;
    ctx.Date.now = () => clock.ms;

    G.state = G.defaultState();
    G.pages.generate(G.state);
    const s = G.state;
    seedShutters(G, s);

    const E = G.estate;
    const P = G.projects;
    const manor0 = s.meta.playMs;
    const rel = () => s.meta.playMs - manor0;

    const beats = {};
    const mark = (id) => { if (beats[id] == null) beats[id] = rel(); };

    const checks = {
        noEstateJobRows: true,
        leftRenderCooking: false,
        returnedToRender: false,
        quillSlowedStudy: null,
        packetWhileUnfinished: false,
        overnightDoneNoAutostart: false,
        scrapTaken: 0
    };

    const purchases = [];
    const scrapLog = [];
    let phase = 0;
    let dest = 'hall';
    let leftRender = false;
    let returnedRender = false;
    let dispatchedForTest = false;
    let transcribeBefore = null;
    let overnightTried = false;
    let scrapPatrolUntil = null;
    let tick = 0;
    const maxTicks = Math.floor(MAX_MS / TICK_MS);

    function buy(id) {
        if (!P.buy(s, id)) return false;
        purchases.push({ id, clock: fmtClock(rel()) });
        if (id === 'light_cellars') mark('light_cellars');
        if (id === 'light_library') mark('light_library');
        if (id === 'light_vault') mark('light_vault');
        if (id === 'light_glasshouse') mark('light_glasshouse');
        if (id === 'packet_gate') {
            mark('packet');
            checks.packetWhileUnfinished = E.houseIdleUnfinished(s) || !G.hasUnlock(s, 'light_glasshouse');
        }
        return true;
    }

    function shop() {
        if (P.canLexicon(s) && (s.resources.lexicons || 0) < 1 && (s.meta.silverLogged || s.meta.folioLogged)) {
            P.bindLexicon(s);
        }
        buy('light_cellars');
        if (s.meta.vellumLogged) buy('light_library');
        if (s.resources.ink >= 28) buy('light_vault');
        if (s.meta.packetLeft) buy('light_glasshouse');
        buy('mechanical_cataloger');
        if (s.meta.silverLogged && (E.houseIdleUnfinished(s) || !G.hasUnlock(s, 'light_glasshouse'))) {
            buy('packet_gate');
        }
    }

    function stepToward(target) {
        const here = E.current(s);
        if (here === target) return true;
        const step = nextStep(E, here, target);
        if (step) E.walk(s, step);
        return E.current(s) === target;
    }

    function think() {
        shop();
        if (E.hasFind(s, E.current(s))) {
            const id = s.meta.estateFind && s.meta.estateFind.id;
            if (E.takeFind(s)) {
                checks.scrapTaken += 1;
                scrapLog.push({ id, room: E.current(s), clock: fmtClock(rel()) });
                mark('first_scrap');
            }
        }

        const here = E.current(s);
        const renderOn = !!(s.meta.estateBatches.cellars && s.meta.estateBatches.cellars.active);
        const collateOn = !!(s.meta.estateBatches.library && s.meta.estateBatches.library.active);
        const bathOn = !!(s.meta.estateBatches.vault && s.meta.estateBatches.vault.active);

        if (phase === 0) {
            dest = G.hasUnlock(s, 'light_cellars') ? 'cellars' : 'hall';
            if (here === 'cellars' && E.canStart(s, 'cellars')) {
                E.startBatch(s, 'cellars');
                phase = policy.leaveBatches ? 1 : 3;
            }
        } else if (phase === 1) {
            dest = 'hall';
            if (here === 'hall' && renderOn) {
                leftRender = true;
                checks.leftRenderCooking = true;
                mark('leave_render');
                if (policy.sendQuill && !dispatchedForTest && E.canDispatch(s, 'cellars')) {
                    transcribeBefore = G.jobs.rates(s).insight;
                    E.dispatch(s, 'cellars');
                    const after = G.jobs.rates(s).insight;
                    checks.quillSlowedStudy = transcribeBefore > 0 && after < transcribeBefore;
                    dispatchedForTest = true;
                }
                phase = 2;
            }
        } else if (phase === 2) {
            dest = 'cellars';
            if (here === 'cellars') {
                returnedRender = true;
                checks.returnedToRender = true;
                mark('return_render');
                phase = 3;
            }
        } else if (phase === 3) {
            dest = policy.leaveBatches && renderOn ? 'hall' : 'cellars';
            if (s.meta.vellumLogged) {
                mark('first_vellum');
                if (s.meta.dispatchedQuill) E.recall(s);
                phase = 4;
            }
        } else if (phase === 4) {
            dest = G.hasUnlock(s, 'light_library') ? 'library' : 'hall';
            if (here === 'library' && E.canStart(s, 'library')) {
                E.startBatch(s, 'library');
                phase = 5;
            }
        } else if (phase === 5) {
            const cataloger = G.hasUnlock(s, 'mechanical_cataloger');
            dest = (!policy.leaveBatches || !cataloger) ? 'library' : 'hall';
            if (s.meta.folioLogged) {
                mark('first_folio');
                phase = 6;
            }
        } else if (phase === 6) {
            dest = G.hasUnlock(s, 'light_vault') ? 'vault' : 'hall';
            if (here === 'vault' && E.canStart(s, 'vault')) {
                E.startBatch(s, 'vault');
                phase = policy.leaveBatches ? 7 : 8;
            }
        } else if (phase === 7) {
            dest = 'hall';
            if (here === 'hall' && bathOn) phase = 8;
        } else if (phase === 8) {
            dest = bathOn && policy.leaveBatches ? 'hall' : (G.hasUnlock(s, 'light_vault') ? 'vault' : 'hall');
            if (s.meta.silverLogged) {
                mark('first_silver');
                phase = 9;
            }
        } else if (phase === 9) {
            dest = 'gate';
            if (s.meta.packetLeft) {
                phase = 10;
                scrapPatrolUntil = s.meta.playMs + 4 * 60 * 1000;
            } else if (here === 'gate') {
                dest = 'hall';
            }
        } else if (phase === 10) {
            if (policy.patrolScraps && scrapPatrolUntil && s.meta.playMs < scrapPatrolUntil) {
                const loop = ['hall', 'library', 'hall', 'vault', 'hall', 'cellars', 'gate', 'cellars', 'hall', 'glasshouse'];
                const i = Math.floor((s.meta.playMs / 4000) % loop.length);
                dest = G.hasUnlock(s, 'light_glasshouse') || loop[i] !== 'glasshouse' ? loop[i] : 'hall';
            } else {
                phase = 11;
            }
        } else if (phase === 11) {
            dest = 'cellars';
            if (here === 'cellars' && E.canStart(s, 'cellars')) {
                E.startBatch(s, 'cellars');
                if (policy.leaveBatches) dest = 'hall';
                phase = 12;
            } else if (here === 'cellars' && !E.canStart(s, 'cellars') && !renderOn) {
                dest = 'hall';
            }
        } else if (phase === 12) {
            dest = policy.leaveBatches ? 'hall' : 'cellars';
            if (!overnightTried && (policy.leaveBatches ? here === 'hall' : here === 'cellars')) {
                overnightTried = true;
                const active = !!(s.meta.estateBatches.cellars && s.meta.estateBatches.cellars.active);
                G.engine.catchUp(s, 8 * 3600);
                const done = !(s.meta.estateBatches.cellars && s.meta.estateBatches.cellars.active);
                const noAuto = !s.meta.estateBatches.cellars.active;
                checks.overnightDoneNoAutostart = active && done && noAuto;
                if (checks.overnightDoneNoAutostart) mark('overnight');
                phase = 13;
            }
        }

        stepToward(dest);
    }

    for (tick = 0; tick < maxTicks; tick++) {
        clock.ms += TICK_MS;
        s.meta.playMs += TICK_MS;
        manageCandle(G, s, clock.ms);
        if (tick % 5 === 0) think();
        G.engine.tick.call(G.engine, DT);

        if (s.resources.vellum >= 1) mark('first_vellum');
        if (s.resources.folios >= 1) mark('first_folio');
        if (s.resources.silver >= 1) mark('first_silver');
        if (s.meta.estateFind && beats.first_scrap == null) mark('first_scrap');
        if (s.meta.packetLeft) mark('packet');

        if (phase >= 13 && (checks.overnightDoneNoAutostart || tick > maxTicks - 10)) break;
    }

    const beatRows = BIBLE.map((b) => {
        const ms = beats[b.id];
        return {
            id: b.id,
            label: b.label,
            target: b.lo + '–' + b.hi + ' min',
            lo: b.lo,
            hi: b.hi,
            ms: ms == null ? null : ms,
            clock: fmtClock(ms),
            minutes: ms == null ? null : Math.round(ms / 6000) / 10,
            verdict: verdict(ms, b.lo, b.hi)
        };
    });

    return {
        policy: policy.id,
        name: policy.name,
        desc: policy.desc,
        seed,
        endedClock: fmtClock(rel()),
        phase,
        beats,
        beatRows,
        checks,
        purchases,
        scrapLog,
        final: {
            room: E.current(s),
            tallow: Math.floor(s.resources.tallow),
            ink: Math.floor(s.resources.ink),
            vellum: s.resources.vellum,
            folios: s.resources.folios,
            extracts: Math.floor(s.resources.extracts),
            silver: s.resources.silver,
            lexicons: s.resources.lexicons,
            quills: s.generators.quills,
            dispatched: s.meta.dispatchedQuill,
            packet: !!s.meta.packetLeft,
            lit: E.WORK.filter((id) => E.isLit(s, id)),
            buff: E.buffLine(s) || null,
            find: s.meta.estateFind
        }
    };
}

function main() {
    const seed = 20260905;
    const runs = POLICIES.map((p) => runPolicy(p, seed));
    const out = {
        generatedAt: new Date().toISOString(),
        engine: 'live js/* via vm, 200 ms ticks, v1 shutters seed, 45 min cap',
        seed,
        arrivedAfter: '3.5 h sitting (playMs already elapsed; clocks below are manor-relative)',
        bible: BIBLE,
        notes: [
            'Starts from a shutters save, Cellars unlit — not Jump Manor.',
            'Estate has no +/− job rows (structural).',
            'Packet is bought before Glasshouse Light so the house is still unfinished.',
            'Overnight is engine.catchUp(8h) after a second Render is started.'
        ],
        runs
    };
    const jsonPath = path.join(ROOT, 'tools', 'manor-results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(out, null, 2));
    const lines = [];
    lines.push('Grimoire manor playthrough  seed=' + seed);
    lines.push('seeded as v1 shutters save (Cellars dark). clocks are minutes after opening the grounds.');
    for (const r of runs) {
        lines.push('');
        lines.push('== ' + r.name + '  ended ' + r.endedClock + '  phase=' + r.phase + ' ==');
        lines.push('  ' + r.desc);
        for (const b of r.beatRows) {
            const mark = b.verdict === 'on' ? 'OK' : b.verdict === 'early' ? 'EARLY' : b.verdict === 'late' ? 'LATE' : 'MISS';
            lines.push('  [' + mark + '] ' + b.label + '  ' + b.clock + '  target ' + b.target);
        }
        const c = r.checks;
        lines.push('  checks: leave=' + c.leftRenderCooking + ' return=' + c.returnedToRender +
            ' quillSlowsStudy=' + c.quillSlowedStudy + ' packetUnfinished=' + c.packetWhileUnfinished +
            ' overnight=' + c.overnightDoneNoAutostart + ' scraps=' + c.scrapTaken);
        lines.push('  final: ' + r.final.room + ' vellum ' + r.final.vellum + ' folios ' + r.final.folios +
            ' silver ' + r.final.silver + ' extracts ' + r.final.extracts + ' packet ' + r.final.packet +
            ' lit [' + r.final.lit.join(',') + ']');
        if (r.scrapLog.length) {
            lines.push('  scraps: ' + r.scrapLog.map((x) => x.id + '@' + x.room + ' ' + x.clock).join('; '));
        }
    }
    console.log(lines.join('\n'));
    console.log('\nWrote ' + jsonPath);
}

main();
