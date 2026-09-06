var Grimoire = window.Grimoire || (window.Grimoire = {});

Grimoire.candle = {
    BASE_DECAY: 0.35,
    BASE_DRIP: 0.15,
    OIL_CAP: 240,
    TALLOW_CAP: 200,
    TRIM_GAIN: 60,
    TRIM_COST: 3,
    MATCH_COST_INSIGHT: 3,
    MATCH_GAIN: 40,
    EMBER_GAIN: 15,
    EMBER_MS: 8000,
    WICK_SHOW: 0.2,

    oilCap: function (s) {
        return this.OIL_CAP + 60 * (s.generators.lamps || 0);
    },

    tallowCap: function (s) {
        return this.TALLOW_CAP + 50 * (s.generators.shelves || 0);
    },

    seasonMul: function (s) {
        var name = Grimoire.CONTENT.seasons[s.meta.season] || 'Spring';
        if (name === 'Solstice') return 2;
        if (name === 'Equinox') return 0.5;
        return 1;
    },

    prismMul: function (s) {
        var n = s.generators.prisms || 0;
        if (n <= 0) return 1;
        var m = 1;
        for (var i = 0; i < n; i++) {
            m *= (i === 0 ? 0.75 : 0.9);
        }
        return m;
    },

    wardMul: function (s) {
        var w = s.generators.assignments.ward || 0;
        return Math.pow(0.85, w);
    },

    decayRate: function (s) {
        if (!s.meta.candleLit || s.resources.oil <= 0) return 0;
        var rate = this.BASE_DECAY * this.seasonMul(s) * this.prismMul(s) *
            s.meta.oilDecayMul * this.wardMul(s);
        if (rate < 0.15 && (s.generators.assignments.ward || 0) > 0) rate = 0.15;
        return rate;
    },

    dripRate: function (s) {
        if (!s.meta.candleLit || s.resources.oil <= 0) return 0;
        return this.BASE_DRIP + (s.meta.tallowDripBonus || 0);
    },

    oilPercent: function (s) {
        var cap = this.oilCap(s);
        if (cap <= 0) return 0;
        return Math.max(0, Math.min(1, s.resources.oil / cap));
    },

    stage: function (s) {
        if (s.resources.oil <= 0 || !s.meta.candleLit) return 'drowned';
        var p = this.oilPercent(s);
        if (p > 0.6) return 'full';
        if (p > 0.2) return 'diminished';
        return 'stub';
    },

    wickVisible: function (s) {
        if (!s.meta.deskRevealed) return false;
        if (s.meta.wickSeen) return true;
        if (this.oilPercent(s) <= this.WICK_SHOW) {
            s.meta.wickSeen = true;
            return true;
        }
        return false;
    },

    lightFromBoot: function (s) {
        if (s.meta.deskRevealed) return false;
        s.meta.deskRevealed = true;
        s.meta.candleLit = true;
        s.meta.oilEmptyLogged = false;
        s.meta.lastTickAt = Date.now();
        Grimoire.log(s, 'the wick takes. the desk is there.', { highlight: true });
        Grimoire.markAll();
        if (Grimoire.saveToStorage) Grimoire.saveToStorage(s);
        if (Grimoire.view && Grimoire.view.playLightCue) Grimoire.view.playLightCue('flare');
        return true;
    },

    tick: function (s, dt) {
        if (s.meta.emberUntil && Date.now() >= s.meta.emberUntil) {
            this.grantEmber(s);
        }
        if (!s.meta.deskRevealed) return;
        if (Grimoire.debug && Grimoire.debug.freezeOil) {
            Grimoire.mark('candle', 'vignette');
            return;
        }
        if (!s.meta.candleLit || s.resources.oil <= 0) {
            if (s.resources.oil <= 0 && s.meta.candleLit) {
                this.extinguish(s);
            }
            return;
        }
        var decay = this.decayRate(s);
        var drip = this.dripRate(s);
        s.resources.oil -= decay * dt;
        s.resources.tallow += drip * dt;
        Grimoire.clampResource(s, 'tallow', this.tallowCap(s));
        if (s.resources.oil <= 0) {
            s.resources.oil = 0;
            this.extinguish(s);
        } else {
            s.meta.oilEmptyLogged = false;
            s.meta.offlineBleedDone = false;
        }
        Grimoire.mark('resources', 'candle', 'vignette');
    },

    extinguish: function (s) {
        s.resources.oil = 0;
        s.meta.candleLit = false;
        if (!s.meta.darknessSeen) {
            s.meta.darknessSeen = true;
            s.resources.matches = 3;
            s.meta.matchesSeen = true;
            Grimoire.mark('resources');
        }
        s.meta.snuffs = (s.meta.snuffs || 0) + 1;
        if (!s.meta.oilEmptyLogged) {
            s.meta.oilEmptyLogged = true;
            s.meta.pendingChoice = 'darkness';
            Grimoire.log(s, 'the flame is gone. the room does not end at the desk.', { highlight: true });
        }
        Grimoire.mark('candle', 'vignette', 'buttons', 'log');
    },

    trim: function (s) {
        var free = s.meta.trimsDone < 2;
        var cost = free ? 0 : this.TRIM_COST;
        if (!free && s.resources.tallow < cost) return false;
        if (!free) s.resources.tallow -= cost;
        var cap = this.oilCap(s);
        var before = s.resources.oil;
        s.resources.oil += this.TRIM_GAIN;
        if (s.resources.oil > cap) {
            s.resources.oil = cap;
            if (before + this.TRIM_GAIN > cap) {
                Grimoire.log(s, 'the wick will not take more.');
            }
        }
        s.meta.trimsDone += 1;
        s.meta.candleLit = true;
        s.meta.oilEmptyLogged = false;
        s.meta.pendingChoice = null;
        s.meta.emberUntil = 0;
        Grimoire.mark('resources', 'candle', 'buttons', 'vignette');
        if (Grimoire.view && Grimoire.view.playLightCue) Grimoire.view.playLightCue('flare');
        return true;
    },

    strikeMatch: function (s) {
        if (s.resources.matches < 1) return false;
        if (s.resources.insight < this.MATCH_COST_INSIGHT) return false;
        s.resources.insight -= this.MATCH_COST_INSIGHT;
        s.resources.matches -= 1;
        s.resources.oil = Math.min(this.oilCap(s), s.resources.oil + this.MATCH_GAIN);
        s.meta.candleLit = true;
        s.meta.pendingChoice = null;
        s.meta.oilEmptyLogged = false;
        s.meta.emberUntil = 0;
        Grimoire.log(s, 'phosphorus. the wick takes.');
        Grimoire.mark('resources', 'candle', 'buttons', 'log', 'vignette');
        if (Grimoire.view && Grimoire.view.playLightCue) Grimoire.view.playLightCue('flare');
        return true;
    },

    sitInDark: function (s) {
        s.meta.pendingChoice = null;
        s.meta.bleedLevel = Math.min(100, s.meta.bleedLevel + 4);
        s.meta.emberUntil = Date.now() + this.EMBER_MS;
        Grimoire.log(s, 'you sit. the dark has an edge.');
        Grimoire.mark('log', 'buttons', 'vignette');
        return true;
    },

    grantEmber: function (s) {
        s.meta.emberUntil = 0;
        s.resources.oil = Math.min(this.oilCap(s), s.resources.oil + this.EMBER_GAIN);
        s.meta.candleLit = true;
        s.meta.oilEmptyLogged = false;
        Grimoire.log(s, 'an ember holds.');
        Grimoire.mark('resources', 'candle', 'buttons', 'log', 'vignette');
        if (Grimoire.view && Grimoire.view.playLightCue) Grimoire.view.playLightCue('flare');
    },

    distill: function (s) {
        if (s.resources.tallow < 5) return false;
        s.resources.tallow -= 5;
        s.resources.ink += 1;
        Grimoire.mark('resources', 'buttons', 'projects');
        return true;
    },

    asciiBody: function (stage) {
        if (stage === 'full') {
            return [
                ' .-;-. ',
                "|'-=-'|",
                '|     |',
                '|     |',
                '|     |',
                "'.___.'"
            ];
        }
        if (stage === 'diminished') {
            return [
                ' .-;-. ',
                "|'-=-'|",
                '|     |',
                "'.___.'"
            ];
        }
        if (stage === 'stub') {
            return [
                ' .-;-. ',
                "'.___.'"
            ];
        }
        return [
            '       ',
            '  .-.  ',
            ' |   | ',
            " '---' "
        ];
    }
};
