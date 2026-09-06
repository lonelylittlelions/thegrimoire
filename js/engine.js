var Grimoire = window.Grimoire || (window.Grimoire = {});

Grimoire.TICK_MS = 200;
Grimoire.SCHOLAR_DAY_TICKS = 2400;
Grimoire.SEASON_TICKS = 24000;
Grimoire.OFFLINE_CAP_MS = 12 * 60 * 60 * 1000;
Grimoire.AUTOSAVE_MS = 15000;

Grimoire.engine = {
    acc: 0,
    last: 0,
    running: false,
    saveAcc: 0,

    start: function () {
        this.last = performance.now();
        this.running = true;
        this.catchUpFromSave();
        var self = this;
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                if (!Grimoire.wiping) Grimoire.saveToStorage(Grimoire.state);
            } else {
                self.catchUpFromSave();
            }
        });
        window.addEventListener('beforeunload', function () {
            if (!Grimoire.wiping) Grimoire.saveToStorage(Grimoire.state);
        });
        requestAnimationFrame(function frame(now) {
            self.frame(now);
            requestAnimationFrame(frame);
        });
    },

    frame: function (now) {
        var dt = now - this.last;
        this.last = now;
        if (!Grimoire.state.meta.deskRevealed) {
            this.acc = 0;
            Grimoire.view.alwaysTickVisuals(Grimoire.state);
            Grimoire.view.draw();
            return;
        }
        if (dt > 1000) dt = 1000;
        this.acc += dt;
        this.saveAcc += dt;
        Grimoire.state.meta.playMs += dt;
        if (!Grimoire.state.meta.settingsUnlocked && Grimoire.state.meta.playMs >= 90000) {
            Grimoire.state.meta.settingsUnlocked = true;
            Grimoire.mark('settings', 'layout');
        }
        var ticks = 0;
        while (this.acc >= Grimoire.TICK_MS && ticks < 8) {
            this.acc -= Grimoire.TICK_MS;
            this.tick(Grimoire.TICK_MS / 1000);
            ticks++;
        }
        if (this.saveAcc >= Grimoire.AUTOSAVE_MS) {
            this.saveAcc = 0;
            Grimoire.saveToStorage(Grimoire.state);
        }
        Grimoire.view.alwaysTickVisuals(Grimoire.state);
        Grimoire.view.draw();
    },

    tick: function (dt) {
        var s = Grimoire.state;
        this.roomLines(s);
        Grimoire.candle.tick(s, dt);
        Grimoire.jobs.tick(s, dt);
        if (Grimoire.estate) Grimoire.estate.tick(s, dt);
        Grimoire.pages.tickFlashes(s, dt);
        this.tickSeasons(s);
        Grimoire.bleed.tick(s, dt);
        Grimoire.projects.tickAutos(s);
        this.tickEvents(s);
        Grimoire.view.stepFlame(s);
        Grimoire.view.stepAscii(s);
        s.meta.lastTickAt = Date.now();
    },

    roomLines: function (s) {
        if (!s.meta.roomLine15 && s.meta.playMs >= 15000) {
            s.meta.roomLine15 = true;
            Grimoire.log(s, 'dust holds in the air and does not settle.');
        }
        if (!s.meta.roomLine45 && s.meta.playMs >= 45000) {
            s.meta.roomLine45 = true;
            if (!Grimoire.hasUnlock(s, 'name_flame')) {
                Grimoire.log(s, 'a smell of tallow. the wick has been burning.');
            }
        }
    },

    tickSeasons: function (s) {
        s.meta.seasonTick += 1;
        var season = Grimoire.CONTENT.seasons[s.meta.season];
        if (season === 'Autumn' && s.meta.seasonTick === Grimoire.SCHOLAR_DAY_TICKS * 9) {
            Grimoire.log(s, 'the light will thin tomorrow.');
        }
        if (s.meta.seasonTick >= Grimoire.SEASON_TICKS) {
            s.meta.seasonTick = 0;
            s.meta.season = (s.meta.season + 1) % 4;
            var name = Grimoire.CONTENT.seasons[s.meta.season];
            Grimoire.log(s, Grimoire.CONTENT.seasonLines[name], { highlight: true });
            Grimoire.mark('log', 'candle');
        }
    },

    tickEvents: function (s) {
        var now = Date.now();
        if (now - s.meta.eventAt < 120000) return;
        var list = Grimoire.CONTENT.events;
        for (var i = 0; i < list.length; i++) {
            var ev = list[i];
            if (ev.once && s.meta.eventsFired[ev.id]) continue;
            if (ev.horizon === 2 && !Grimoire.bleed.isHorizonTwo(s)) continue;
            if (!ev.when(s)) continue;
            s.meta.eventsFired[ev.id] = (s.meta.eventsFired[ev.id] || 0) + 1;
            s.meta.eventAt = now;
            ev.apply(s);
            Grimoire.log(s, ev.line, { highlight: true });
            Grimoire.mark('resources', 'log');
            return;
        }
    },

    catchUpFromSave: function () {
        var s = Grimoire.state;
        if (!s.meta.deskRevealed) {
            s.meta.lastTickAt = Date.now();
            return;
        }
        var elapsed = Date.now() - (s.meta.lastTickAt || s.meta.lastSaved || Date.now());
        if (elapsed < 2000) {
            s.meta.lastTickAt = Date.now();
            return;
        }
        var capped = Math.min(elapsed, Grimoire.OFFLINE_CAP_MS);
        var result = this.catchUp(s, capped / 1000);
        s.meta.lastTickAt = Date.now();
        if (elapsed > 180000) {
            var pct = Math.round(Grimoire.candle.oilPercent(s) * 100);
            Grimoire.log(s, Grimoire.CONTENT.welcomeBack(pct, Math.floor(result.insight), result.oilEmpty), { highlight: true });
        }
        Grimoire.markAll();
    },

    catchUp: function (s, seconds) {
        var insight0 = s.meta.totalInsightEarned;
        var oilEmpty = false;
        if (s.meta.emberUntil && Date.now() >= s.meta.emberUntil) {
            Grimoire.candle.grantEmber(s);
        }
        if (!s.meta.candleLit || s.resources.oil <= 0) {
            oilEmpty = true;
            if (!s.meta.offlineBleedDone) {
                s.meta.bleedLevel = Math.min(100, s.meta.bleedLevel + 2);
                s.meta.offlineBleedDone = true;
            }
            return { insight: 0, oilEmpty: true };
        }
        var remaining = seconds;
        var guard = 0;
        while (remaining > 0.0001 && guard < 8) {
            guard += 1;
            if (!s.meta.candleLit || s.resources.oil <= 0) {
                oilEmpty = true;
                break;
            }
            var decay = Grimoire.candle.decayRate(s);
            var drip = Grimoire.candle.dripRate(s);
            var oilTime = decay > 0 ? s.resources.oil / decay : remaining;
            var slice = Math.min(remaining, oilTime);
            var buffLeft = Grimoire.estate ? Grimoire.estate.buffLeft(s) : 0;
            if (buffLeft > 0) slice = Math.min(slice, buffLeft);
            Grimoire.jobs.catchUp(s, slice);
            if (Grimoire.estate) {
                Grimoire.estate.catchUp(s, slice);
                Grimoire.estate.advanceBuff(s, slice);
            }
            s.resources.oil -= decay * slice;
            s.resources.tallow += drip * slice;
            Grimoire.clampResource(s, 'tallow', Grimoire.candle.tallowCap(s));
            Grimoire.noteFirstTallow(s);
            remaining -= slice;
            if (s.resources.oil <= 0.0001) {
                s.resources.oil = 0;
                Grimoire.candle.extinguish(s);
                oilEmpty = true;
                if (!s.meta.offlineBleedDone) {
                    s.meta.bleedLevel = Math.min(100, s.meta.bleedLevel + 2);
                    s.meta.offlineBleedDone = true;
                }
                break;
            }
        }
        var insightGain = s.meta.totalInsightEarned - insight0;
        return { insight: insightGain, oilEmpty: oilEmpty };
    }
};
