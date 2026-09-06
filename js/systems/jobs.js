var Grimoire = window.Grimoire || (window.Grimoire = {});

Grimoire.jobs = {
    rates: function (s) {
        var a = s.generators.assignments;
        var transcribe = a.transcribe || 0;
        var copy = a.copy || 0;
        var attend = a.attend || 0;
        return {
            insight: transcribe * 0.5,
            copyInk: copy * 0.08,
            copyDrain: copy * 0.4,
            attendRunes: attend * 0.08
        };
    },

    totalAssigned: function (s) {
        var a = s.generators.assignments;
        return (a.transcribe || 0) + (a.copy || 0) + (a.attend || 0) + (a.ward || 0);
    },

    syncNewQuills: function (s) {
        var q = s.generators.quills;
        var assigned = this.totalAssigned(s);
        if (q > assigned) {
            s.generators.assignments.transcribe += (q - assigned);
        } else if (q < assigned) {
            this.strip(s, assigned - q);
        }
        Grimoire.mark('jobs', 'resources');
    },

    strip: function (s, n) {
        var order = ['ward', 'attend', 'copy', 'transcribe'];
        var a = s.generators.assignments;
        for (var i = 0; i < order.length && n > 0; i++) {
            var take = Math.min(a[order[i]], n);
            a[order[i]] -= take;
            n -= take;
        }
    },

    canAttend: function (s) {
        return Grimoire.hasUnlock(s, 'attend_lesson');
    },

    shift: function (s, job, delta) {
        if (!Grimoire.hasUnlock(s, 'bolt_and_key')) return;
        if (job === 'attend' && !this.canAttend(s)) return;
        var a = s.generators.assignments;
        if (delta > 0) {
            if ((a.transcribe || 0) <= 0) {
                var donors = ['copy', 'ward', 'attend'];
                var moved = false;
                for (var i = 0; i < donors.length; i++) {
                    if (donors[i] !== job && a[donors[i]] > 0) {
                        a[donors[i]] -= 1;
                        a[job] += 1;
                        moved = true;
                        break;
                    }
                }
                if (!moved) return;
            } else {
                a.transcribe -= 1;
                a[job] += 1;
            }
        } else if (delta < 0) {
            if ((a[job] || 0) <= 0) return;
            if (job === 'transcribe') return;
            a[job] -= 1;
            a.transcribe += 1;
        }
        Grimoire.mark('jobs');
    },

    tick: function (s, dt) {
        if (!s.meta.candleLit || s.resources.oil <= 0) return;
        if (s.generators.quills <= 0) return;
        var r = this.rates(s);
        if (r.insight > 0) {
            Grimoire.addInsight(s, r.insight * dt);
        }
        if (r.copyInk > 0) {
            var drain = r.copyDrain * dt;
            if (s.resources.insight > 0) {
                var used = Math.min(s.resources.insight, drain);
                var frac = drain <= 0 ? 0 : used / drain;
                s.resources.insight -= used;
                s.resources.ink += r.copyInk * dt * frac;
                Grimoire.mark('resources');
            }
        }
        if (r.attendRunes > 0 && this.canAttend(s)) {
            s.page.attendAcc += r.attendRunes * dt;
            while (s.page.attendAcc >= 1) {
                if (!Grimoire.pages.finishRune(s, 'purple')) break;
                s.page.attendAcc -= 1;
            }
        }
    },

    catchUp: function (s, seconds) {
        if (seconds <= 0 || s.generators.quills <= 0) {
            return { insight: 0, ink: 0, runes: 0 };
        }
        var r = this.rates(s);
        var insight0 = s.resources.insight;
        var net = r.insight - r.copyDrain;
        var copyTime = seconds;
        if (r.copyDrain > 0 && net < 0) {
            copyTime = Math.min(seconds, insight0 / (r.copyDrain - r.insight));
            if (copyTime < 0) copyTime = 0;
        }
        var insightGain = r.insight * seconds;
        if (r.copyDrain > 0) {
            var drained = r.copyDrain * copyTime;
            insightGain -= drained;
        }
        if (insight0 + insightGain < 0) insightGain = -insight0;
        Grimoire.addInsight(s, Math.max(0, insightGain));
        if (insightGain < 0) {
            s.resources.insight = Math.max(0, s.resources.insight + insightGain);
        }
        var inkGain = r.copyInk * copyTime;
        s.resources.ink += inkGain;
        var runeGain = 0;
        if (r.attendRunes > 0 && this.canAttend(s)) {
            runeGain = r.attendRunes * seconds;
            Grimoire.pages.advanceSilent(s, runeGain);
        }
        Grimoire.mark('resources');
        return { insight: Math.max(0, insightGain), ink: inkGain, runes: runeGain };
    }
};
