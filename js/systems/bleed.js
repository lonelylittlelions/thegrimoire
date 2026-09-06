var Grimoire = window.Grimoire || (window.Grimoire = {});

Grimoire.bleed = {
    isHorizonTwo: function (s) {
        return Grimoire.hasUnlock(s, 'bolt_and_key');
    },

    fxAllowed: function (s) {
        if (s.settings.disableBleedFx) return false;
        if (!this.isHorizonTwo(s)) return false;
        return true;
    },

    tick: function (s, dt) {
        if (this.isHorizonTwo(s) && s.resources.oil > 50 && s.meta.candleLit) {
            s.meta.bleedLevel = Math.max(0, s.meta.bleedLevel - (0.2 / 60) * dt);
        }
        if (!this.fxAllowed(s)) return;

        var b = s.meta.bleedLevel;
        var flags = s.meta.bleedFlags;

        if (b >= 15) {
            s.meta.flameSkip = Math.random() < 0.08;
        } else {
            s.meta.flameSkip = false;
        }

        if (b >= 35 && !flags.repeat35) {
            flags.repeat35 = true;
            if (s.log.length && !s.meta.lastLogRepeat) {
                var last = s.log[s.log.length - 1];
                Grimoire.log(s, last.text);
                s.meta.lastLogRepeat = true;
            }
        }
        if (b < 30) {
            flags.repeat35 = false;
            s.meta.lastLogRepeat = false;
        }

        if (b >= 70 && !s.meta.doubtShown) {
            s.meta.doubtShown = true;
            s.meta.doubtUntil = Date.now() + 8000;
            Grimoire.mark('buttons', 'layout');
        }
        if (s.meta.doubtUntil && Date.now() > s.meta.doubtUntil) {
            s.meta.doubtUntil = 0;
            Grimoire.mark('buttons');
        }

        if (b >= 80) {
            s.meta.jitterUntil = Date.now() + 400;
            Grimoire.mark('resources');
        }
    },

    clickDoubt: function (s) {
        if (!s.meta.doubtUntil || Date.now() > s.meta.doubtUntil) return;
        s.meta.doubtUntil = 0;
        s.meta.doubtClicked = true;
        s.resources.obituaries += 1;
        Grimoire.log(s, 'a name. not yours. dated tomorrow.');
        Grimoire.mark('codex', 'buttons');
    },

    shouldFlickerLabel: function (s) {
        return this.fxAllowed(s) && s.meta.bleedLevel >= 55;
    }
};
