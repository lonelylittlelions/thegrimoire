var Grimoire = window.Grimoire || (window.Grimoire = {});

Grimoire.SAVE_KEY = 'grimoire.v1';
Grimoire.SAVE_BAK = 'grimoire.v1.bak';
Grimoire.WIPE_FLAG = 'grimoire.wipe';
Grimoire.SAVE_VERSION = 2;
Grimoire.wiping = false;

Grimoire.dirty = {
    resources: true,
    page: true,
    candle: true,
    log: true,
    projects: true,
    jobs: true,
    layout: true,
    buttons: true,
    tabs: true,
    settings: true,
    vignette: true,
    subhead: true,
    codex: true,
    estate: true,
    study: true
};

Grimoire.mark = function () {
    for (var i = 0; i < arguments.length; i++) {
        Grimoire.dirty[arguments[i]] = true;
    }
};

Grimoire.markAll = function () {
    var d = Grimoire.dirty;
    for (var k in d) {
        if (Object.prototype.hasOwnProperty.call(d, k)) d[k] = true;
    }
};

Grimoire.hasUnlock = function (s, id) {
    return s && s.unlocks && s.unlocks.indexOf(id) !== -1;
};

Grimoire.defaultState = function () {
    return {
        resources: {
            insight: 0,
            tallow: 0,
            ink: 0,
            oil: 180,
            passages: 0,
            lexicons: 0,
            matches: 0,
            soot: 0,
            vellum: 0,
            silver: 0,
            extracts: 0,
            obituaries: 0,
            cinders: 0,
            folios: 0
        },
        generators: {
            quills: 0,
            nibs: 0,
            prisms: 0,
            boards: 0,
            shelves: 0,
            lamps: 0,
            assignments: { transcribe: 0, copy: 0, attend: 0, ward: 0 }
        },
        page: {
            runes: [],
            pagesFinished: 0,
            knownGraphemes: '',
            stableLettersLifetime: 0,
            runesFinishedLifetime: 0,
            attendAcc: 0,
            sentenceCharIndex: 0,
            turningUntil: 0,
            runesPerPage: 24
        },
        unlocks: [],
        purchased: {},
        log: [],
        settings: {
            reduceMotion: false,
            disableBleedFx: false,
            disableFlicker: false,
            wickCrackle: false,
            showExact: false
        },
        meta: {
            lastSaved: Date.now(),
            bleedLevel: 0,
            cognitiveAperture: 1,
            season: 0,
            seasonTick: 0,
            matchesSeen: false,
            resetsCompiled: 0,
            saveVersion: Grimoire.SAVE_VERSION,
            totalInsightEarned: 0,
            candleLit: false,
            darknessSeen: false,
            pendingChoice: null,
            emberUntil: 0,
            playMs: 0,
            lastTickAt: Date.now(),
            activeTab: 'desk',
            distillMutated: false,
            eventAt: 0,
            eventsFired: {},
            echoAt: 0,
            selfStableAt: 0,
            doubtUntil: 0,
            doubtShown: false,
            doubtClicked: false,
            offlineBleedDone: false,
            checksumWarn: false,
            sentencesCompleted: 0,
            trimsDone: 0,
            pressOnceLeft: 0,
            extraReveals: 0,
            stabilizeDenom: 4,
            tallowDripBonus: 0,
            oilDecayMul: 1,
            vignetteSoft: false,
            oilEmptyLogged: false,
            roomLine15: false,
            roomLine45: false,
            firstStable: false,
            settingsUnlocked: false,
            shuttersOpen: false,
            silenceTease: false,
            lastAffordable: {},
            bleedFlags: {},
            lastLogRepeat: false,
            jitterUntil: 0,
            labelFlickerUntil: 0,
            flameSkip: false,
            corruptRaw: '',
            lastInsightCatchup: 0,
            deskRevealed: false,
            wickSeen: false,
            snuffs: 0,
            tallowLogged: false,
            inkLogged: false,
            estateVisited: false,
            estateRoom: null,
            dispatchedQuill: null,
            estateSeen: { hall: true, gate: true, cellars: true },
            estateBatches: {
                cellars: { active: false, progress: 0, usedExtract: false },
                library: { active: false, progress: 0, usedExtract: false },
                vault: { active: false, progress: 0, usedExtract: false },
                glasshouse: { active: false, progress: 0, usedExtract: false }
            },
            packetLeft: false,
            vellumLogged: false,
            extractsLogged: false,
            silverLogged: false,
            folioLogged: false,
            estateFind: null,
            estateBuff: null,
            estateFindCool: 0,
            estateEntered: {}
        }
    };
};

