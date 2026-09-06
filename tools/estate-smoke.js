'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const clock = { ms: 1_700_000_000_000 };

function loadGame() {
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
    return ctx.Grimoire;
}

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

const G = loadGame();
const s = G.defaultState();
G.pages.generate(s);
s.meta.deskRevealed = true;
s.meta.candleLit = true;
s.meta.shuttersOpen = true;
s.resources.oil = 200;
s.resources.tallow = 40;
s.resources.ink = 40;
s.generators.quills = 2;
s.generators.assignments.transcribe = 2;
G.estate.ensure(s);

assert(G.estate.flairLine(s, 'hall').length === 12, 'flair is 12');
assert(G.estate.interiorArt(s, 'hall').indexOf('@') !== -1, 'hall vignette');
assert(G.estate.current(s) === 'hall', 'start in hall');
assert(G.estate.walk(s, 'cellars'), 'walk south to cellars');
assert(G.estate.current(s) === 'cellars', 'in cellars');
assert(!G.estate.walk(s, 'vault'), 'cannot teleport to vault');
assert(G.estate.walk(s, 'hall'), 'back to hall');
assert(G.estate.walk(s, 'library'), 'explore west fog');
assert(s.meta.estateSeen.library, 'library discovered');

G.addUnlock(s, 'light_cellars');
G.estate.onLit(s, 'cellars');
G.estate.walk(s, 'cellars');
assert(G.estate.startBatch(s, 'cellars'), 'start render');
assert(s.resources.tallow === 32, 'spent 8 tallow');
G.estate.tick(s, 60);
assert(s.resources.vellum === 1, 'render completed in 60s');
assert(!s.meta.estateBatches.cellars.active, 'batch done, no auto-start');

assert(G.estate.dispatch(s, 'cellars'), 'dispatch quill');
assert(s.meta.dispatchedQuill === 'cellars', 'quill in cellars');
assert(G.jobs.totalAssigned(s) === 1, 'study lost a feather');
assert(!G.estate.dispatch(s, 'cellars'), 'no second dispatch');
G.estate.recall(s);
assert(s.generators.assignments.transcribe === 2, 'recall to transcribe');

G.addUnlock(s, 'light_library');
G.estate.onLit(s, 'library');
G.estate.walk(s, 'hall');
G.estate.walk(s, 'library');
assert(G.estate.startBatch(s, 'library'), 'start collate');
G.estate.walk(s, 'hall');
G.estate.tick(s, 90);
assert(s.resources.folios === 0, 'collation paused while away without cataloger/quill');
G.estate.walk(s, 'library');
G.estate.tick(s, 90);
assert(s.resources.folios === 1, 'collation finishes when present');

s.resources.ink = 40;
G.addUnlock(s, 'light_vault');
G.estate.onLit(s, 'vault');
G.estate.walk(s, 'hall');
G.estate.walk(s, 'vault');
assert(G.estate.startBatch(s, 'vault'), 'start bath');
G.estate.catchUp(s, 120);
assert(s.resources.silver === 1, 'offline catch-up finishes started bath');

s.meta.estateFind = null;
s.meta.estateBuff = null;
s.meta.estateFindCool = 0;
s.meta.playMs = 120000;
var oldRand = Math.random;
Math.random = function () { return 0; };
assert(G.estate.walk(s, 'hall'), 'to hall before find test');
s.meta.estateFind = null;
s.meta.estateFindCool = 0;
G.addUnlock(s, 'light_glasshouse');
G.estate.onLit(s, 'glasshouse');
s.meta.estateEntered.glasshouse = false;
assert(G.estate.walk(s, 'glasshouse'), 'first glasshouse');
assert(!s.meta.estateFind, 'first walk drops no scrap');
assert(G.estate.walk(s, 'hall'), 'leave glasshouse');
s.meta.estateFind = null;
s.meta.estateFindCool = 0;
assert(G.estate.walk(s, 'glasshouse'), 'return glasshouse');
assert(s.meta.estateFind && s.meta.estateFind.room === 'glasshouse', 'scrap waits on return');
assert(G.estate.takeFind(s), 'take scrap');
assert(s.meta.estateBuff && G.estate.buffMul(s, 'drip') > 1, 'drip buff');
G.estate.advanceBuff(s, 200);
assert(!s.meta.estateBuff, 'buff spent');
Math.random = oldRand;

s.meta.candleLit = true;
s.resources.oil = 200;
s.resources.tallow = 40;
s.resources.ink = 40;
s.meta.estateBuff = null;
s.meta.estateFind = null;
s.meta.estateRoom = 'cellars';
s.meta.estateBatches.cellars = { active: false, progress: 0, usedExtract: false, spoiled: false };
assert(G.estate.startBatch(s, 'cellars'), 'presence render start');
G.estate.tick(s, 10);
const pHere = s.meta.estateBatches.cellars.progress;
s.meta.estateBatches.cellars = { active: false, progress: 0, usedExtract: false, spoiled: false };
s.resources.tallow = 40;
s.meta.estateRoom = 'hall';
assert(G.estate.startBatch(s, 'cellars'), 'away render start');
G.estate.tick(s, 10);
const pAway = s.meta.estateBatches.cellars.progress;
assert(pHere > pAway, 'standing in cellars shortens a render');
s.meta.estateBatches.cellars = { active: false, progress: 0, usedExtract: false, spoiled: false };
s.resources.tallow = 40;

