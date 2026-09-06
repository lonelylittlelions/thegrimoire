var Grimoire = window.Grimoire || (window.Grimoire = {});

Grimoire.view = {
    els: {},
    runeSpans: [],
    typeQueue: [],
    typing: false,
    typeTimer: null,
    lastLogCount: 0,
    lastFlameFrame: -1,
    lastStage: '',
    flameFrame: 0,
    flameColor: 0,
    flameAcc: 0,
    asciiFrame: 0,
    asciiAcc: 0,
    reducedMotion: false,
    LOG_KEEP: 7,
    hintAnchor: null,
    hintPinned: false,
    hintDock: false,
    hintTouch: false,

    bind: function () {
        var self = this;
        var $ = function (id) { return document.getElementById(id); };
        this.els = {
            shell: $('game-shell'),
            layout: $('layout'),
            ledger: $('ledger'),
            subhead: $('subheading'),
            tablist: $('tablist'),
            tabDesk: $('tab-desk'),
            tabStudy: $('tab-study'),
            tabEstate: $('tab-estate'),
            tabBinding: $('tab-binding'),
            panelDesk: $('panel-desk'),
            panelStudy: $('panel-study'),
            panelEstate: $('panel-estate'),
            panelBinding: $('panel-binding'),
            runeOverlay: $('rune-overlay'),
            viewport: $('grimoire-viewport'),
            deskStage: $('desk-stage'),
            candleArt: $('candle-art'),
            candleContainer: $('candle-container'),
            candleSmoke: $('candle-smoke'),
            candleDrip: $('candle-drip'),
            journal: $('journal-log'),
            ariaLive: $('aria-live'),
            candleMeter: $('candle-readout'),
            btnDecipher: $('btn-decipher'),
            btnTrim: $('btn-trim'),
            btnDistill: $('btn-distill'),
            btnLexicon: $('btn-lexicon'),
            projectList: $('project-list'),
            projectListStudy: $('project-list-study'),
            jobPanel: $('job-panel'),
            jobRows: $('job-rows'),
            btnSettings: $('btn-settings'),
            settingsModal: $('settings-modal'),
            settingsBackdrop: $('settings-backdrop'),
            chkMotion: $('chk-reduce-motion'),
            chkBleed: $('chk-disable-bleed'),
            chkFlicker: $('chk-disable-flicker'),
            chkExact: $('chk-show-exact'),
            exportBox: $('export-box'),
            importBox: $('import-box'),
            btnExport: $('btn-export'),
            btnImport: $('btn-import'),
            btnCloseSettings: $('btn-close-settings'),
            abandonInput: $('abandon-input'),
            abandonErr: $('abandon-err'),
            btnAbandon: $('btn-abandon'),
            checksumWarn: $('checksum-warn'),
            btnExportCorrupt: $('btn-export-corrupt'),
            vignette: $('vignette'),
            doubt: $('btn-doubt'),
            codex: $('codex-list'),
            estateMap: $('estate-map'),
            estateInterior: $('estate-interior'),
            estateLead: $('estate-lead'),
            estateProjects: $('estate-projects'),
            houseQuillStudy: $('house-quill-study'),
            houseQuillEstate: $('house-quill-estate'),
            studyStage: $('study-stage'),
            studyArt: $('study-art'),
            bindingNote: $('binding-note'),
            hintCard: $('hint-card'),
            hintCardText: $('hint-card-text'),
            hintDismiss: $('hint-card-dismiss'),
            bootVeil: $('boot-veil'),
            btnLight: $('btn-light'),
            darkActs: $('dark-acts'),
            btnStrike: $('btn-strike'),
            btnTrimDark: $('btn-trim-dark'),
            btnSitDark: $('btn-sit-dark')
        };
        this.settingsFocusBefore = null;
        this.buildRuneSlots();
        this.bindEvents();
        this.syncHintMode();
        this.bindHints();
        this.syncMotionPref();
        if (window.matchMedia) {
            var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
            var onMotion = function () { self.syncMotionPref(); };
            if (mq.addEventListener) mq.addEventListener('change', onMotion);
            else if (mq.addListener) mq.addListener(onMotion);
            var onHintMq = function () {
                self.syncHintMode();
                self.refitHint();
            };
            var mqNarrow = window.matchMedia('(max-width: 899px)');
            var mqHover = window.matchMedia('(hover: none)');
            if (mqNarrow.addEventListener) {
                mqNarrow.addEventListener('change', onHintMq);
                mqHover.addEventListener('change', onHintMq);
            } else if (mqNarrow.addListener) {
                mqNarrow.addListener(onHintMq);
                mqHover.addListener(onHintMq);
            }
        }
    },

    hydrateLog: function (s) {
        this.els.journal.innerHTML = '';
        var start = Math.max(0, s.log.length - this.LOG_KEEP);
        for (var i = start; i < s.log.length; i++) {
            var choices = (i === s.log.length - 1 && s.meta.pendingChoice) ? s.log[i].choices : null;
            this.paintLog({
                text: s.log[i].text,
                highlight: s.log[i].highlight,
                choices: choices
            }, true);
        }
        this.lastLogCount = s.log.length;
    },

    buildRuneSlots: function () {
        var overlay = this.els.runeOverlay;
        overlay.innerHTML = '';
        this.runeSpans = [];
        for (var i = 0; i < 48; i++) {
            var span = document.createElement('span');
            span.className = 'rune-slot rune-empty';
            var coord = Grimoire.RUNE_COORDS[i];
            span.style.top = (coord[0] * 1.2).toFixed(2) + 'em';
            span.style.left = coord[1] + 'ch';
            overlay.appendChild(span);
            this.runeSpans.push(span);
        }
    },

    bindEvents: function () {
        var self = this;
        var s = function () { return Grimoire.state; };

        this.els.btnLight.addEventListener('click', function () {
            if (Grimoire.candle.lightFromBoot(s()) && self.els.btnDecipher) {
                self.els.btnDecipher.focus();
            }
        });
        this.els.btnDecipher.addEventListener('click', function () {
            Grimoire.pages.decipherClick(s());
            Grimoire.projects.tickAutos(s());
        });
        this.els.btnTrim.addEventListener('click', function () {
            Grimoire.candle.trim(s());
        });
        this.els.btnStrike.addEventListener('click', function () {
            self.onChoice('match');
        });
        this.els.btnTrimDark.addEventListener('click', function () {
            if (Grimoire.candle.trim(s())) {
                var entries = self.els.journal.querySelectorAll('.log-choices');
                for (var i = 0; i < entries.length; i++) entries[i].remove();
            }
        });
        this.els.btnSitDark.addEventListener('click', function () {
            self.onChoice('sit');
        });
        this.els.btnDistill.addEventListener('click', function () {
            Grimoire.candle.distill(s());
            Grimoire.projects.tickAutos(s());
        });
        this.els.btnLexicon.addEventListener('click', function () {
            Grimoire.projects.bindLexicon(s());
        });
        this.els.btnSettings.addEventListener('click', function () {
            self.openSettings();
        });
        this.els.btnCloseSettings.addEventListener('click', function () {
            self.closeSettings();
        });
        this.els.settingsBackdrop.addEventListener('click', function () {
            self.closeSettings();
        });
        this.els.chkMotion.addEventListener('change', function () {
            s().settings.reduceMotion = self.els.chkMotion.checked;
            self.syncMotionPref();
            Grimoire.saveToStorage(s());
        });
        this.els.chkBleed.addEventListener('change', function () {
            s().settings.disableBleedFx = self.els.chkBleed.checked;
            Grimoire.saveToStorage(s());
        });
        this.els.chkFlicker.addEventListener('change', function () {
            s().settings.disableFlicker = self.els.chkFlicker.checked;
            Grimoire.saveToStorage(s());
        });
        this.els.chkExact.addEventListener('change', function () {
            s().settings.showExact = self.els.chkExact.checked;
            Grimoire.mark('projects');
            Grimoire.saveToStorage(s());
        });
        this.els.btnExport.addEventListener('click', function () {
            self.els.exportBox.value = Grimoire.exportPayload(s());
            self.els.exportBox.select();
        });
        this.els.btnImport.addEventListener('click', function () {
            try {
                var next = Grimoire.importSave(self.els.importBox.value);
                Grimoire.state = next;
                Grimoire.saveToStorage(next);
                self.hydrateLog(next);
                Grimoire.markAll();
                Grimoire.log(next, 'the copy takes. the desk is as it was.');
                self.closeSettings();
            } catch (err) {
                Grimoire.log(s(), 'the import does not take. the last good page remains.');
            }
        });
        this.els.btnAbandon.addEventListener('click', function () {
            if (self.els.abandonInput.value.trim().toUpperCase() !== 'ABANDON') {
                if (self.els.abandonErr) {
                    self.els.abandonErr.textContent = 'the word is ABANDON. the copy remains.';
                    self.els.abandonErr.classList.remove('hidden');
                }
                self.els.abandonInput.focus();
                return;
            }
            Grimoire.restartRun();
        });
        this.els.btnExportCorrupt.addEventListener('click', function () {
            self.els.exportBox.value = s().meta.corruptRaw || Grimoire.exportPayload(s());
            self.els.exportBox.select();
        });
        this.els.doubt.addEventListener('click', function () {
            Grimoire.bleed.clickDoubt(s());
        });

        this.els.tabDesk.addEventListener('click', function () { self.switchTab('desk'); });
        this.els.tabStudy.addEventListener('click', function () { self.switchTab('study'); });
        this.els.tabEstate.addEventListener('click', function () { self.switchTab('estate'); });

        this.els.projectList.addEventListener('click', function (e) {
            self.onProjectClick(e);
        });
        this.els.projectListStudy.addEventListener('click', function (e) {
            self.onProjectClick(e);
        });
        if (this.els.estateProjects) {
            this.els.estateProjects.addEventListener('click', function (e) {
                self.onProjectClick(e);
            });
        }
        if (this.els.estateMap) {
            this.els.estateMap.addEventListener('click', function (e) {
                var btn = e.target.closest('[data-room]');
                if (!btn || btn.tagName !== 'BUTTON') return;
                Grimoire.estate.walk(s(), btn.getAttribute('data-room'));
            });
        }
        var onHouseQuill = function (e) {
            var btn = e.target.closest('button');
            if (!btn) return;
            var send = btn.getAttribute('data-send');
            if (send) Grimoire.estate.dispatch(s(), send);
            if (btn.getAttribute('data-recall') === '1') Grimoire.estate.recall(s());
        };
        if (this.els.houseQuillStudy) this.els.houseQuillStudy.addEventListener('click', onHouseQuill);
        if (this.els.houseQuillEstate) this.els.houseQuillEstate.addEventListener('click', onHouseQuill);
        if (this.els.estateInterior) {
            this.els.estateInterior.addEventListener('click', function (e) {
                var btn = e.target.closest('button');
                if (!btn) return;
                var start = btn.getAttribute('data-start');
                if (start) Grimoire.estate.startBatch(s(), start);
                var send = btn.getAttribute('data-send');
                if (send) Grimoire.estate.dispatch(s(), send);
                if (btn.getAttribute('data-recall') === '1') Grimoire.estate.recall(s());
                if (btn.getAttribute('data-take-find') === '1') Grimoire.estate.takeFind(s());
                if (btn.getAttribute('data-listen') === '1') Grimoire.estate.listen(s());
                if (btn.getAttribute('data-drawer') === '1') Grimoire.estate.openDrawer(s());
                var salvage = btn.getAttribute('data-salvage');
                if (salvage) Grimoire.estate.salvageBatch(s(), salvage);
                var dump = btn.getAttribute('data-dump');
                if (dump) Grimoire.estate.dumpBatch(s(), dump);
            });
        }
        this.els.jobRows.addEventListener('click', function (e) {
            var btn = e.target.closest('button');
            if (!btn) return;
            var job = btn.getAttribute('data-job');
            var delta = btn.getAttribute('data-delta') === '+' ? 1 : -1;
            Grimoire.jobs.shift(s(), job, delta);
        });
        this.els.journal.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-choice]');
            if (btn) self.onChoice(btn.getAttribute('data-choice'));
            else self.skipTypewriter();
        });

        window.addEventListener('resize', function () {
            Grimoire.dirty.vignette = true;
            self.syncHintMode();
            self.refitHint();
            self.fitDesk();
        });

        document.addEventListener('keydown', function (e) {
            var modalOpen = self.els.settingsModal && !self.els.settingsModal.classList.contains('hidden');
            if (modalOpen && e.key === 'Tab') {
                self.trapSettingsTab(e);
                return;
            }
            if (e.key === 'Escape') {
                self.closeSettings();
                self.hideHint();
                return;
            }
            var tag = (e.target && e.target.tagName) || '';
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            self.skipTypewriter();
            if (e.key === 'd' || e.key === 'D') {
                if (!s().meta.deskRevealed) return;
                if (!self.els.btnDecipher.classList.contains('hidden')) {
                    Grimoire.pages.decipherClick(s());
                    Grimoire.projects.tickAutos(s());
                }
            }
            if (e.key === 'w' || e.key === 'W') {
                var st = s();
                if (!st.meta.deskRevealed) return;
                var drowned = !st.meta.candleLit || st.resources.oil <= 0;
                if (drowned) {
                    if (self.els.btnTrimDark && !self.els.btnTrimDark.classList.contains('hidden') && !self.els.btnTrimDark.disabled) {
                        Grimoire.candle.trim(st);
                    }
                } else if (!self.els.btnTrim.classList.contains('hidden')) {
                    Grimoire.candle.trim(st);
                }
            }
            var estateState = s();
            if (!modalOpen && estateState && estateState.meta.activeTab === 'estate' && estateState.meta.shuttersOpen) {
                var dir = null;
                if (e.key === 'ArrowUp') dir = 'n';
                if (e.key === 'ArrowDown') dir = 's';
                if (e.key === 'ArrowLeft') dir = 'w';
                if (e.key === 'ArrowRight') dir = 'e';
                if (dir) {
                    e.preventDefault();
                    Grimoire.estate.walkDir(estateState, dir);
                }
            }
        });
    },

    onProjectClick: function (e) {
        if (e.target.closest && e.target.closest('.project-info')) return;
        var btn = e.target.closest('button.project-buy');
        if (!btn || btn.disabled) return;
        Grimoire.projects.buy(Grimoire.state, btn.getAttribute('data-project'));
    },

    onChoice: function (id) {
        var s = Grimoire.state;
        if (id === 'match') Grimoire.candle.strikeMatch(s);
        if (id === 'sit') Grimoire.candle.sitInDark(s);
        var entries = this.els.journal.querySelectorAll('.log-choices');
        for (var i = 0; i < entries.length; i++) entries[i].remove();
    },

    switchTab: function (tab) {
        var s = Grimoire.state;
        s.meta.activeTab = tab;
        Grimoire.mark('tabs', 'layout', 'projects', 'jobs', 'estate', 'study');
        if (tab === 'estate' && s.meta.shuttersOpen) {
            if (!s.meta.estateRoom) s.meta.estateRoom = 'hall';
            if (Grimoire.estate) Grimoire.estate.ensure(s);
            if (!s.meta.estateVisited) {
                s.meta.estateVisited = true;
                Grimoire.log(s, Grimoire.CONTENT.estateVisit, { highlight: true, typewriter: true });
            }
        }
        var focusMap = {
            desk: this.els.btnDecipher,
            study: this.els.jobRows.querySelector('button'),
            estate: this.els.estateMap
        };
        var el = focusMap[tab];
        if (el && typeof el.focus === 'function') el.focus();
    },

    syncMotionPref: function () {
        var s = Grimoire.state;
        var sys = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.reducedMotion = !!(s && s.settings.reduceMotion) || sys;
        var flickerOff = this.reducedMotion || !!(s && s.settings.disableFlicker);
        document.documentElement.classList.toggle('reduce-motion', this.reducedMotion);
        document.documentElement.classList.toggle('no-flicker', flickerOff);
        if (this.reducedMotion) this.skipTypewriter();
    },

    openSettings: function () {
        var s = Grimoire.state;
        this.hideHint();
        this.settingsFocusBefore = document.activeElement;
        this.els.chkMotion.checked = s.settings.reduceMotion;
        this.els.chkBleed.checked = s.settings.disableBleedFx;
        this.els.chkFlicker.checked = s.settings.disableFlicker;
        this.els.chkExact.checked = !!s.settings.showExact;
        this.els.exportBox.value = '';
        this.els.importBox.value = '';
        this.els.abandonInput.value = '';
        if (this.els.abandonErr) {
            this.els.abandonErr.textContent = '';
            this.els.abandonErr.classList.add('hidden');
        }
        this.els.checksumWarn.classList.toggle('hidden', !s.meta.checksumWarn);
        this.els.settingsModal.classList.remove('hidden');
        this.els.settingsBackdrop.classList.remove('hidden');
        this.els.btnCloseSettings.focus();
        Grimoire.mark('settings');
    },

    closeSettings: function () {
        this.els.settingsModal.classList.add('hidden');
        this.els.settingsBackdrop.classList.add('hidden');
        this.hideHint();
        var prev = this.settingsFocusBefore;
        this.settingsFocusBefore = null;
        if (prev && typeof prev.focus === 'function' && document.body.contains(prev)) prev.focus();
    },

    trapSettingsTab: function (e) {
        var root = this.els.settingsModal;
        if (!root) return;
        var nodes = root.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled])');
        if (!nodes.length) return;
        var first = nodes[0];
        var last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    },

    resolveHint: function (el) {
        if (!el) return '';
        var key = el.getAttribute('data-hint');
        if (!key) return '';
        if (key === 'project') {
            var id = el.getAttribute('data-project') || (el.querySelector('[data-project]') && el.querySelector('[data-project]').getAttribute('data-project'));
            if (el.classList.contains('dim')) return Grimoire.CONTENT.hints.tease;
            return (Grimoire.CONTENT.projectHints && Grimoire.CONTENT.projectHints[id]) || '';
        }
        if (key === 'job') {
            var job = el.getAttribute('data-job-hint');
            return (Grimoire.CONTENT.jobs[job] && Grimoire.CONTENT.jobs[job].hint) || '';
        }
        var hints = Grimoire.CONTENT.hints || {};
        if (key === 'distill' && Grimoire.state && Grimoire.state.meta.distillMutated) {
            return hints.distillMutated;
        }
        return hints[key] || '';
    },

    syncHintMode: function () {
        var narrow = window.matchMedia && window.matchMedia('(max-width: 899px)').matches;
        var noHover = window.matchMedia && window.matchMedia('(hover: none)').matches;
        this.hintDock = !!(narrow || noHover);
        this.hintTouch = this.hintDock;
        var html = document.documentElement;
        html.classList.toggle('hint-dock', this.hintDock);
        html.classList.toggle('hint-touch', this.hintTouch);
    },

    hintTextOf: function (card) {
        return (this.els.hintCardText || card).textContent;
    },

    bindHints: function () {
        var self = this;
        var showFrom = function (target) {
            var el = target && target.closest ? target.closest('[data-hint]') : null;
            if (!el) {
                self.hideHint();
                return;
            }
            if (el.closest('#settings-modal') && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')) {
                self.hideHint();
                return;
            }
            var text = self.resolveHint(el);
            if (!text) {
                self.hideHint();
                return;
            }
            self.showHint(el, text);
        };
        document.addEventListener('pointerover', function (e) {
            if (self.hintTouch) return;
            showFrom(e.target);
        });
        document.addEventListener('pointerout', function (e) {
            if (self.hintTouch) return;
            var to = e.relatedTarget;
            if (to && to.nodeType === 1 && to.closest && to.closest('[data-hint]')) {
                showFrom(to);
                return;
            }
            if (to && to.nodeType === 1 && (to.id === 'hint-card' || (to.closest && to.closest('#hint-card')))) return;
            self.hideHint();
        });
        document.addEventListener('focusin', function (e) {
            if (self.hintTouch) return;
            showFrom(e.target);
        });
        document.addEventListener('focusout', function () {
            if (self.hintTouch) return;
            self.hideHint();
        });
        document.addEventListener('click', function (e) {
            if (!self.hintTouch) return;
            var t = e.target;
            if (!t || !t.closest) return;
            if (t.closest('#settings-modal') || t.closest('#settings-backdrop')) return;
            if (t.closest('#hint-card')) {
                self.hideHint();
                return;
            }
            var info = t.closest('.project-info');
            if (info) {
                e.preventDefault();
                e.stopPropagation();
                self.toggleHint(info.closest('.project-row') || info);
                return;
            }
            if (t.closest('button, a, input, textarea, select, [role="tab"]')) {
                if (self.hintPinned) self.hideHint();
                return;
            }
            var hintEl = t.closest('[data-hint]');
            if (hintEl && !hintEl.closest('.job-row')) {
                self.toggleHint(hintEl);
                return;
            }
            if (self.hintPinned) self.hideHint();
        }, true);
        if (this.els.hintDismiss) {
            this.els.hintDismiss.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                self.hideHint();
            });
        }
    },

    toggleHint: function (el) {
        if (!el) return;
        if (this.hintPinned && this.hintAnchor === el) {
            this.hideHint();
            return;
        }
        var text = this.resolveHint(el);
        if (!text) {
            this.hideHint();
            return;
        }
        this.hintPinned = true;
        this.showHint(el, text);
    },

    refitHint: function () {
        if (!this.hintAnchor || !this.els.hintCard || !this.els.hintCard.classList.contains('is-on')) return;
        var text = this.resolveHint(this.hintAnchor) || this.hintTextOf(this.els.hintCard);
        var anchor = this.hintAnchor;
        var pinned = this.hintPinned;
        this.hintAnchor = null;
        this.showHint(anchor, text);
        this.hintPinned = pinned;
    },

    placeDockedHint: function (card) {
        card.style.left = '';
        card.style.top = '';
        card.style.bottom = '';
        if (document.documentElement.classList.contains('candle-drowned')) return;
        if (!document.documentElement.classList.contains('on-desk')) return;
        var acts = document.getElementById('action-buttons');
        var panel = document.getElementById('panel-desk');
        if (!acts || (panel && panel.classList.contains('hidden'))) return;
        var h = acts.offsetHeight;
        if (!h) return;
        card.style.bottom = (h + 8) + 'px';
    },

    showHint: function (anchor, text) {
        var card = this.els.hintCard;
        var body = this.els.hintCardText || card;
        if (!card || !anchor) return;
        if (this.hintAnchor === anchor && body.textContent === text && card.classList.contains('is-on')) return;
        this.hintAnchor = anchor;
        body.textContent = text;
        card.classList.toggle('is-docked', !!this.hintDock);
        if (this.els.hintDismiss) this.els.hintDismiss.classList.toggle('hidden', !this.hintDock);
        card.classList.remove('hidden');
        document.documentElement.classList.toggle('hint-open', !!this.hintDock);
        if (this.hintDock) {
            this.placeDockedHint(card);
            card.classList.add('is-on');
            return;
        }
        card.classList.remove('is-on');
        card.style.left = '-9999px';
        card.style.top = '0px';
        var r = anchor.getBoundingClientRect();
        var pad = 10;
        var cw = card.offsetWidth || 280;
        var ch = card.offsetHeight || 40;
        var left;
        var top;
        var project = anchor.getAttribute('data-hint') === 'project' || !!(anchor.closest && anchor.closest('.project-list'));
        if (project) {
            left = r.left - cw - pad;
            top = r.top;
            if (left < 8) left = r.right + pad;
            if (left + cw > window.innerWidth - 8) left = window.innerWidth - cw - 8;
            if (left < 8) left = 8;
            if (top + ch > window.innerHeight - 8) top = window.innerHeight - ch - 8;
            if (top < 8) top = 8;
        } else {
            left = r.left;
            top = r.bottom + pad;
            if (left + cw > window.innerWidth - 12) left = window.innerWidth - cw - 12;
            if (left < 8) left = 8;
            if (top + ch > window.innerHeight - 8) top = r.top - ch - pad;
            if (top < 8) top = 8;
        }
        card.style.left = left + 'px';
        card.style.top = top + 'px';
        card.classList.add('is-on');
    },

    hideHint: function () {
        this.hintAnchor = null;
        this.hintPinned = false;
        document.documentElement.classList.remove('hint-open');
        if (!this.els.hintCard) return;
        this.els.hintCard.classList.add('hidden');
        this.els.hintCard.classList.remove('is-on', 'is-docked');
        this.els.hintCard.style.bottom = '';
    },

    playLightCue: function (name) {
        if (this.reducedMotion) return;
        var html = document.documentElement;
        html.classList.remove('candle-flare', 'candle-snuff');
        void html.offsetWidth;
        html.classList.add('candle-' + name);
        var self = this;
        clearTimeout(this.cueTimer);
        this.cueTimer = setTimeout(function () {
            html.classList.remove('candle-flare', 'candle-snuff');
        }, 900);
    },

    skipTypewriter: function () {
        if (!this.typing && !this.typeQueue.length) return;
        if (this.typeTimer) {
            clearInterval(this.typeTimer);
            this.typeTimer = null;
        }
        this.typing = false;
        while (this.typeQueue.length) {
            this.paintLog(this.typeQueue.shift(), true);
        }
    },

    enqueueLog: function (entry) {
        this.els.ariaLive.textContent = entry.text;
        var instant = !entry.typewriter || !entry.highlight || this.reducedMotion;
        if (instant) {
            this.paintLog(entry, true);
            return;
        }
        this.typeQueue.push(entry);
        this.pumpType();
    },

    pumpType: function () {
        if (this.typing) return;
        if (!this.typeQueue.length) return;
        if (this.typeQueue.length > 3) {
            while (this.typeQueue.length) this.paintLog(this.typeQueue.shift(), true);
            return;
        }
        var entry = this.typeQueue.shift();
        this.paintLog(entry, false);
    },

    paintLog: function (entry, instant) {
        var div = document.createElement('div');
        div.className = entry.highlight ? 'log-entry highlight' : 'log-entry';
        var textEl = document.createElement('span');
        div.appendChild(textEl);
        this.els.journal.appendChild(div);
        this.pruneLog();

        var self = this;
        var finish = function () {
            textEl.textContent = entry.text;
            if (entry.choices && entry.choices.length) {
                var row = document.createElement('div');
                row.className = 'log-choices';
                for (var i = 0; i < entry.choices.length; i++) {
                    var c = entry.choices[i];
                    var b = document.createElement('button');
                    b.type = 'button';
                    b.setAttribute('data-choice', c.id);
                    b.setAttribute('data-hint', c.id === 'match' ? 'matchChoice' : 'sitChoice');
                    b.textContent = c.label;
                    row.appendChild(b);
                }
                div.appendChild(row);
            }
            self.typing = false;
            self.typeTimer = null;
            self.pumpType();
        };

        if (instant) {
            finish();
            return;
        }
        this.typing = true;
        var i = 0;
        this.typeTimer = setInterval(function () {
            i += 1;
            textEl.textContent = entry.text.slice(0, i);
            if (i >= entry.text.length) {
                clearInterval(self.typeTimer);
                finish();
            }
        }, 15);
    },

    pruneLog: function () {
        var root = this.els.journal;
        if (!root) return;
        var live = [];
        for (var i = 0; i < root.children.length; i++) {
            var node = root.children[i];
            if (!node.classList.contains('log-entry')) continue;
            if (node.classList.contains('fade-out')) continue;
            live.push(node);
        }
        var drop = live.length - this.LOG_KEEP;
        if (drop <= 0) return;
        var reduce = this.reducedMotion;
        for (var d = 0; d < live.length && drop > 0; d++) {
            var el = live[d];
            if (el.querySelector('.log-choices')) continue;
            drop -= 1;
            if (reduce) {
                if (el.parentNode) el.parentNode.removeChild(el);
            } else {
                el.classList.add('fade-out');
                (function (gone) {
                    setTimeout(function () {
                        if (gone && gone.parentNode) gone.parentNode.removeChild(gone);
                    }, 1000);
                })(el);
            }
        }
    },

    draw: function () {
        var s = Grimoire.state;
        var d = Grimoire.dirty;
        this.syncMotionPref();
        if (d.layout || d.tabs || d.subhead) this.drawLayout(s);
        if (d.resources || d.buttons) this.drawResources(s);
        if (d.page) this.drawPage(s);
        if (d.candle) this.drawCandle(s);
        if (d.vignette || d.layout || d.candle) this.drawVignette(s);
        if (d.log) this.drawLog(s);
        if (d.projects) this.drawProjects(s);
        if (d.jobs) this.drawJobs(s);
        if (d.study || d.jobs || d.layout || d.candle) this.drawStudyArt(s);
        if (d.estate || d.layout || d.jobs || d.resources || d.buttons || d.projects) this.drawEstate(s);
        if (d.codex) this.drawCodex(s);
        if (d.settings || d.layout) this.drawChrome(s);
        this.drawDoubt(s);
        if (d.layout) this.fitDesk();
        for (var k in d) d[k] = false;
    },

    drawLayout: function (s) {
        document.body.classList.toggle('boot-dark', !s.meta.deskRevealed);
        if (this.els.shell) this.els.shell.setAttribute('aria-hidden', s.meta.deskRevealed ? 'false' : 'true');
        if (this.els.bootVeil) this.els.bootVeil.setAttribute('aria-hidden', s.meta.deskRevealed ? 'true' : 'false');
        if (!s.meta.deskRevealed && this.els.btnLight && document.activeElement !== this.els.btnLight) {
            this.els.btnLight.focus();
        }
        var study = Grimoire.hasUnlock(s, 'bolt_and_key');
        var shutters = s.meta.shuttersOpen;
        this.els.shell.classList.toggle('study-open', study);
        this.els.tablist.classList.toggle('hidden', !study);
        this.els.ledger.classList.remove('hidden');
        this.els.tabEstate.classList.toggle('hidden', !shutters);
        this.els.tabBinding.classList.toggle('hidden', !shutters);
        this.els.tabBinding.disabled = true;

        var tab = s.meta.activeTab || 'desk';
        if (!study) tab = 'desk';
        document.documentElement.classList.toggle('on-desk', tab === 'desk' && !!s.meta.deskRevealed);
        this.els.tabDesk.setAttribute('aria-selected', tab === 'desk' ? 'true' : 'false');
        this.els.tabStudy.setAttribute('aria-selected', tab === 'study' ? 'true' : 'false');
        this.els.tabEstate.setAttribute('aria-selected', tab === 'estate' ? 'true' : 'false');
        this.els.panelDesk.classList.toggle('hidden', tab !== 'desk');
        this.els.panelStudy.classList.toggle('hidden', tab !== 'study');
        this.els.panelEstate.classList.toggle('hidden', tab !== 'estate');
        this.els.panelBinding.classList.toggle('hidden', tab !== 'binding');

        var sub = Grimoire.CONTENT.subheadings.boot;
        if (shutters) sub = Grimoire.CONTENT.subheadings.shutters;
        else if (study) sub = Grimoire.CONTENT.subheadings.bolted;
        else if (Grimoire.hasUnlock(s, 'name_flame')) sub = Grimoire.CONTENT.subheadings.flame;
        this.els.subhead.textContent = sub;
    },

    setTexts: function (sel, text) {
        var nodes = document.querySelectorAll(sel);
        for (var i = 0; i < nodes.length; i++) nodes[i].textContent = text;
    },

    toggleRows: function (name, show) {
        var nodes = document.querySelectorAll('[data-row="' + name + '"]');
        for (var i = 0; i < nodes.length; i++) nodes[i].classList.toggle('hidden', !show);
    },

    drawResources: function (s) {
        var jitter = s.meta.jitterUntil && Date.now() < s.meta.jitterUntil && Grimoire.bleed.fxAllowed(s) ? 1 : 0;
        this.setTexts('.js-res-insight', Grimoire.economics.format(Math.floor(s.resources.insight) + jitter));
        this.setTexts('.js-res-tallow', Grimoire.economics.format(Math.floor(s.resources.tallow)));
        this.setTexts('.js-res-ink', Grimoire.economics.format(Math.floor(s.resources.ink)));
        this.setTexts('.js-res-passages', Grimoire.economics.format(Math.floor(s.resources.passages)));
        var qtxt = String(s.generators.quills);
        if (s.meta.dispatchedQuill && Grimoire.estate) {
            qtxt += ' (1 in the ' + Grimoire.estate.roomName(s.meta.dispatchedQuill) + ')';
        }
        this.setTexts('.js-res-quills', qtxt);
        this.setTexts('.js-res-lexicons', Grimoire.economics.format(Math.floor(s.resources.lexicons)));
        this.setTexts('.js-res-matches', String(s.resources.matches));
        this.setTexts('.js-res-chapter', Grimoire.translationPercent(s) + '%');
        this.setTexts('.js-res-vellum', Grimoire.economics.format(Math.floor(s.resources.vellum || 0)));
        this.setTexts('.js-res-folios', Grimoire.economics.format(Math.floor(s.resources.folios || 0)));
        this.setTexts('.js-res-extracts', Grimoire.economics.format(Math.floor(s.resources.extracts || 0)));
        this.setTexts('.js-res-silver', Grimoire.economics.format(Math.floor(s.resources.silver || 0)));

        var named = Grimoire.hasUnlock(s, 'name_flame');
        this.toggleRows('tallow', named);
        this.toggleRows('ink', Grimoire.hasUnlock(s, 'catalog_page'));
        this.toggleRows('passages', s.page.pagesFinished >= 1);
        this.toggleRows('quills', s.generators.quills >= 1);
        this.toggleRows('lexicons', Grimoire.hasUnlock(s, 'collation'));
        this.toggleRows('matches', s.meta.darknessSeen);
        this.toggleRows('chapter', Grimoire.hasUnlock(s, 'index'));
        this.toggleRows('vellum', (s.resources.vellum || 0) > 0 || Grimoire.hasUnlock(s, 'light_cellars'));
        this.toggleRows('folios', (s.resources.folios || 0) > 0 || Grimoire.hasUnlock(s, 'light_library'));
        this.toggleRows('extracts', (s.resources.extracts || 0) > 0 || Grimoire.hasUnlock(s, 'light_glasshouse'));
        this.toggleRows('silver', (s.resources.silver || 0) > 0 || Grimoire.hasUnlock(s, 'light_vault'));
        var wick = Grimoire.candle.wickVisible(s);
        this.els.candleMeter.classList.toggle('hidden', !wick);
        this.els.candleMeter.textContent = 'CANDLE: ' + Math.round(Grimoire.candle.oilPercent(s) * 100) + '%';

        var dark = !s.meta.deskRevealed || !s.meta.candleLit || s.resources.oil <= 0;
        var sitting = s.meta.emberUntil && Date.now() < s.meta.emberUntil;
        this.els.btnDecipher.disabled = dark || sitting;
        this.els.btnTrim.classList.toggle('hidden', !wick);
        this.els.btnTrim.disabled = dark || sitting || (s.meta.trimsDone >= 2 && s.resources.tallow < 3);
        var trimLabel = s.meta.trimsDone < 2 ? 'Trim Wick (free)' : 'Trim Wick (3 tallow)';
        this.els.btnTrim.textContent = trimLabel;

        var distillOn = Grimoire.hasUnlock(s, 'catalog_page');
        this.els.btnDistill.classList.toggle('hidden', !distillOn);
        this.els.btnDistill.disabled = s.resources.tallow < 5;
        this.els.btnDistill.textContent = s.meta.distillMutated ? 'Press Tallow (5 tallow)' : 'Distill Ink (5 tallow)';
        this.els.btnDistill.setAttribute('data-hint', 'distill');
        this.els.btnDistill.classList.toggle('bleed-flicker', Grimoire.bleed.shouldFlickerLabel(s) && !this.reducedMotion);

        this.els.btnLexicon.classList.toggle('hidden', !Grimoire.hasUnlock(s, 'collation'));
        this.els.btnLexicon.disabled = !Grimoire.projects.canLexicon(s);
        this.els.btnLexicon.textContent = 'Bind Lexicon (5 Passages, 8 Ink)';
        this.refreshProjectAfford(s);
        this.drawDarkActs(s);
    },

    drawDarkActs: function (s) {
        var drowned = s.meta.deskRevealed && (!s.meta.candleLit || s.resources.oil <= 0);
        var sitting = !!(s.meta.emberUntil && Date.now() < s.meta.emberUntil);
        if (this.els.darkActs) this.els.darkActs.classList.toggle('hidden', !drowned);
        if (!drowned) return;
        var canStrike = s.resources.matches >= 1 && s.resources.insight >= Grimoire.candle.MATCH_COST_INSIGHT;
        this.els.btnStrike.disabled = !canStrike;
        this.els.btnStrike.textContent = 'Strike Match (3 Insight)';
        var wick = Grimoire.candle.wickVisible(s);
        var snuffs = s.meta.snuffs || 0;
        var showTrim = wick;
        var canTrim = showTrim && (s.meta.trimsDone < 2 || s.resources.tallow >= Grimoire.candle.TRIM_COST);
        this.els.btnTrimDark.classList.toggle('hidden', !showTrim);
        this.els.btnTrimDark.disabled = !canTrim || sitting;
        this.els.btnTrimDark.textContent = s.meta.trimsDone < 2 ? 'Trim Wick (free)' : 'Trim Wick (3 tallow)';
        var stuck = !canStrike && !canTrim;
        var study = Grimoire.hasUnlock(s, 'bolt_and_key');
        var showSit = !sitting && s.meta.pendingChoice === 'darkness' && (study || snuffs >= 3 || stuck);
        this.els.btnSitDark.classList.toggle('hidden', !showSit);
    },

    refreshProjectAfford: function (s) {
        var desk = Grimoire.projects.revealedList(s, 'desk');
        var shown = this.els.projectList.querySelectorAll('.project-row:not(.dim)').length;
        if (desk.length !== shown) this.fillProjects(this.els.projectList, s, 'desk');
        var study = Grimoire.projects.revealedList(s, 'study');
        var shownS = this.els.projectListStudy.querySelectorAll('.project-row:not(.dim)').length;
        if (study.length !== shownS) this.fillProjects(this.els.projectListStudy, s, 'study');
        if (this.els.estateProjects) {
            var est = Grimoire.projects.revealedList(s, 'estate');
            var shownE = this.els.estateProjects.querySelectorAll('.project-row:not(.dim)').length;
            if (est.length !== shownE) this.fillProjects(this.els.estateProjects, s, 'estate');
        }

        var buttons = document.querySelectorAll('button.project-buy');
        for (var i = 0; i < buttons.length; i++) {
            var btn = buttons[i];
            var p = Grimoire.projects.byId(btn.getAttribute('data-project'));
            if (!p) continue;
            var row = btn.closest('.project-row');
            if (row && row.classList.contains('dim')) continue;
            var affordable = Grimoire.projects.canBuy(s, p);
            if (btn.disabled !== !affordable) btn.disabled = !affordable;
            var parts = Grimoire.projects.buttonParts(s, p, false);
            var titleEl = btn.querySelector('.project-title');
            var costEl = btn.querySelector('.project-cost');
            if (titleEl && costEl) {
                if (titleEl.textContent !== parts.title) titleEl.textContent = parts.title;
                if (costEl.textContent !== parts.cost) costEl.textContent = parts.cost;
            } else {
                var label = Grimoire.projects.buttonLabel(s, p, false);
                if (btn.textContent !== label) btn.textContent = label;
            }
            if (row) row.classList.toggle('has-charges', p.id === 'press_once' && (s.meta.pressOnceLeft || 0) > 0);
            if (affordable && !s.meta.lastAffordable[p.id]) {
                s.meta.lastAffordable[p.id] = true;
                if (!this.reducedMotion && row) row.classList.add('pulse-affordable');
            }
            if (!affordable) s.meta.lastAffordable[p.id] = false;
            if (s.settings.showExact && row) {
                var fxEl = row.querySelector('.project-effect');
                var fx = Grimoire.projects.effectText(s, p);
                if (fxEl && fx && fxEl.textContent !== fx) fxEl.textContent = fx;
            }
        }
    },

    drawPage: function (s) {
        var turning = s.page.turningUntil && Date.now() < s.page.turningUntil;
        this.els.runeOverlay.classList.toggle('turning', !!turning);
        for (var i = 0; i < 48; i++) {
            var rune = s.page.runes[i];
            var span = this.runeSpans[i];
            if (!rune || rune.status === 'empty') {
                span.textContent = '';
                span.className = 'rune-slot rune-empty';
                continue;
            }
            span.textContent = rune.char;
            var cls = 'rune-slot';
            if (rune.status === 'flash-blue') cls += ' rune-blue';
            else if (rune.status === 'flash-purple') cls += ' rune-purple';
            else if (rune.status === 'faded') cls += ' rune-faded';
            else if (rune.status === 'stable') cls += ' rune-stable';
            span.className = cls;
        }
    },

    drawCandle: function (s) {
        var stage = Grimoire.candle.stage(s);
        if (this.els.candleContainer) {
            this.els.candleContainer.classList.remove('stage-full', 'stage-diminished', 'stage-stub', 'stage-drowned');
            this.els.candleContainer.classList.add('stage-' + stage);
        }
        if (this.els.candleSmoke) {
            this.els.candleSmoke.classList.toggle('hidden', stage !== 'drowned');
        }
        if (this.lastStage === stage && this.lastFlameFrame === this.flameFrame) {
            return;
        }
        var prev = this.lastStage;
        this.lastStage = stage;
        this.lastFlameFrame = this.flameFrame;
        if (prev && prev !== stage && stage === 'drowned') this.playLightCue('snuff');
        var flame = Grimoire.CONTENT.flameFrames[this.flameFrame];
        var c0 = this.flameColor;
        var html = '';
        if (stage !== 'drowned') {
            html += '<span class="flame flame-color-' + c0 + '">' + flame[0] + '</span>\n';
            html += '<span class="flame flame-color-' + ((c0 + 1) % 4) + '">' + flame[1] + '</span>\n';
            html += '<span class="flame flame-color-' + ((c0 + 2) % 4) + '">' + flame[2] + '</span>\n';
        }
        var body = Grimoire.candle.asciiBody(stage);
        for (var i = 0; i < body.length; i++) {
            html += '<span class="candle-wax">' + body[i] + '</span>\n';
        }
        this.els.candleArt.innerHTML = html;
        this.els.candleArt.classList.toggle('drowned', stage === 'drowned');
    },

    drawVignette: function (s) {
        var p = Grimoire.candle.oilPercent(s);
        var lit = s.meta.deskRevealed && s.meta.candleLit && s.resources.oil > 0;
        var sitting = !!(s.meta.emberUntil && Date.now() < s.meta.emberUntil);
        var t = 1 - p;
        var dark = Math.pow(t, 1.25) * 0.92;
        if (!s.meta.deskRevealed) dark = 1;
        else if (!lit) dark = sitting ? 0.82 : 0.94;
        if (s.meta.vignetteSoft) dark *= 0.62;
        var oil = lit ? p : 0;
        var glow = lit ? (0.25 + p * 0.7) : (sitting ? 0.12 : 0);
        var root = document.documentElement;
        root.style.setProperty('--oil', oil.toFixed(3));
        root.style.setProperty('--dark', dark.toFixed(3));
        root.style.setProperty('--glow', glow.toFixed(3));

        var box = this.els.candleContainer && this.els.candleContainer.getBoundingClientRect();
        if (box && box.width) {
            var x = ((box.left + box.width * 0.5) / window.innerWidth) * 100;
            var y = ((box.top + box.height * 0.18) / window.innerHeight) * 100;
            root.style.setProperty('--flame-x', x.toFixed(1) + '%');
            root.style.setProperty('--flame-y', y.toFixed(1) + '%');
        }

        var stage = Grimoire.candle.stage(s);
        root.classList.remove('candle-full', 'candle-diminished', 'candle-stub', 'candle-drowned', 'candle-sitting');
        root.classList.add('candle-' + stage);
        root.classList.toggle('candle-sitting', sitting);

        var pulse = !this.reducedMotion && lit && p < 0.2 && p > 0;
        this.els.vignette.classList.toggle('pulse', pulse);
    },

    drawLog: function (s) {
        if (this.lastLogCount === 0 && s.log.length) {
            this.els.journal.innerHTML = '';
            var start = Math.max(0, s.log.length - this.LOG_KEEP);
            for (var i = start; i < s.log.length; i++) {
                this.enqueueLog(s.log[i]);
            }
            this.lastLogCount = s.log.length;
            return;
        }
        while (this.lastLogCount < s.log.length) {
            this.enqueueLog(s.log[this.lastLogCount]);
            this.lastLogCount += 1;
        }
    },

    drawProjects: function (s) {
        this.fillProjects(this.els.projectList, s, 'desk');
        this.fillProjects(this.els.projectListStudy, s, 'study');
        if (this.els.estateProjects) this.fillProjects(this.els.estateProjects, s, 'estate');
    },

    fillProjects: function (root, s, tab) {
        var revealed = Grimoire.projects.revealedList(s, tab);
        var extra = s.meta.extraReveals || 0;
        var cap = (tab === 'desk' ? 4 : tab === 'estate' ? 8 : 6) + extra;
        var show = revealed.slice(0, cap);
        var tease = Grimoire.projects.tease(s, tab);
        var sig = show.map(function (p) {
            return p.id + ':' + Grimoire.projects.costLabel(s, p);
        }).join(',') + (tease ? '|t:' + tease.id : '') + (s.settings.showExact ? '|x' : '');
        if (root.getAttribute('data-sig') === sig) return;
        root.setAttribute('data-sig', sig);
        var html = '';
        for (var i = 0; i < show.length; i++) {
            html += this.projectRow(s, show[i], false);
        }
        if (tease) html += this.projectRow(s, tease, true);
        root.innerHTML = html;
        if (this.hintAnchor && this.hintAnchor.isConnected === false) this.hideHint();
    },

    projectRow: function (s, p, dim) {
        var affordable = !dim && Grimoire.projects.canBuy(s, p);
        var was = s.meta.lastAffordable[p.id];
        var pulse = false;
        if (affordable && !was) {
            pulse = true;
            s.meta.lastAffordable[p.id] = true;
        }
        if (!affordable) s.meta.lastAffordable[p.id] = false;
        var parts = Grimoire.projects.buttonParts(s, p, dim);
        var cls = 'project-row';
        if (dim) cls += ' dim';
        if (pulse && !this.reducedMotion) cls += ' pulse-affordable';
        if (!dim && p.id === 'press_once' && (s.meta.pressOnceLeft || 0) > 0) cls += ' has-charges';
        var disabled = dim || !affordable ? ' disabled' : '';
        var hint = ' data-hint="project" data-project="' + p.id + '"';
        var fx = '';
        if (!dim && s.settings.showExact) {
            var line = Grimoire.projects.effectText(s, p);
            if (line) fx = '<div class="project-effect">' + line + '</div>';
        }
        var about = dim ? 'about this mark' : 'about ' + p.title;
        return '<div class="' + cls + '"' + hint + '>' +
            '<button type="button" class="project-buy" data-project="' + p.id + '"' + disabled + '>' +
            '<span class="project-title">' + parts.title + '</span>' +
            '<span class="project-cost">' + parts.cost + '</span>' +
            '</button>' +
            '<button type="button" class="project-info" aria-label="' + about + '">?</button>' +
            fx + '</div>';
    },

    padAscii: function (text, n) {
        var t = String(text);
        if (n <= 0) return '';
        if (t.length >= n) return t.slice(0, n);
        return t + '                                        '.slice(0, n - t.length);
    },

    stepAscii: function (s) {
        if (this.reducedMotion) return;
        if (!s.meta.deskRevealed || !s.meta.candleLit || s.resources.oil <= 0) return;
        this.asciiAcc += 1;
        if (this.asciiAcc < 2) return;
        this.asciiAcc = 0;
        this.asciiFrame = (this.asciiFrame + 1) % 4;
        var tab = s.meta.activeTab || 'desk';
        if (tab === 'study' && Grimoire.hasUnlock(s, 'bolt_and_key')) Grimoire.dirty.study = true;
        if (tab === 'estate' && s.meta.shuttersOpen) Grimoire.dirty.estate = true;
    },

    drawStudyArt: function (s) {
        var stage = this.els.studyStage;
        var art = this.els.studyArt;
        if (!stage || !art) return;
        var study = Grimoire.hasUnlock(s, 'bolt_and_key');
        stage.classList.toggle('hidden', !study);
        if (!study) return;
        var live = !!(s.meta.deskRevealed && s.meta.candleLit && s.resources.oil > 0);
        stage.classList.toggle('is-live', live);
        stage.classList.toggle('is-dark', !live);
        var html = this.studyArtHtml(s);
        if (art.getAttribute('data-sig') === html) return;
        art.setAttribute('data-sig', html);
        art.innerHTML = html;
    },

    studyArtHtml: function (s) {
        var f = this.asciiFrame % 4;
        var a = s.generators.assignments || {};
        var t = a.transcribe || 0;
        var c = a.copy || 0;
        var att = a.attend || 0;
        var w = a.ward || 0;
        var live = !!(s.meta.deskRevealed && s.meta.candleLit && s.resources.oil > 0);
        var motion = live && !this.reducedMotion;
        var n = Grimoire.jobs ? Math.min(4, Grimoire.jobs.studyQuills(s)) : 0;
        var lamp = '       ';
        if (live && w) lamp = motion ? ['  *\'   ', '   *\'  ', '  \' *  ', '  * .  '][f] : '   *   ';
        else if (live) lamp = '   .   ';
        var board = ' |-| ';
        if (att && live) board = motion ? [' |#| ', ' |=| ', ' |:| ', ' |*| '][f] : ' |#| ';
        var perch = '';
        var perchVis = 10;
        var i;
        for (i = 0; i < 4; i++) {
            perch += i < n ? '<span class="study-q">q</span>' : '.';
            if (i < 3) perch += '  ';
        }
        if (s.meta.dispatchedQuill) {
            perch += '     <span class="study-away">_</span>';
            perchVis = 16;
        }
        var scratch = '····';
        if (t && live) scratch = motion ? ['~~~~', '~ ~~', '~~ ~', ' ~~~'][f] : '~~~~';
        var ink = '( ) ';
        if (c && live) ink = motion ? ["(o)'", '(o).', '(o) ', '(o),'][f] : '(o) ';
        var lampCls = 'study-lamp' + (w && live ? ' is-on' : '');
        var boardCls = 'study-board' + (att && live ? ' is-on' : '');
        var scratchCls = 'study-scratch' + (t && live ? ' is-on' : '');
        var inkCls = 'study-ink' + (c && live ? ' is-on' : '');
        return [
            '     .=======.                 .-----.',
            '     |<span class="' + lampCls + '">' + lamp + '</span>|                 |<span class="' + boardCls + '">' + board + '</span>|',
            "     '======='                 '-----'",
            '.------------------------------------.',
            '| ' + perch + this.padAscii('', 35 - perchVis) + '|',
            '|  <span class="' + scratchCls + '">' + scratch + '</span>' + this.padAscii('', 24) + '<span class="' + inkCls + '">' + ink + '</span>  |',
            "'------------------------------------'"
        ].join('\n');
    },

    drawJobs: function (s) {
        var study = Grimoire.hasUnlock(s, 'bolt_and_key');
        this.els.jobPanel.classList.toggle('hidden', !study);
        if (!study) {
            this.drawHouseQuill(s, this.els.houseQuillStudy);
            return;
        }
        var jobs = ['transcribe', 'copy', 'attend', 'ward'];
        var a = s.generators.assignments;
        var r = Grimoire.jobs.rates(s);
        var sig = jobs.map(function (id) {
            var locked = id === 'attend' && !Grimoire.jobs.canAttend(s);
            return id + ':' + (a[id] || 0) + (locked ? ':L' : '');
        }).join(',') + '|q' + s.generators.quills + '|d' + (s.meta.dispatchedQuill || '');
        if (this.els.jobRows.getAttribute('data-sig') === sig) {
            this.refreshJobRates(s, r);
            this.drawHouseQuill(s, this.els.houseQuillStudy);
            return;
        }
        this.els.jobRows.setAttribute('data-sig', sig);
        var html = '';
        for (var i = 0; i < jobs.length; i++) {
            var id = jobs[i];
            var info = Grimoire.CONTENT.jobs[id];
            var locked = id === 'attend' && !Grimoire.jobs.canAttend(s);
            html += '<div class="job-row" data-hint="job" data-job-hint="' + id + '">';
            html += '<span class="job-label">' + info.label + '</span>';
            html += '<button type="button" data-job="' + id + '" data-delta="-"' + (locked || !a[id] ? ' disabled' : '') + '>−</button>';
            html += '<span class="job-count">' + (a[id] || 0) + '</span>';
            html += '<button type="button" data-job="' + id + '" data-delta="+"' + (locked ? ' disabled' : '') + '>+</button>';
            html += '<span class="job-rate" data-job-rate="' + id + '">' + (locked ? '' : this.jobRateText(id, r)) + '</span>';
            html += '<span class="job-hint">' + (locked ? 'not yet.' : info.hint) + '</span>';
            html += '</div>';
        }
        this.els.jobRows.innerHTML = html;
        this.drawHouseQuill(s, this.els.houseQuillStudy);
    },

    refreshJobRates: function (s, r) {
        var nodes = this.els.jobRows.querySelectorAll('[data-job-rate]');
        for (var i = 0; i < nodes.length; i++) {
            var id = nodes[i].getAttribute('data-job-rate');
            var locked = id === 'attend' && !Grimoire.jobs.canAttend(s);
            var next = locked ? '' : this.jobRateText(id, r);
            if (nodes[i].textContent !== next) nodes[i].textContent = next;
        }
    },

    jobRateText: function (id, r) {
        var fmt = Grimoire.projects.rateStr;
        if (id === 'transcribe') return r.insight ? ('+' + fmt(r.insight, 1) + ' Insight/s') : '';
        if (id === 'copy') {
            if (!r.copyInk) return '';
            return '+' + fmt(r.copyInk, 2) + ' Ink/s · −' + fmt(r.copyDrain, 1) + ' Insight/s';
        }
        if (id === 'attend') return r.attendRunes ? (fmt(r.attendRunes, 2) + ' runes/s') : '';
        if (id === 'ward') {
            var w = Grimoire.state.generators.assignments.ward || 0;
            return w ? ('oil ×' + fmt(Math.pow(0.85, w), 2)) : '';
        }
        return '';
    },

    drawEstate: function (s) {
        if (!this.els.estateMap || !s.meta.shuttersOpen) return;
        if (Grimoire.estate) Grimoire.estate.ensure(s);
        if (this.els.estateLead) {
            this.els.estateLead.textContent = s.meta.packetTwice
                ? 'a second packet went. still nothing has come back up it.'
                : s.meta.packetLeft
                    ? 'a packet went down the drive. nothing has come back up it.'
                    : 'the grounds have a shape. walk it. one room at a time.';
        }
        var mapSig = Grimoire.estate.mapSig(s);
        if (this.els.estateMap.getAttribute('data-sig') !== mapSig) {
            this.els.estateMap.setAttribute('data-sig', mapSig);
            this.els.estateMap.innerHTML = Grimoire.estate.mapHtml(s);
        }
        this.patchEstateMeters(s);
        this.drawEstateInterior(s);
        this.drawHouseQuill(s, this.els.houseQuillEstate);
    },

    patchEstateMeters: function (s) {
        var E = Grimoire.estate;
        var nodes = this.els.estateMap.querySelectorAll('[data-room]');
        for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i];
            var id = el.getAttribute('data-room');
            var p = E.workProgress(s, id);
            var name = el.querySelector('.map-room-name');
            var nextName = E.nameLine(s, id);
            if (name && name.textContent !== nextName) name.textContent = nextName;
            var flair = el.querySelector('.map-room-flair');
            var nextFlair = E.flairLine(s, id);
            if (flair && flair.textContent !== nextFlair) flair.textContent = nextFlair;
            var fill = el.querySelector('.map-meter-fill');
            var pct = p == null ? 0 : Math.max(0, Math.min(100, Math.round(p * 100)));
            if (fill) {
                var width = pct + '%';
                if (fill.style.width !== width) fill.style.width = width;
            }
            var meter = el.querySelector('.map-meter');
            if (meter) meter.classList.toggle('is-on', p != null);
            var nextCls = E.cellClass(s, id);
            if (el.className !== nextCls) el.className = nextCls;
            var label = E.roomLabel(s, id);
            if (el.getAttribute('aria-label') !== label) el.setAttribute('aria-label', label);
        }
    },

    drawEstateInterior: function (s) {
        var root = this.els.estateInterior;
        if (!root) return;
        var E = Grimoire.estate;
        var room = E.current(s);
        var info = Grimoire.CONTENT.estateRooms[room] || { name: room, flavor: '' };
        var live = E.houseLive(s);
        var b = s.meta.estateBatches[room];
        var progress = 0;
        var cooking = false;
        var left = 0;
        if (room === 'glasshouse' && E.isLit(s, 'glasshouse')) {
            cooking = true;
            progress = (s.meta.estateBatches.glasshouse && s.meta.estateBatches.glasshouse.progress) || 0;
            left = E.secondsLeft(s, 'glasshouse');
        } else if (b && b.active) {
            cooking = true;
            progress = b.progress || 0;
            left = E.secondsLeft(s, room);
        }
        var pct = Math.max(0, Math.min(100, Math.floor(progress * 100)));
        var spoiled = E.isSpoiled(s, room);
        var findId = (s.meta.estateFind && s.meta.estateFind.id) || '';
        var buffId = (s.meta.estateBuff && s.meta.estateBuff.id) || '';
        var sig = [room, E.isLit(s, room) ? 'L' : 'd', live ? '1' : '0', cooking ? 'c' : '',
            spoiled ? 'x' : '', s.meta.dispatchedQuill || '', E.canStart(s, room) ? 's' : '',
            E.canDispatch(s, room) ? 'q' : '', Grimoire.hasUnlock(s, 'mechanical_cataloger') ? 'k' : '',
            Grimoire.hasUnlock(s, 'hall_lantern') ? 'h' : '',
            s.meta.packetLeft ? 'p' : '', s.meta.packetTwice ? '2' : '',
            s.meta.estateKey ? 'K' : '', s.meta.drawerOpen ? 'D' : '',
            E.canListen(s) ? 'l' : '', E.canOpenDrawer(s) ? 'w' : '',
            findId, buffId, Math.ceil(E.buffLeft(s))].join('|');
        if (root.getAttribute('data-sig') === sig) {
            var fill = root.querySelector('.estate-bar-fill');
            var time = root.querySelector('.estate-bar-time');
            var vignette = root.querySelector('.estate-vignette');
            if (fill) fill.style.width = pct + '%';
            if (time) {
                if (spoiled) time.textContent = 'soured. salvage or dump.';
                else if (!live && cooking) time.textContent = 'paused. the candle is out.';
                else if (cooking && room === 'library' && !E.libraryCanProgress(s)) {
                    time.textContent = 'waiting — stay, send a quill, or the Cataloger.';
                } else if (cooking && left > 0) time.textContent = Math.ceil(left) + 's';
                else if (cooking) time.textContent = 'working';
            }
            if (vignette) {
                var nextArt = E.interiorArt(s, room);
                if (vignette.textContent !== nextArt) vignette.textContent = nextArt;
                vignette.classList.toggle('is-live', live);
            }
            var buffEl = root.querySelector('.estate-buff');
            var buffLine = E.buffLine(s);
            if (buffEl && buffLine) buffEl.textContent = buffLine;
            return;
        }
        root.setAttribute('data-sig', sig);
        var html = '<h3>' + info.name + '</h3>';
        html += '<p class="italic muted">' + (info.flavor || '') + '</p>';
        var art = E.interiorArt(s, room);
        if (art) {
            html += '<pre class="estate-vignette' + (live ? ' is-live' : '') + '" aria-hidden="true">' + art + '</pre>';
        }
        html += this.estateBuffHtml(s);
        html += this.estateFindHtml(s, room);
        if (!live) {
            html += '<p class="muted">the house is dark. the work waits.</p>';
        }
        if (E.isWork(room)) {
            if (!E.isLit(s, room)) {
                html += '<p>unlit. Light waits on the list below.</p>';
            } else if (room === 'glasshouse') {
                html += '<p>it drips while you are away. standing here, or a quill, makes it less slow.</p>';
                html += this.estateBarHtml(pct, live, left, 'extract', false);
            } else {
                var hintKey = room === 'cellars' ? 'renderHide' : room === 'library' ? 'collateFolio' : 'chargeBath';
                html += '<p class="muted">' + (Grimoire.CONTENT.hints[hintKey] || '') + '</p>';
                if (spoiled) {
                    html += '<p class="muted">the wick died while this was cooking.</p>';
                    html += '<button type="button" data-salvage="' + room + '" data-hint="salvageBatch">salvage what will take</button>';
                    html += '<button type="button" data-dump="' + room + '" data-hint="salvageBatch">dump it</button>';
                    html += this.estateBarHtml(pct, live, left, room, true);
                } else {
                    if (room === 'library' && !E.libraryCanProgress(s) && cooking) {
                        html += '<p class="muted">the collation waits. stay, send a quill, or buy the Cataloger.</p>';
                    }
                    if (cooking && live && (room === 'cellars' || room === 'vault')) {
                        html += '<p class="muted">you are standing here. it finishes sooner.</p>';
                    }
                    var can = E.canStart(s, room);
                    html += '<button type="button" data-start="' + room + '" data-hint="' + hintKey + '"' +
                        (can ? '' : ' disabled') + '>' + E.startLabel(s, room) + '</button>';
                    if (cooking) html += this.estateBarHtml(pct, live, left, room, false);
                }
            }
        } else if (room === 'hall') {
            if (Grimoire.hasUnlock(s, 'hall_lantern')) {
                html += '<p class="muted">the lantern names the dark. click a door, or use the arrows.</p>';
            } else {
                html += '<p class="muted">click a door beside you, or use the arrows.</p>';
            }
            html += this.estateListenHtml(s);
            html += this.estateDrawerHtml(s);
        } else if (room === 'gate') {
            if (s.meta.packetTwice) {
                html += '<p>a second packet went. the gravel is not disturbed.</p>';
            } else if (s.meta.packetLeft) {
                html += '<p>the drive is empty. the gravel is not disturbed.</p>';
            } else {
                html += '<p class="muted">a packet could be left here. obituaries are not copied on the estate.</p>';
            }
            html += this.estateListenHtml(s);
        }
        root.innerHTML = html;
    },

    estateFindHtml: function (s, room) {
        var E = Grimoire.estate;
        if (!E.hasFind(s, room)) return '';
        var def = E.findDef(s.meta.estateFind.id);
        if (!def) return '';
        return '<p class="estate-find-line italic">' + def.seen + '</p>' +
            '<button type="button" data-take-find="1" data-hint="estateFind">take the ' + def.name + '</button>';
    },

    estateListenHtml: function (s) {
        if (!Grimoire.estate.canListen(s)) return '';
        return '<button type="button" data-listen="1" data-hint="estateListen">listen</button>';
    },

    estateDrawerHtml: function (s) {
        var E = Grimoire.estate;
        if (s.meta.drawerOpen) {
            return '<p class="muted">the drawer stands open. the slot is empty.</p>';
        }
        if (E.canOpenDrawer(s)) {
            return '<button type="button" data-drawer="1" data-hint="estateDrawer">open the drawer</button>';
        }
        if (s.meta.estateKey && !s.meta.packetLeft) {
            return '<p class="muted">the key does not fit yet. the drive has not been used.</p>';
        }
        if (s.meta.packetLeft && !s.meta.estateKey) {
            return '<p class="muted">a drawer in the wainscot. it wants a key.</p>';
        }
        return '';
    },

    estateBuffHtml: function (s) {
        var line = Grimoire.estate.buffLine(s);
        if (!line) return '';
        return '<p class="estate-buff">' + line + '</p>';
    },

    estateBarHtml: function (pct, live, left, kind, spoiled) {
        var time = spoiled ? 'soured. salvage or dump.' :
            (!live ? 'paused. the candle is out.' : (left > 0 ? Math.ceil(left) + 's' : 'working'));
        var label = kind === 'extract' ? 'drip' : (spoiled ? 'soured batch' : 'batch');
        return '<div class="estate-bar' + (spoiled ? ' is-spoiled' : '') +
            '" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100" aria-label="' + label + '">' +
            '<div class="estate-bar-fill" style="width:' + pct + '%"></div></div>' +
            '<p class="estate-bar-time muted">' + time + '</p>';
    },

    drawHouseQuill: function (s, root) {
        if (!root) return;
        if (!s.meta.shuttersOpen) {
            root.classList.add('hidden');
            root.innerHTML = '';
            return;
        }
        root.classList.remove('hidden');
        var E = Grimoire.estate;
        var dispatched = s.meta.dispatchedQuill;
        var sig = (dispatched || '') + '|' + E.current(s) + '|' + E.litCount(s) + '|' +
            Grimoire.jobs.totalAssigned(s) + '|' + E.buffLine(s);
        if (root.getAttribute('data-sig') === sig) return;
        root.setAttribute('data-sig', sig);
        var html = '<p class="italic muted">one feather may leave the study.</p>';
        html += this.estateBuffHtml(s);
        if (dispatched) {
            html += '<button type="button" data-recall="1" data-hint="recallQuill">Recall the quill from the ' +
                E.roomName(dispatched) + '</button>';
        } else {
            var work = E.WORK;
            var any = false;
            for (var i = 0; i < work.length; i++) {
                var id = work[i];
                if (!E.canDispatch(s, id)) continue;
                any = true;
                html += '<button type="button" data-send="' + id + '" data-hint="sendQuill">Send a quill to the ' +
                    E.roomName(id) + '</button>';
            }
            if (!any) {
                if ((s.generators.quills || 0) < 1) {
                    html += '<p class="muted">no feathers to send.</p>';
                } else if (E.litCount(s) < 1) {
                    html += '<p class="muted">light a room first.</p>';
                } else {
                    html += '<p class="muted">every feather is already assigned. free one, or there is none to send.</p>';
                }
            }
        }
        root.innerHTML = html;
    },

    drawCodex: function (s) {
        if (!Grimoire.hasUnlock(s, 'codex_bind')) {
            this.els.codex.innerHTML = '';
            this.els.codex.classList.add('hidden');
            return;
        }
        this.els.codex.classList.remove('hidden');
        var html = '<h3>Codex</h3><ol>';
        for (var i = 0; i < s.meta.sentencesCompleted; i++) {
            html += '<li>' + Grimoire.CONTENT.sentences[i] + '</li>';
        }
        html += '</ol>';
        if (s.resources.obituaries > 0) {
            html += '<p class="italic">an obituary, filed without a date that holds.</p>';
        }
        this.els.codex.innerHTML = html;
    },

    drawChrome: function (s) {
        if (s.meta.deskRevealed && !s.meta.settingsUnlocked && s.meta.playMs >= 90000) {
            s.meta.settingsUnlocked = true;
        }
        var show = !!s.meta.settingsUnlocked;
        this.els.btnSettings.classList.toggle('hidden', !show);
        this.els.btnSettings.setAttribute('aria-hidden', show ? 'false' : 'true');
    },

    fitDesk: function () {
        var vp = this.els.viewport;
        var stage = this.els.deskStage;
        if (!vp || !stage) return;
        stage.style.transform = 'none';
        stage.style.marginBottom = '0px';
        var avail = vp.clientWidth - 16;
        if (avail <= 0) return;
        var need = stage.scrollWidth;
        var scale = need > avail ? avail / need : 1;
        if (scale > 1) scale = 1;
        stage.style.transformOrigin = 'top center';
        stage.style.transform = 'scale(' + scale + ')';
        var used = stage.scrollHeight * scale;
        stage.style.marginBottom = (used - stage.scrollHeight) + 'px';
    },

    drawDoubt: function (s) {
        var show = s.meta.doubtUntil && Date.now() < s.meta.doubtUntil && Grimoire.bleed.fxAllowed(s);
        this.els.doubt.classList.toggle('hidden', !show);
    },

    stepFlame: function (s) {
        var flickerOff = s.settings.disableFlicker || this.reducedMotion;
        var skip = s.meta.flameSkip && Grimoire.bleed.fxAllowed(s);
        var stage = Grimoire.candle.stage(s);
        var every = stage === 'stub' ? 1 : stage === 'diminished' ? 2 : 3;
        if (stage === 'stub' && Math.random() < 0.1) skip = true;
        if (!flickerOff && !skip && stage !== 'drowned') {
            this.flameAcc += 1;
            if (this.flameAcc >= every) {
                this.flameFrame = (this.flameFrame + 1) % Grimoire.CONTENT.flameFrames.length;
                this.flameColor = (this.flameColor + 1) % 4;
                this.flameAcc = 0;
                Grimoire.dirty.candle = true;
            }
        }
        if (stage !== this.lastStage) Grimoire.dirty.candle = true;
    },

    alwaysTickVisuals: function (s) {
        if (s.page.turningUntil && Date.now() >= s.page.turningUntil) {
            s.page.turningUntil = 0;
            Grimoire.dirty.page = true;
        }
        if (s.meta.jitterUntil || s.meta.emberUntil) Grimoire.dirty.resources = true;
        this.drawDoubt(s);
    }
};