Grimoire.checksum = function (str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
};

Grimoire.serializable = function (s) {
    return {
        resources: s.resources,
        generators: s.generators,
        page: {
            runes: s.page.runes,
            pagesFinished: s.page.pagesFinished,
            knownGraphemes: s.page.knownGraphemes,
            stableLettersLifetime: s.page.stableLettersLifetime,
            runesFinishedLifetime: s.page.runesFinishedLifetime,
            attendAcc: s.page.attendAcc,
            sentenceCharIndex: s.page.sentenceCharIndex,
            runesPerPage: s.page.runesPerPage
        },
        unlocks: s.unlocks,
        purchased: s.purchased,
        log: s.log.slice(-40),
        settings: s.settings,
        meta: {
            lastSaved: s.meta.lastSaved,
            bleedLevel: s.meta.bleedLevel,
            cognitiveAperture: s.meta.cognitiveAperture,
            season: s.meta.season,
            seasonTick: s.meta.seasonTick,
            matchesSeen: s.meta.matchesSeen,
            resetsCompiled: s.meta.resetsCompiled,
            saveVersion: Grimoire.SAVE_VERSION,
            totalInsightEarned: s.meta.totalInsightEarned,
            candleLit: s.meta.candleLit,
            darknessSeen: s.meta.darknessSeen,
            pendingChoice: s.meta.pendingChoice,
            emberUntil: s.meta.emberUntil,
            playMs: s.meta.playMs,
            lastTickAt: s.meta.lastTickAt,
            activeTab: s.meta.activeTab,
            distillMutated: s.meta.distillMutated,
            eventAt: s.meta.eventAt,
            eventsFired: s.meta.eventsFired,
            echoAt: s.meta.echoAt,
            selfStableAt: s.meta.selfStableAt,
            doubtUntil: s.meta.doubtUntil,
            doubtShown: s.meta.doubtShown,
            doubtClicked: s.meta.doubtClicked,
            offlineBleedDone: s.meta.offlineBleedDone,
            sentencesCompleted: s.meta.sentencesCompleted,
            trimsDone: s.meta.trimsDone,
            pressOnceLeft: s.meta.pressOnceLeft,
            extraReveals: s.meta.extraReveals,
            stabilizeDenom: s.meta.stabilizeDenom,
            tallowDripBonus: s.meta.tallowDripBonus,
            oilDecayMul: s.meta.oilDecayMul,
            vignetteSoft: s.meta.vignetteSoft,
            oilEmptyLogged: s.meta.oilEmptyLogged,
            roomLine15: s.meta.roomLine15,
            roomLine45: s.meta.roomLine45,
            firstStable: s.meta.firstStable,
            settingsUnlocked: s.meta.settingsUnlocked,
            shuttersOpen: s.meta.shuttersOpen,
            silenceTease: s.meta.silenceTease,
            lastAffordable: s.meta.lastAffordable,
            bleedFlags: s.meta.bleedFlags,
            lastLogRepeat: s.meta.lastLogRepeat,
            deskRevealed: s.meta.deskRevealed,
            wickSeen: s.meta.wickSeen,
            snuffs: s.meta.snuffs || 0,
            tallowLogged: !!s.meta.tallowLogged,
            inkLogged: !!s.meta.inkLogged,
            estateVisited: !!s.meta.estateVisited,
            estateRoom: s.meta.estateRoom || null,
            dispatchedQuill: s.meta.dispatchedQuill || null,
            estateSeen: s.meta.estateSeen || { hall: true, gate: true, cellars: true },
            estateBatches: s.meta.estateBatches || {
                cellars: { active: false, progress: 0, usedExtract: false },
                library: { active: false, progress: 0, usedExtract: false },
                vault: { active: false, progress: 0, usedExtract: false },
                glasshouse: { active: false, progress: 0, usedExtract: false }
            },
            packetLeft: !!s.meta.packetLeft,
            vellumLogged: !!s.meta.vellumLogged,
            extractsLogged: !!s.meta.extractsLogged,
            silverLogged: !!s.meta.silverLogged,
            folioLogged: !!s.meta.folioLogged,
            estateFind: s.meta.estateFind || null,
            estateBuff: s.meta.estateBuff || null,
            estateFindCool: s.meta.estateFindCool || 0,
            estateEntered: s.meta.estateEntered || {}
        }
    };
};