s.meta.season = 3;
assert(G.estate.seasonMul(s, 'cellars') === 1.5, 'solstice hides hurry');
s.meta.season = 1;
assert(G.estate.seasonMul(s, 'library') === 1.4, 'equinox collation easy');
assert(G.estate.seasonMul(s, 'vault') === 0.7, 'equinox bath slow');
s.meta.season = 0;

s.meta.estateRoom = 'cellars';
assert(G.estate.startBatch(s, 'cellars'), 'hide before drown');
assert(G.estate.startBatch(s, 'vault'), 'bath before drown');
G.candle.extinguish(s);
assert(G.estate.isSpoiled(s, 'cellars'), 'hide sours on drown');
assert(G.estate.isSpoiled(s, 'vault'), 'bath sours on drown');
assert(G.estate.progressRate(s, 'cellars') === 0, 'soured hide does not cook');
const tallow0 = s.resources.tallow;
assert(G.estate.salvageBatch(s, 'cellars'), 'salvage hide');
assert(s.resources.tallow === tallow0 + 3, 'salvage returns tallow');
assert(!s.meta.estateBatches.cellars.active, 'salvage clears hide');
s.meta.estateRoom = 'vault';
assert(G.estate.dumpBatch(s, 'vault'), 'dump bath');
assert(!s.meta.estateBatches.vault.active, 'dump clears bath');

s.meta.candleLit = true;
s.resources.oil = 200;
s.meta.estateSeen.vault = false;
s.unlocks = s.unlocks.filter(function (id) { return id !== 'light_vault' && id !== 'hall_lantern'; });
assert(!G.estate.isLit(s, 'vault'), 'vault unlit for lantern');
assert(!G.estate.isSeen(s, 'vault'), 'vault unnamed without lantern');
G.addUnlock(s, 'hall_lantern');
assert(G.estate.isSeen(s, 'vault'), 'hall lantern names the vault');
assert(!G.estate.isLit(s, 'vault'), 'named vault still unlit');
G.addUnlock(s, 'light_vault');
G.estate.onLit(s, 'vault');

s.meta.estateRoom = 'hall';
s.meta.estateListenCool = 0;
s.meta.playMs = 200000;
assert(G.estate.canListen(s), 'hall can listen');
assert(G.estate.listen(s), 'listen');
assert(!G.estate.canListen(s), 'listen cools');
s.meta.playMs += 40000;
assert(G.estate.canListen(s), 'listen ready again');

var keyRand = Math.random;
Math.random = function () { return 0; };
s.meta.estateKey = false;
s.meta.estateFind = null;
s.meta.estateFindCool = 0;
s.meta.estateVisits.hall = 2;
s.meta.estateEntered.hall = true;
s.meta.estateRoom = 'cellars';
assert(G.estate.walk(s, 'hall'), 'return hall for key');
assert(s.meta.estateFind && s.meta.estateFind.id === 'house_key', 'key on 3rd+ visit');
assert(G.estate.takeFind(s), 'take key');
assert(s.meta.estateKey, 'key kept');
Math.random = keyRand;

s.meta.packetLeft = true;
assert(G.estate.canOpenDrawer(s), 'drawer wants key and empty drive');
assert(G.estate.openDrawer(s), 'open drawer');
assert(s.meta.drawerOpen, 'drawer open');
assert(!G.estate.canOpenDrawer(s), 'drawer stays open');

s.resources.folios = 5;
s.resources.lexicons = 2;
assert(G.projects.buy(s, 'file_folios'), 'file folios');
assert(G.estate.houseMul(s) > 1, 'filed house is faster');
assert(G.projects.buy(s, 'packet_again'), 'second packet');
assert(s.meta.packetTwice, 'packet twice');
s.resources.folios = 1;

s.meta.candleLit = true;
s.resources.oil = 40;
s.resources.tallow = 40;
s.meta.estateRoom = 'cellars';
s.meta.estateBatches.cellars = { active: false, progress: 0, usedExtract: false, spoiled: false };
const vellumCatch = s.resources.vellum;
assert(G.estate.startBatch(s, 'cellars'), 'hide before long catch-up');
G.engine.catchUp(s, 8 * 3600);
assert(!s.meta.estateBatches.cellars.active, 'catch-up finishes hide while oil lasts');
assert(s.resources.vellum === vellumCatch + 1, 'catch-up grants vellum');
assert(!s.meta.estateBatches.cellars.spoiled, 'finished hide is not soured');

s.meta.candleLit = false;
s.resources.oil = 0;
const vellumBefore = s.resources.vellum;
G.estate.startBatch(s, 'cellars');
assert(s.resources.vellum === vellumBefore, 'drowned house does not start work');

const payload = G.exportPayload(s);
const loaded = G.migrate(G.decodeSave(payload).state);
assert(loaded.meta.saveVersion === 2, 'migrated save is v2');
assert(loaded.resources.folios === 1, 'folios persist');
assert(loaded.meta.estateKey, 'key persists');
assert(loaded.meta.drawerOpen, 'drawer persists');
assert(loaded.meta.packetTwice, 'second packet persists');

console.log('estate smoke: ok');
