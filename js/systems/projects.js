var Grimoire = window.Grimoire || (window.Grimoire = {});

Grimoire.projects = {
    byId: function (id) {
        var list = Grimoire.CONTENT.projects;
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) return list[i];
        }
        return null;
    },

    owned: function (s, id) {
        return s.purchased[id] || 0;
    },

    currentCost: function (s, p) {
        var owned = this.owned(s, p.id);
        var rate = p.rate || 1;
        var out = {};
        for (var k in p.costs) {
            if (!Object.prototype.hasOwnProperty.call(p.costs, k)) continue;
            out[k] = Grimoire.economics.geometricCost(p.costs[k], rate, owned);
        }
        return out;
    },

    canPay: function (s, costs) {
        for (var k in costs) {
            if (!Object.prototype.hasOwnProperty.call(costs, k)) continue;
            if ((s.resources[k] || 0) < costs[k]) return false;
        }
        return true;
    },

    pay: function (s, costs) {
        for (var k in costs) {
            if (!Object.prototype.hasOwnProperty.call(costs, k)) continue;
            s.resources[k] -= costs[k];
        }
        Grimoire.mark('resources');
    },

    atCap: function (s, p) {
        if (p.capKey === 'quills' && s.generators.quills >= (p.cap || 12)) return true;
        if (p.capKey === 'shelves' && s.generators.shelves >= (p.cap || 4)) return true;
        if (p.capKey === 'lamps' && s.generators.lamps >= (p.cap || 3)) return true;
        if (p.id === 'spare_matches' && s.resources.matches >= 12) return true;
        if (p.id === 'listen_shutter' && this.owned(s, p.id) >= 3) return true;
        if (p.id === 'press_once' && this.owned(s, p.id) >= (p.cap || 3)) return true;
        if (p.once && Grimoire.hasUnlock(s, p.id)) return true;
        return false;
    },

    visibleOnTab: function (p, tab) {
        if (p.auto) return false;
        if (!p.tab || p.tab === 'both') return true;
        return p.tab === tab;
    },

    isRevealed: function (s, p) {
        if (p.auto) return false;
        if (this.atCap(s, p) && p.once) return false;
        if (p.id === 'listen_shutter' && this.owned(s, p.id) >= 3) return false;
        if (p.id === 'press_once' && this.atCap(s, p) && !(s.meta.pressOnceLeft > 0)) return false;
        if (typeof p.reveal === 'function' && p.reveal(s)) return true;
        if (p.strictReveal) return false;
        return this.withinTwoX(s, p);
    },

    withinTwoX: function (s, p) {
        if (!p.costs || !Object.keys(p.costs).length) return false;
        var cost = this.currentCost(s, p);
        var seen = false;
        for (var k in cost) {
            if (!this.canSee(s, k)) return false;
            seen = true;
            if ((s.resources[k] || 0) < cost[k] / 2) return false;
        }
        return seen;
    },

    canSee: function (s, key) {
        if (key === 'insight') return true;
        if (key === 'tallow' || key === 'oil') return Grimoire.hasUnlock(s, 'name_flame');
        if (key === 'ink') return Grimoire.hasUnlock(s, 'catalog_page');
        if (key === 'passages') return s.page.pagesFinished >= 1;
        if (key === 'lexicons') return Grimoire.hasUnlock(s, 'collation');
        if (key === 'vellum') return (s.resources.vellum || 0) > 0 || Grimoire.hasUnlock(s, 'light_cellars');
        if (key === 'folios') return (s.resources.folios || 0) > 0 || Grimoire.hasUnlock(s, 'light_library');
        if (key === 'extracts') return (s.resources.extracts || 0) > 0 || Grimoire.hasUnlock(s, 'light_glasshouse');
        if (key === 'silver') return (s.resources.silver || 0) > 0 || Grimoire.hasUnlock(s, 'light_vault');
        return false;
    },

    canBuy: function (s, p) {
        if (this.atCap(s, p)) return false;
        if (typeof p.require === 'function' && !p.require(s)) return false;
        return this.canPay(s, this.currentCost(s, p));
    },

    buy: function (s, id) {
        var p = this.byId(id);
        if (!p || p.auto) return false;
        if (!this.canBuy(s, p)) return false;
        this.pay(s, this.currentCost(s, p));
        s.purchased[id] = this.owned(s, id) + 1;
        if (p.once) Grimoire.addUnlock(s, id);
        this.apply(s, p);
        if (p.flavor) Grimoire.log(s, p.flavor, { highlight: true, typewriter: true });
        Grimoire.mark('projects', 'buttons', 'layout', 'jobs');
        return true;
    },

    apply: function (s, p) {
        switch (p.id) {
            case 'name_flame':
                Grimoire.addUnlock(s, 'name_flame');
                Grimoire.mark('layout', 'resources', 'subhead', 'buttons', 'candle', 'projects');
                break;
            case 'catalog_page':
                Grimoire.addUnlock(s, 'catalog_page');
                break;
            case 'wick_stub':
                s.resources.oil = Math.min(Grimoire.candle.oilCap(s), s.resources.oil + 20);
                Grimoire.mark('resources', 'candle');
                break;
            case 'catch_drip':
                s.meta.tallowDripBonus += 0.02;
                break;
            case 'press_once':
                s.meta.pressOnceLeft += 15;
                break;
            case 'steady_hand':
                s.meta.stabilizeDenom = 3;
                break;
            case 'steel_nib':
                s.generators.nibs += 1;
                break;
            case 'bind_quill':
                s.generators.quills += 1;
                Grimoire.jobs.syncNewQuills(s);
                if (s.generators.quills === 1) {
                    Grimoire.log(s, 'the feather writes when you look away.', { highlight: true });
                }
                Grimoire.mark('resources', 'jobs');
                break;
            case 'spare_matches':
                s.resources.matches = Math.min(12, s.resources.matches + 2);
                Grimoire.mark('resources');
                break;
            case 'bolt_and_key':
                Grimoire.addUnlock(s, 'bolt_and_key');
                Grimoire.mark('tabs', 'layout', 'subhead');
                break;
            case 'prism':
                s.generators.prisms += 1;
                break;
            case 'shelf':
                s.generators.shelves += 1;
                Grimoire.mark('resources');
                break;
            case 'spare_lamp':
                s.generators.lamps += 1;
                Grimoire.mark('resources', 'candle');
                break;
            case 'attend_lesson':
                Grimoire.addUnlock(s, 'attend_lesson');
                Grimoire.mark('jobs');
                break;
            case 'collation':
                Grimoire.addUnlock(s, 'collation');
                s.generators.boards = Math.min(10, (s.generators.boards || 0) + 1);
                break;
            case 'index':
                Grimoire.addUnlock(s, 'index');
                Grimoire.mark('resources');
                break;
            case 'under_text':
                s.meta.cognitiveAperture = 1.2;
                s.meta.bleedLevel = Math.min(100, s.meta.bleedLevel + 12);
                Grimoire.addUnlock(s, 'under_text');
                break;
            case 'suppress':
                s.meta.cognitiveAperture = 1;
                s.meta.bleedLevel = Math.max(0, s.meta.bleedLevel - 15);
                Grimoire.addUnlock(s, 'suppress');
                break;
            case 'listen_shutter': {
                var n = this.owned(s, 'listen_shutter');
                var lines = Grimoire.CONTENT.listenLines;
                var line = lines[Math.min(n - 1, lines.length - 1)];
                Grimoire.log(s, line, { highlight: true, typewriter: true });
                break;
            }
            case 'open_shutters':
                s.meta.shuttersOpen = true;
                Grimoire.addUnlock(s, 'open_shutters');
                Grimoire.mark('tabs', 'layout', 'subhead');
                Grimoire.log(s, 'the grounds are dark. the journal asks nothing.', { highlight: true, typewriter: true });
                if (s.meta.bleedLevel < 20 && !s.meta.silenceTease) {
                    s.meta.silenceTease = true;
                    Grimoire.log(s, 'the bolt could still be drawn.', { highlight: true, typewriter: true });
                }
                break;
            case 'wax_reserve':
                s.meta.oilDecayMul *= 0.9;
                break;
            case 'second_desk':
                s.meta.extraReveals += 1;
                break;
            case 'margin_lamp':
                s.meta.vignetteSoft = true;
                Grimoire.mark('vignette');
                break;
            case 'codex_bind':
                Grimoire.addUnlock(s, 'codex_bind');
                Grimoire.mark('codex');
                break;
            case 'light_cellars':
            case 'light_library':
            case 'light_glasshouse':
            case 'light_vault':
                Grimoire.addUnlock(s, p.id);
                if (Grimoire.estate) Grimoire.estate.onLit(s, p.id.replace('light_', ''));
                break;
            case 'mechanical_cataloger':
                Grimoire.addUnlock(s, 'mechanical_cataloger');
                Grimoire.mark('estate');
                break;
            case 'packet_gate':
                s.meta.packetLeft = true;
                Grimoire.addUnlock(s, 'packet_gate');
                Grimoire.log(s, Grimoire.CONTENT.packetObit, { highlight: true });
                Grimoire.mark('estate', 'subhead');
                break;
            default:
                break;
        }
    },

    tickAutos: function (s) {
        if (!Grimoire.hasUnlock(s, 'name_flame') && s.meta.totalInsightEarned >= 8) {
            this.apply(s, this.byId('name_flame'));
            var p = this.byId('name_flame');
            Grimoire.log(s, p.flavor, { highlight: true, typewriter: true });
        }
        if (!Grimoire.hasUnlock(s, 'bolt_and_key') && s.meta.sentencesCompleted >= 3) {
            this.apply(s, this.byId('bolt_and_key'));
            Grimoire.log(s, this.byId('bolt_and_key').flavor, { highlight: true, typewriter: true });
        }
    },

    workshopMul: function (s) {
        var w = Math.min(10, s.generators.boards || 0);
        var d = 2;
        return Math.pow(1 + 0.06 * w, d);
    },

    lexiconYield: function (s) {
        var base = this.workshopMul(s);
        var ap = s.meta.cognitiveAperture || 1;
        var bleedBonus = 1 + (s.meta.bleedLevel || 0) / 500;
        return Math.max(1, Math.floor(base * ap * bleedBonus));
    },

    canLexicon: function (s) {
        return Grimoire.hasUnlock(s, 'collation') &&
            s.resources.passages >= 5 && s.resources.ink >= 8;
    },

    bindLexicon: function (s) {
        if (!this.canLexicon(s)) return false;
        s.resources.passages -= 5;
        s.resources.ink -= 8;
        s.resources.lexicons += this.lexiconYield(s);
        Grimoire.log(s, 'a lexicon is bound. the repeats have a cover.');
        Grimoire.mark('resources', 'projects', 'codex');
        return true;
    },

    revealedList: function (s, tab) {
        var list = Grimoire.CONTENT.projects;
        var out = [];
        for (var i = 0; i < list.length; i++) {
            var p = list[i];
            if (!this.visibleOnTab(p, tab)) continue;
            if (!this.isRevealed(s, p) && !this.atCap(s, p)) continue;
            if (p.id === 'press_once' && this.atCap(s, p) && !(s.meta.pressOnceLeft > 0)) continue;
            if (this.atCap(s, p) && (p.once || p.id === 'listen_shutter')) continue;
            out.push(p);
        }
        out.sort(function (a, b) {
            return Grimoire.projects.listRank(s, a) - Grimoire.projects.listRank(s, b);
        });
        return out;
    },

    listRank: function (s, p) {
        if (p.id === 'press_once') return 80;
        if (p.kind === 'gate' || p.kind === 'building') return this.owned(s, p.id) ? 20 : 0;
        if (p.once) return 10;
        return 40;
    },

    tease: function (s, tab) {
        var prefer = tab === 'estate'
            ? ['light_cellars', 'light_library', 'packet_gate', 'mechanical_cataloger', 'light_vault', 'light_glasshouse']
            : ['open_shutters', 'attend_lesson', 'collation', 'catalog_page', 'bind_quill'];
        var list = Grimoire.CONTENT.projects;
        var found = [];
        for (var i = 0; i < list.length; i++) {
            var p = list[i];
            if (p.auto || this.visibleOnTab(p, tab) === false) continue;
            if (this.isRevealed(s, p) || this.atCap(s, p)) continue;
            if (typeof p.teaseWhen === 'function') {
                if (!p.teaseWhen(s)) continue;
            } else if (typeof p.reveal === 'function' && !p.reveal(s) && !this.nearTease(s, p)) {
                continue;
            }
            found.push(p);
        }
        for (var g = 0; g < prefer.length; g++) {
            for (var j = 0; j < found.length; j++) {
                if (found[j].id === prefer[g]) return found[j];
            }
        }
        return found[0] || null;
    },

    nearTease: function (s, p) {
        var cost = this.currentCost(s, p);
        for (var k in cost) {
            if (!this.canSee(s, k)) return false;
        }
        return Object.keys(cost).length > 0;
    },

    costLabel: function (s, p) {
        if (p.id === 'open_shutters') return 'Sentence 6, 3 Lexicons';
        var cost = this.currentCost(s, p);
        var parts = [];
        for (var k in cost) {
            parts.push(cost[k] + ' ' + this.resourceWord(k));
        }
        return parts.join(', ') || '—';
    },

    buttonLabel: function (s, p, dim) {
        var cost = this.costLabel(s, p);
        if (dim) return '???? — ' + cost;
        if (p.id === 'press_once') {
            var left = s.meta.pressOnceLeft || 0;
            var packs = this.owned(s, p.id) + '/' + (p.cap || 3);
            if (left > 0) return p.title + ' — ' + cost + ' · ' + packs + ' · ' + left + ' left';
            return p.title + ' — ' + cost + ' · ' + packs;
        }
        return p.title + ' — ' + cost;
    },

    rateStr: function (n, digits) {
        if (digits == null) digits = 2;
        var f = Math.pow(10, digits);
        return String(Math.round(n * f) / f);
    },

    effectText: function (s, p) {
        if (!p) return '';
        var fmt = Grimoire.economics.format;
        var owned = this.owned(s, p.id);
        var c = Grimoire.candle;
        switch (p.id) {
            case 'catalog_page':
                return 'Unlock Distill: 5 tallow → 1 ink.';
            case 'wick_stub':
                return 'Once: +20 oil (cap ' + fmt(c.oilCap(s)) + ').';
            case 'catch_drip': {
                var drip = c.BASE_DRIP + (s.meta.tallowDripBonus || 0);
                return 'Tallow drip ' + this.rateStr(drip) + '/s → ' + this.rateStr(drip + 0.02) + '/s.';
            }
            case 'press_once': {
                var left = s.meta.pressOnceLeft || 0;
                var base = 1 + 0.1 * (s.generators.nibs || 0);
                var packs = owned + '/' + (p.cap || 3);
                return 'A short boost: ' + packs + ' packs. Each pack adds 15 charges; Decipher spends 1 for +1 Insight. It does not raise the +1. Pool: ' +
                    left + '. Next Decipher: ' + this.rateStr(left > 0 ? base + 1 : base, 1) + ' Insight.';
            }
            case 'steady_hand': {
                var den = s.meta.stabilizeDenom || 4;
                return 'Letters stay 1 in ' + den + ' → 1 in 3.';
            }
            case 'steel_nib': {
                var now = 1 + 0.1 * (s.generators.nibs || 0);
                return 'Decipher Insight ' + this.rateStr(now, 1) + ' → ' + this.rateStr(now + 0.1, 1) + ' per click. Owned: ' + (s.generators.nibs || 0) + '.';
            }
            case 'bind_quill': {
                var q = s.generators.quills || 0;
                return '+1 Quill (starts on Transcribe: 0.5 Insight/s). ' + q + ' / 12.';
            }
            case 'spare_matches':
                return '+2 Matches (cap 12). Now ' + (s.resources.matches || 0) + '.';
            case 'prism': {
                var n = s.generators.prisms || 0;
                var cur = c.decayRate(s);
                var step = n === 0 ? 0.75 : 0.9;
                var nextMul = c.prismMul(s) * step;
                var next = c.BASE_DECAY * c.seasonMul(s) * nextMul * s.meta.oilDecayMul * c.wardMul(s);
                if (next < 0.15 && (s.generators.assignments.ward || 0) > 0) next = 0.15;
                return 'Oil burn ×' + step + ' (first prism ×0.75, later ×0.9). ' +
                    this.rateStr(cur) + '/s → ' + this.rateStr(next) + '/s. Prisms: ' + n + '.';
            }
            case 'shelf': {
                var sh = s.generators.shelves || 0;
                return 'Tallow cap ' + fmt(c.tallowCap(s)) + ' → ' + fmt(c.TALLOW_CAP + 50 * (sh + 1)) + '. ' + sh + ' / 4.';
            }
            case 'spare_lamp': {
                var lp = s.generators.lamps || 0;
                return 'Oil cap ' + fmt(c.oilCap(s)) + ' → ' + fmt(c.OIL_CAP + 60 * (lp + 1)) + '. ' + lp + ' / 3.';
            }
            case 'attend_lesson':
                return 'Unlock job Attend: 0.08 runes/s per assigned quill. Slow. A page takes minutes.';
            case 'collation': {
                var boards = Math.min(10, (s.generators.boards || 0) + 1);
                var yieldN = Math.max(1, Math.floor(Math.pow(1 + 0.06 * boards, 2)));
                return 'Unlock Bind Lexicon (5 Passages, 8 Ink → ' + yieldN + ' Lexicon). +1 collation board.';
            }
            case 'index':
                return 'Number the chapter. Marks that stayed are shown as a percent.';
            case 'under_text':
                return 'Cognitive Aperture 1 → 1.2. Bleed +12 (now ' + Math.floor(s.meta.bleedLevel || 0) + ').';
            case 'suppress':
                return 'Cognitive Aperture → 1. Bleed −15 (now ' + Math.floor(s.meta.bleedLevel || 0) + ').';
            case 'listen_shutter':
                return 'Spend 1 Lexicon and 20 oil for a sound. ' + owned + ' / 3.';
            case 'open_shutters':
                return 'Unlock Estate. Needs Sentence 6 and 3 Lexicons.';
            case 'wax_reserve': {
                var burn = c.decayRate(s);
                var after = burn * 0.9;
                return 'Oil burn ×0.9 once. ' + this.rateStr(burn) + '/s → ' + this.rateStr(after) + '/s.';
            }
            case 'second_desk': {
                var extra = s.meta.extraReveals || 0;
                return 'Desk list +1 visible upgrade. ' + (4 + extra) + ' → ' + (5 + extra) + '.';
            }
            case 'margin_lamp':
                return 'Vignette darkness ×0.62. The wick still burns.';
            case 'codex_bind':
                return 'List completed sentences in the Study.';
            case 'light_cellars':
                return 'Light the Cellars. Then a hide can be rendered into vellum.';
            case 'light_library':
                return 'Light the Library. Collation needs vellum and ink.';
            case 'light_glasshouse':
                return 'Light the Glasshouse. Extracts drip on the 80-minute season.';
            case 'light_vault':
                return 'Light the Vault. Charge a bath with surplus ink for silver.';
            case 'tool_cellars':
                return 'Render finishes faster. Owned: ' + owned + '.';
            case 'tool_library':
                return 'Collation finishes faster. Owned: ' + owned + '.';
            case 'tool_glasshouse':
                return 'Extract drip faster. Owned: ' + owned + '.';
            case 'tool_vault':
                return 'Bath finishes faster. Owned: ' + owned + '.';
            case 'mechanical_cataloger':
                return 'Library collations finish while you walk elsewhere. Permanent.';
            case 'packet_gate':
                return 'Leave 1 Lexicon and 1 Folio on the gravel. Nothing returns.';
            default:
                return '';
        }
    },

    resourceWord: function (k) {
        if (k === 'insight') return 'Insight';
        if (k === 'tallow') return 'Tallow';
        if (k === 'ink') return 'Ink';
        if (k === 'oil') return 'Oil';
        if (k === 'passages') return 'Passages';
        if (k === 'lexicons') return 'Lexicons';
        if (k === 'vellum') return 'Vellum';
        if (k === 'folios') return 'Folios';
        if (k === 'extracts') return 'Extracts';
        if (k === 'silver') return 'Silver';
        return k;
    }
};