Grimoire.migrate = function (raw) {
    if (!raw || typeof raw !== 'object') return Grimoire.defaultState();
    var base = Grimoire.defaultState();
    var version = (raw.meta && raw.meta.saveVersion) || 0;
    if (version > Grimoire.SAVE_VERSION) {
        return raw;
    }
    function merge(target, src) {
        if (!src || typeof src !== 'object') return target;
        for (var k in target) {
            if (!Object.prototype.hasOwnProperty.call(target, k)) continue;
            if (src[k] !== undefined && src[k] !== null && typeof target[k] === 'object' && !Array.isArray(target[k])) {
                merge(target[k], src[k]);
            } else if (src[k] !== undefined) {
                target[k] = src[k];
            }
        }
        return target;
    }
    merge(base, raw);
    base.meta.saveVersion = Grimoire.SAVE_VERSION;
    if (raw.meta && raw.meta.deskRevealed === undefined) {
        base.meta.deskRevealed = !!(base.meta.totalInsightEarned > 0 ||
            base.meta.playMs > 2000 ||
            (base.unlocks && base.unlocks.length));
        if (base.meta.deskRevealed && base.resources.oil > 0) base.meta.candleLit = true;
    }
    if (!base.meta.snuffs && base.meta.darknessSeen) base.meta.snuffs = 1;
    if (base.resources.tallow >= 1) base.meta.tallowLogged = true;
    if (base.resources.ink >= 1) base.meta.inkLogged = true;
    if (base.resources.folios == null) base.resources.folios = 0;
    if (Grimoire.estate && Grimoire.estate.ensure) Grimoire.estate.ensure(base);
    if (!base.page.runes || !base.page.runes.length) {
        Grimoire.pages.generate(base);
    }
    return base;
};

Grimoire.exportPayload = function (s) {
    var body = Grimoire.serializable(s);
    var json = JSON.stringify(body);
    var wrapped = { body: body, checksum: Grimoire.checksum(json), v: Grimoire.SAVE_VERSION };
    return btoa(unescape(encodeURIComponent(JSON.stringify(wrapped))));
};

Grimoire.saveToStorage = function (s, opts) {
    if (Grimoire.wiping || !s) return false;
    opts = opts || {};
    s.meta.lastSaved = Date.now();
    s.meta.lastTickAt = Date.now();
    var payload = Grimoire.exportPayload(s);
    try {
        var existing = localStorage.getItem(Grimoire.SAVE_KEY);
        if (existing && !opts.fromCorrupt) {
            localStorage.setItem(Grimoire.SAVE_BAK, existing);
        }
        localStorage.setItem(Grimoire.SAVE_KEY, payload);
        if (!s.meta.settingsUnlocked && s.meta.playMs >= 90000) {
            s.meta.settingsUnlocked = true;
            Grimoire.mark('layout', 'settings');
        }
        return true;
    } catch (err) {
        return false;
    }
};

Grimoire.decodeSave = function (text) {
    var json;
    try {
        json = decodeURIComponent(escape(atob(String(text).replace(/\s/g, ''))));
    } catch (e1) {
        try {
            json = String(text);
        } catch (e2) {
            throw new Error('unreadable');
        }
    }
    var wrapped = JSON.parse(json);
    if (wrapped && wrapped.body) {
        var recomputed = Grimoire.checksum(JSON.stringify(wrapped.body));
        var mismatch = wrapped.checksum && wrapped.checksum !== recomputed;
        return { state: wrapped.body, mismatch: mismatch, raw: text };
    }
    return { state: wrapped, mismatch: false, raw: text };
};

Grimoire.loadFromStorage = function () {
    var forceNew = false;
    try {
        forceNew = sessionStorage.getItem(Grimoire.WIPE_FLAG) === '1';
        if (forceNew) sessionStorage.removeItem(Grimoire.WIPE_FLAG);
    } catch (errFlag) { /* ignore */ }
    if (forceNew) {
        Grimoire.wipeSave();
        var fresh = Grimoire.defaultState();
        Grimoire.pages.generate(fresh);
        fresh.meta.checksumWarn = false;
        fresh.meta.corruptRaw = '';
        return fresh;
    }
    var warn = false;
    var corruptRaw = '';
    var loaded = null;
    try {
        var raw = localStorage.getItem(Grimoire.SAVE_KEY);
        if (raw) {
            var decoded = Grimoire.decodeSave(raw);
            if (decoded.mismatch) {
                warn = true;
                corruptRaw = raw;
                var bak = localStorage.getItem(Grimoire.SAVE_BAK);
                if (bak) {
                    try {
                        loaded = Grimoire.decodeSave(bak).state;
                    } catch (eBak) {
                        loaded = decoded.state;
                    }
                } else {
                    loaded = decoded.state;
                }
            } else {
                loaded = decoded.state;
            }
        }
    } catch (err) {
        warn = true;
        try {
            var bak2 = localStorage.getItem(Grimoire.SAVE_BAK);
            if (bak2) loaded = Grimoire.decodeSave(bak2).state;
        } catch (e3) {
            loaded = null;
        }
    }
    var s = Grimoire.migrate(loaded || Grimoire.defaultState());
    if (!loaded) {
        Grimoire.pages.generate(s);
    }
    s.meta.checksumWarn = warn;
    s.meta.corruptRaw = corruptRaw;
    return s;
};

