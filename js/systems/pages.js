var Grimoire = window.Grimoire || (window.Grimoire = {});

Grimoire.RUNE_COORDS = [
    [2, 5], [2, 7], [2, 9], [2, 13], [2, 15], [2, 17],
    [4, 5], [4, 7], [4, 9], [4, 13], [4, 15], [4, 17],
    [6, 5], [6, 7], [6, 9], [6, 13], [6, 15], [6, 17],
    [8, 5], [8, 7], [8, 9], [8, 13], [8, 15], [8, 17],
    [2, 25], [2, 27], [2, 29], [2, 33], [2, 35], [2, 37],
    [4, 25], [4, 27], [4, 29], [4, 33], [4, 35], [4, 37],
    [6, 25], [6, 27], [6, 29], [6, 33], [6, 35], [6, 37],
    [8, 25], [8, 27], [8, 29], [8, 33], [8, 35], [8, 37]
];

Grimoire.pages = {
    // Sentences 1–3 take 5 pages (Study at 15). Later sentences stay 4 so Attend
    // pacing for 6 and 12 does not stretch. See GAME-BIBLE.md §6 / §16.
    pagesForSentence: function (n) {
        return n <= 3 ? 5 : 4;
    },

    pagesToReachSentence: function (count) {
        var t = 0;
        for (var i = 1; i <= count; i++) t += this.pagesForSentence(i);
        return t;
    },

    generate: function (s) {
        var count = s.page.pagesFinished === 0 ? 24 : 48;
        s.page.runesPerPage = count;
        s.page.runes = [];
        var pool = Grimoire.CONTENT.runePool;
        for (var i = 0; i < 48; i++) {
            if (i < count) {
                s.page.runes.push({
                    char: pool[Math.floor(Math.random() * pool.length)],
                    status: 'active',
                    flashLeft: 0
                });
            } else {
                s.page.runes.push({ char: '', status: 'empty', flashLeft: 0 });
            }
        }
        Grimoire.mark('page');
    },

    activeCount: function (s) {
        var n = 0;
        for (var i = 0; i < s.page.runes.length; i++) {
            if (s.page.runes[i].status === 'active') n++;
        }
        return n;
    },

    pendingCount: function (s) {
        var n = 0;
        for (var i = 0; i < s.page.runes.length; i++) {
            var st = s.page.runes[i].status;
            if (st === 'active' || st === 'flash-blue' || st === 'flash-purple') n++;
        }
        return n;
    },

    nextSentenceChar: function (s) {
        var list = Grimoire.CONTENT.sentences;
        var idx = Math.min(s.meta.sentencesCompleted, list.length - 1);
        var sentence = list[idx] || '';
        if (s.page.sentenceCharIndex >= sentence.length) return null;
        var ch = sentence.charAt(s.page.sentenceCharIndex);
        s.page.sentenceCharIndex += 1;
        return ch;
    },

    finishRune: function (s, color, opts) {
        opts = opts || {};
        if (!s.meta.candleLit || s.resources.oil <= 0) return false;
        var runes = s.page.runes;
        var target = null;
        for (var i = 0; i < runes.length; i++) {
            if (runes[i].status === 'active') {
                target = runes[i];
                break;
            }
        }
        if (!target) return false;
        target.status = color === 'purple' ? 'flash-purple' : 'flash-blue';
        target.flashLeft = opts.instant ? 0 : 0.4;
        if (opts.instant) this.resolveRune(s, target);
        Grimoire.mark('page');
        return true;
    },

    resolveRune: function (s, rune) {
        var now = Date.now();
        var denom = s.meta.stabilizeDenom || 4;
        var stabilize = Math.random() < (1 / denom);
        if (!s.meta.firstStable && s.page.pagesFinished >= 1 && now - s.meta.selfStableAt > 90000 && Math.random() < 0.02) {
            stabilize = true;
            s.meta.selfStableAt = now;
        }
        if (stabilize) {
            var ch = this.nextSentenceChar(s);
            if (ch !== null) {
                rune.char = ch === ' ' ? '·' : ch;
                rune.status = 'stable';
                if (ch !== ' ' && s.page.knownGraphemes.indexOf(ch) === -1) {
                    s.page.knownGraphemes += ch;
                }
                s.page.stableLettersLifetime += 1;
                if (!s.meta.firstStable) {
                    s.meta.firstStable = true;
                    Grimoire.log(s, 'a letter stays. the rest of the line does not.', { highlight: true });
                }
            } else {
                rune.status = 'faded';
            }
        } else {
            rune.status = 'faded';
        }
        s.page.runesFinishedLifetime += 1;
        rune.flashLeft = 0;
        Grimoire.mark('page');
        if (Grimoire.hasUnlock(s, 'index')) Grimoire.mark('resources');
        if (this.pendingCount(s) === 0) {
            this.completePage(s);
        }
    },

    completePage: function (s) {
        s.page.pagesFinished += 1;
        s.resources.passages += 1;
        Grimoire.mark('resources', 'projects', 'page');
        var needed = this.pagesToReachSentence(s.meta.sentencesCompleted + 1);
        if (s.page.pagesFinished >= needed && s.meta.sentencesCompleted < Grimoire.CONTENT.sentences.length) {
            var text = Grimoire.CONTENT.sentences[s.meta.sentencesCompleted];
            s.meta.sentencesCompleted += 1;
            s.page.sentenceCharIndex = 0;
            Grimoire.log(s, text, { highlight: true, typewriter: true });
            if (s.meta.sentencesCompleted === 6) {
                s.meta.distillMutated = true;
                Grimoire.mark('buttons');
            }
            Grimoire.mark('codex', 'subhead', 'layout');
        }
        s.page.turningUntil = Date.now() + 300;
        this.generate(s);
        if (s.page.pagesFinished === 1) {
            Grimoire.log(s, 'you turn the leaf. unread marks wait on the next.', { highlight: true });
        }
    },

    tickFlashes: function (s, dt) {
        var runes = s.page.runes;
        for (var i = 0; i < runes.length; i++) {
            if (runes[i].flashLeft > 0) {
                runes[i].flashLeft -= dt;
                if (runes[i].flashLeft <= 0) {
                    this.resolveRune(s, runes[i]);
                }
            }
        }
    },

    advanceSilent: function (s, count) {
        var n = Math.floor(count);
        for (var i = 0; i < n; i++) {
            if (!this.finishRune(s, 'purple', { instant: true })) break;
        }
        return n;
    },

    decipherClick: function (s) {
        if (!s.meta.candleLit || s.resources.oil <= 0) return false;
        if (s.meta.emberUntil && Date.now() < s.meta.emberUntil) return false;
        var per = 1 + 0.1 * (s.generators.nibs || 0);
        if (s.meta.pressOnceLeft > 0) {
            per += 1;
            s.meta.pressOnceLeft -= 1;
        }
        Grimoire.addInsight(s, per);
        var now = Date.now();
        if (s.page.pagesFinished >= 1 && now - s.meta.echoAt > 45000 && Math.random() < 0.04) {
            Grimoire.addInsight(s, 1);
            s.meta.echoAt = now;
            Grimoire.log(s, 'the mark answers twice.');
        }
        this.finishRune(s, 'blue');
        Grimoire.mark('buttons');
        return true;
    }
};
