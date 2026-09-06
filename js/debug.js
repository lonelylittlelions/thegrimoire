/* DEBUG BUILD — remove this file and its script tag before shipping. */
var Grimoire = window.Grimoire || (window.Grimoire = {});
Grimoire.DEBUG = true;

Grimoire.debug = {
    freezeOil: false,
    panel: null,
    fab: null,
    hidden: false,
    titleTaps: 0,
    titleTapTimer: 0,

    mount: function () {
        if (this.panel) return;
        document.documentElement.classList.add('debug-build');
        var wrap = document.createElement('div');
        wrap.id = 'debug-panel';
        wrap.setAttribute('role', 'region');
        wrap.setAttribute('aria-label', 'Debug panel');
        wrap.innerHTML =
            '<div class="debug-head"><strong>debug</strong> <span>strip js/debug.js to ship</span>' +
            '<button type="button" id="debug-hide">hide</button></div>' +
            '<div class="debug-row">' +
            '<button type="button" data-dbg="insight">+20 Insight</button>' +
            '<button type="button" data-dbg="tallow">+20 Tallow</button>' +
            '<button type="button" data-dbg="ink">+10 Ink</button>' +
            '<button type="button" data-dbg="passages">+4 Passages</button>' +
            '<button type="button" data-dbg="lexicons">+1 Lexicon</button>' +
            '</div>' +
            '<div class="debug-row">' +
            '<button type="button" data-dbg="fillOil">Fill oil</button>' +
            '<button type="button" data-dbg="killOil">Kill oil</button>' +
            '<button type="button" data-dbg="freeze">Freeze oil</button>' +
            '<button type="button" data-dbg="quill">+1 Quill</button>' +
            '</div>' +
            '<div class="debug-row">' +
            '<button type="button" data-dbg="flame">Name flame</button>' +
            '<button type="button" data-dbg="catalog">Catalog</button>' +
            '<button type="button" data-dbg="study">Jump Study</button>' +
            '<button type="button" data-dbg="sentence">+1 Sentence</button>' +
            '<button type="button" data-dbg="shutters">Shutters</button>' +
            '</div>' +
            '<div class="debug-row">' +
            '<button type="button" data-dbg="minute">+1 min</button>' +
            '<button type="button" data-dbg="season">Next season</button>' +
            '<button type="button" data-dbg="settings">Open settings</button>' +
            '<button type="button" data-dbg="reset">Reset run</button>' +
            '</div>' +
            '<p class="debug-foot">Tap dbg (top left), or F2 / Ctrl+Shift+D. Five taps on the title also works.</p>';
        document.body.appendChild(wrap);
        var fab = document.createElement('button');
        fab.type = 'button';
        fab.id = 'debug-fab';
        fab.textContent = 'dbg';
        fab.setAttribute('aria-label', 'Toggle debug panel');
        document.body.appendChild(fab);
        this.panel = wrap;
        this.fab = fab;
        this.hidden = false;
        this.injectCss();
        this.home();
        this.syncFab();
        var self = this;
        fab.addEventListener('click', function (e) {
            e.preventDefault();
            self.toggle();
        });
        wrap.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-dbg]');
            if (btn) self.run(btn.getAttribute('data-dbg'));
            if (e.target.closest('#debug-hide')) self.hide();
        });
        document.addEventListener('click', function (e) {
            var el = e.target;
            if (!el || !el.closest) return;
            if (!el.closest('h1') && !el.closest('.boot-title')) return;
            self.onTitleTap();
        });
        document.addEventListener('keydown', function (e) {
            if (!self.isToggleKey(e)) return;
            var tag = (e.target && e.target.tagName) || '';
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            e.preventDefault();
            self.toggle();
        }, true);
    },

    onTitleTap: function () {
        var self = this;
        this.titleTaps += 1;
        clearTimeout(this.titleTapTimer);
        if (this.titleTaps >= 5) {
            this.titleTaps = 0;
            this.show();
            return;
        }
        this.titleTapTimer = setTimeout(function () { self.titleTaps = 0; }, 900);
    },

    syncFab: function () {
        if (!this.fab) return;
        this.fab.setAttribute('aria-expanded', this.hidden ? 'false' : 'true');
        this.fab.classList.toggle('is-open', !this.hidden);
    },

    isToggleKey: function (e) {
        if (e.altKey) return false;
        if (e.key === 'F2' || e.code === 'F2') return !e.ctrlKey && !e.metaKey && !e.shiftKey;
        if (e.code === 'Backquote' && !e.ctrlKey && !e.metaKey && !e.shiftKey) return true;
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'd' || e.key === 'D' || e.code === 'KeyD')) {
            return true;
        }
        return false;
    },

    home: function () {
        var wrap = this.panel;
        if (!wrap) return;
        wrap.style.left = '';
        wrap.style.top = '';
        wrap.style.right = '';
        wrap.style.bottom = '';
        wrap.style.width = '';
        wrap.style.height = '';
        wrap.style.transform = '';
    },

    hide: function () {
        if (!this.panel) return;
        this.hidden = true;
        this.panel.classList.add('debug-hidden');
        this.panel.setAttribute('aria-hidden', 'true');
        this.home();
        this.syncFab();
    },

    show: function () {
        if (!this.panel) return;
        this.hidden = false;
        this.panel.classList.remove('debug-hidden');
        this.panel.removeAttribute('aria-hidden');
        this.home();
        this.syncFab();
    },

    toggle: function () {
        if (this.hidden) this.show();
        else this.hide();
    },

    injectCss: function () {
        if (document.getElementById('debug-css')) return;
        var css = document.createElement('style');
        css.id = 'debug-css';
        css.textContent =
            '#debug-fab{position:fixed;top:max(8px,env(safe-area-inset-top,0px));left:8px;z-index:210;' +
            'min-width:44px;min-height:44px;margin:0;padding:6px 10px;border:1px solid #f5a623;background:#120e18;' +
            'color:#f5a623;font:12px/1 "Courier New",monospace;box-shadow:0 4px 12px rgba(0,0,0,.5)}' +
            '#debug-fab.is-open{background:#2a1c08}' +
            '#debug-panel{position:fixed;right:8px;bottom:8px;z-index:200;width:min(360px,calc(100vw - 16px));' +
            'background:#120e18;border:1px solid #f5a623;color:#d4cece;font:12px/1.3 "Courier New",monospace;' +
            'padding:8px;box-shadow:0 8px 24px rgba(0,0,0,.6);max-height:calc(100dvh - 120px);overflow:auto}' +
            '#debug-panel.debug-hidden{display:none!important}' +
            '@media (max-width:899px){#debug-panel{left:8px;right:8px;width:auto;' +
            'bottom:calc(92px + env(safe-area-inset-bottom,0px));max-height:calc(100dvh - 180px)}}' +
            '.debug-head{display:flex;gap:8px;align-items:center;margin-bottom:6px;color:#f5a623}' +
            '.debug-head span{color:#888;font-size:10px;flex:1}' +
            '.debug-row{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px}' +
            '#debug-panel button{margin:0;padding:8px 10px;font-size:12px;min-height:40px}' +
            '.debug-foot{margin:6px 0 0;color:#666;font-size:10px}';
        document.head.appendChild(css);
    },

    s: function () { return Grimoire.state; },

    bump: function (key, n) {
        var s = this.s();
        s.resources[key] += n;
        if (key === 'insight') s.meta.totalInsightEarned += n;
        Grimoire.projects.tickAutos(s);
        Grimoire.mark('resources', 'projects', 'buttons', 'layout', 'candle', 'vignette');
    },

    run: function (cmd) {
        var s = this.s();
        var cap = Grimoire.candle.oilCap(s);
        switch (cmd) {
            case 'insight': this.bump('insight', 20); break;
            case 'tallow': this.bump('tallow', 20); break;
            case 'ink': this.bump('ink', 10); break;
            case 'passages': this.bump('passages', 4); break;
            case 'lexicons': this.bump('lexicons', 1); break;
            case 'fillOil':
                s.meta.deskRevealed = true;
                s.resources.oil = cap;
                s.meta.candleLit = true;
                s.meta.oilEmptyLogged = false;
                Grimoire.mark('candle', 'vignette', 'resources', 'buttons', 'layout');
                break;
            case 'killOil':
                s.meta.deskRevealed = true;
                s.resources.oil = 0;
                Grimoire.candle.extinguish(s);
                Grimoire.mark('layout');
                break;
            case 'freeze':
                this.freezeOil = !this.freezeOil;
                Grimoire.log(s, this.freezeOil ? 'debug: oil freeze on.' : 'debug: oil freeze off.');
                break;
            case 'quill':
                s.generators.quills = Math.min(12, s.generators.quills + 1);
                Grimoire.jobs.syncNewQuills(s);
                Grimoire.mark('resources', 'jobs');
                break;
            case 'flame':
                s.meta.deskRevealed = true;
                s.meta.candleLit = true;
                if (!Grimoire.hasUnlock(s, 'name_flame')) {
                    s.meta.totalInsightEarned = Math.max(s.meta.totalInsightEarned, 8);
                    Grimoire.projects.tickAutos(s);
                }
                break;
            case 'catalog':
                if (!Grimoire.hasUnlock(s, 'catalog_page')) {
                    s.resources.passages = Math.max(s.resources.passages, 1);
                    Grimoire.projects.buy(s, 'catalog_page');
                }
                break;
            case 'study':
                this.jumpStudy(s);
                break;
            case 'sentence':
                this.addSentence(s);
                break;
            case 'shutters':
                this.jumpShutters(s);
                break;
            case 'minute':
                s.meta.playMs += 60000;
                Grimoire.mark('layout', 'settings');
                break;
            case 'season':
                s.meta.season = (s.meta.season + 1) % 4;
                s.meta.seasonTick = 0;
                Grimoire.log(s, Grimoire.CONTENT.seasonLines[Grimoire.CONTENT.seasons[s.meta.season]], { highlight: true });
                break;
            case 'settings':
                s.meta.settingsUnlocked = true;
                Grimoire.view.openSettings();
                break;
            case 'reset':
                Grimoire.restartRun();
                return;
            default:
                break;
        }
        Grimoire.projects.tickAutos(s);
    },

    jumpStudy: function (s) {
        s.meta.deskRevealed = true;
        s.meta.candleLit = true;
        s.meta.totalInsightEarned = Math.max(s.meta.totalInsightEarned, 8);
        Grimoire.projects.tickAutos(s);
        if (!Grimoire.hasUnlock(s, 'catalog_page')) {
            s.resources.passages = Math.max(1, s.resources.passages);
            Grimoire.addUnlock(s, 'catalog_page');
        }
        s.page.pagesFinished = Math.max(12, s.page.pagesFinished);
        s.meta.sentencesCompleted = Math.max(3, s.meta.sentencesCompleted);
        s.resources.ink = Math.max(20, s.resources.ink);
        s.resources.passages = Math.max(4, s.resources.passages);
        Grimoire.projects.tickAutos(s);
        s.meta.activeTab = 'study';
        Grimoire.markAll();
        Grimoire.log(s, 'debug: the door is treated as bolted.', { highlight: true });
    },

    addSentence: function (s) {
        if (s.meta.sentencesCompleted >= Grimoire.CONTENT.sentences.length) return;
        s.page.pagesFinished = Math.max(s.page.pagesFinished, (s.meta.sentencesCompleted + 1) * 4);
        var text = Grimoire.CONTENT.sentences[s.meta.sentencesCompleted];
        s.meta.sentencesCompleted += 1;
        Grimoire.log(s, text, { highlight: true, typewriter: true });
        if (s.meta.sentencesCompleted === 6) s.meta.distillMutated = true;
        Grimoire.projects.tickAutos(s);
        Grimoire.mark('codex', 'subhead', 'layout', 'buttons');
    },

    jumpShutters: function (s) {
        this.jumpStudy(s);
        s.meta.sentencesCompleted = Math.max(6, s.meta.sentencesCompleted);
        s.resources.lexicons = Math.max(3, s.resources.lexicons);
        Grimoire.addUnlock(s, 'collation');
        if (!s.meta.shuttersOpen) {
            Grimoire.projects.apply(s, Grimoire.projects.byId('open_shutters'));
        }
        Grimoire.markAll();
    }
};