Grimoire.importSave = function (text) {
    var decoded = Grimoire.decodeSave(text);
    var s = Grimoire.migrate(decoded.state);
    if (decoded.mismatch) {
        s.meta.checksumWarn = true;
        s.meta.corruptRaw = decoded.raw;
    }
    if (!s.page.runes || !s.page.runes.length) {
        Grimoire.pages.generate(s);
    }
    return s;
};

Grimoire.wipeSave = function () {
    try {
        localStorage.removeItem(Grimoire.SAVE_KEY);
        localStorage.removeItem(Grimoire.SAVE_BAK);
    } catch (err) { /* ignore */ }
};

Grimoire.restartRun = function () {
    Grimoire.wiping = true;
    try { sessionStorage.setItem(Grimoire.WIPE_FLAG, '1'); } catch (err) { /* ignore */ }
    Grimoire.wipeSave();
    Grimoire.state = Grimoire.defaultState();
    if (Grimoire.pages && Grimoire.pages.generate) Grimoire.pages.generate(Grimoire.state);
    location.reload();
};

Grimoire.addUnlock = function (s, id) {
    if (!Grimoire.hasUnlock(s, id)) {
        s.unlocks.push(id);
        Grimoire.mark('layout', 'projects', 'buttons', 'tabs');
    }
};

Grimoire.noteFirstTallow = function (s) {
    if (s.meta.tallowLogged || s.resources.tallow < 1) return;
    s.meta.tallowLogged = true;
    Grimoire.log(s, Grimoire.CONTENT.firstTallow);
};

Grimoire.noteFirstInk = function (s) {
    if (s.meta.inkLogged || s.resources.ink < 1) return;
    s.meta.inkLogged = true;
    Grimoire.log(s, Grimoire.CONTENT.firstInk);
};

Grimoire.noteFirstVellum = function (s) {
    if (s.meta.vellumLogged || s.resources.vellum < 1) return;
    s.meta.vellumLogged = true;
    Grimoire.log(s, Grimoire.CONTENT.firstVellum);
};

Grimoire.noteFirstExtracts = function (s) {
    if (s.meta.extractsLogged || s.resources.extracts < 1) return;
    s.meta.extractsLogged = true;
    Grimoire.log(s, Grimoire.CONTENT.firstExtracts);
};

Grimoire.noteFirstSilver = function (s) {
    if (s.meta.silverLogged || s.resources.silver < 1) return;
    s.meta.silverLogged = true;
    Grimoire.log(s, Grimoire.CONTENT.firstSilver);
};

Grimoire.noteFirstFolio = function (s) {
    if (s.meta.folioLogged || s.resources.folios < 1) return;
    s.meta.folioLogged = true;
    Grimoire.log(s, Grimoire.CONTENT.firstFolio);
};

Grimoire.addInsight = function (s, amount) {
    if (amount <= 0) return;
    s.resources.insight += amount;
    s.meta.totalInsightEarned += amount;
    Grimoire.mark('resources');
};

Grimoire.clampResource = function (s, key, cap) {
    if (s.resources[key] > cap) s.resources[key] = cap;
    if (s.resources[key] < 0) s.resources[key] = 0;
};

Grimoire.log = function (s, text, opts) {
    opts = opts || {};
    s.log.push({
        text: text,
        highlight: !!opts.highlight,
        typewriter: !!opts.typewriter,
        choices: opts.choices || null
    });
    if (s.log.length > 60) s.log = s.log.slice(-60);
    Grimoire.mark('log');
};

Grimoire.translationPercent = function (s) {
    var den = s.page.runesFinishedLifetime;
    if (den <= 0) return 0;
    var pct = Math.floor(100 * s.page.stableLettersLifetime / den);
    if (s.meta.sentencesCompleted < 12 && pct > 99) pct = 99;
    if (pct < 0) pct = 0;
    return pct;
};
