var Grimoire = window.Grimoire || (window.Grimoire = {});

Grimoire.estate = {
    WORK: ['cellars', 'library', 'glasshouse', 'vault'],
    BASE_DURATION: { cellars: 60, library: 90, vault: 120 },
    RENDER_TALLOW: 8,
    COLLATE_VELLUM: 1,
    COLLATE_INK: 4,
    BATH_INK: 12,
    FIND_CHANCE: 0.2,
    FIND_CHANCE_RETURN: 0.4,
    FIND_KEY_CHANCE: 0.18,
    KEY_VISITS: 3,
    FIND_COOLDOWN_MS: 70000,
    LISTEN_COOLDOWN_MS: 40000,
    PRESENCE_MUL: 1.35,
    HOUSE_FILE_MUL: 1.08,
    SALVAGE_CELLARS_TALLOW: 3,
    SALVAGE_VAULT_INK: 4,
    QUILL_MUL: 1.75,
    EXTRACT_MUL: 1.75,
    TOOL_MUL: 1.12,
    EXTRACT_BASE: 80,

    neighbors: {
        hall: { n: 'glasshouse', w: 'library', e: 'vault', s: 'cellars' },
        library: { e: 'hall' },
        vault: { w: 'hall' },
        glasshouse: { s: 'hall' },
        cellars: { n: 'hall', s: 'gate' },
        gate: { n: 'cellars' }
    },

    lightId: function (roomId) {
        return 'light_' + roomId;
    },

    toolId: function (roomId) {
        return 'tool_' + roomId;
    },

    ensure: function (s) {
        if (!s.meta.estateSeen || typeof s.meta.estateSeen !== 'object') {
            s.meta.estateSeen = { hall: true, gate: true, cellars: true };
        } else {
            if (s.meta.estateSeen.hall == null) s.meta.estateSeen.hall = true;
            if (s.meta.estateSeen.gate == null) s.meta.estateSeen.gate = true;
            if (s.meta.estateSeen.cellars == null) s.meta.estateSeen.cellars = true;
        }
        if (!s.meta.estateBatches || typeof s.meta.estateBatches !== 'object') {
            s.meta.estateBatches = {};
        }
        var b = s.meta.estateBatches;
        if (!b.cellars) b.cellars = { active: false, progress: 0, usedExtract: false, spoiled: false };
        if (!b.library) b.library = { active: false, progress: 0, usedExtract: false, spoiled: false };
        if (!b.vault) b.vault = { active: false, progress: 0, usedExtract: false, spoiled: false };
        if (!b.glasshouse) b.glasshouse = { active: false, progress: 0, usedExtract: false };
        if (b.cellars.spoiled == null) b.cellars.spoiled = false;
        if (b.library.spoiled == null) b.library.spoiled = false;
        if (b.vault.spoiled == null) b.vault.spoiled = false;
        if (s.meta.dispatchedQuill === undefined) s.meta.dispatchedQuill = null;
        if (s.resources.folios == null) s.resources.folios = 0;
        if (s.meta.shuttersOpen && !s.meta.estateRoom) s.meta.estateRoom = 'hall';
        if (s.meta.estateFind === undefined) s.meta.estateFind = null;
        if (s.meta.estateBuff === undefined) s.meta.estateBuff = null;
        if (s.meta.estateFindCool == null) s.meta.estateFindCool = 0;
        if (!s.meta.estateEntered || typeof s.meta.estateEntered !== 'object') {
            s.meta.estateEntered = {};
        }
        if (!s.meta.estateVisits || typeof s.meta.estateVisits !== 'object') {
            s.meta.estateVisits = {};
        }
        if (s.meta.estateKey == null) s.meta.estateKey = false;
        if (s.meta.drawerOpen == null) s.meta.drawerOpen = false;
        if (s.meta.estateListenCool == null) s.meta.estateListenCool = 0;
        if (s.meta.packetTwice == null) s.meta.packetTwice = false;
        if (s.meta.shuttersOpen && s.meta.estateRoom) {
            s.meta.estateEntered[s.meta.estateRoom] = true;
        }
    },

    isWork: function (roomId) {
        return this.WORK.indexOf(roomId) !== -1;
    },

    isLit: function (s, roomId) {
        if (!this.isWork(roomId)) return true;
        return Grimoire.hasUnlock(s, this.lightId(roomId));
    },

    litCount: function (s) {
        var n = 0;
        for (var i = 0; i < this.WORK.length; i++) {
            if (this.isLit(s, this.WORK[i])) n += 1;
        }
        return n;
    },

    isSeen: function (s, roomId) {
        this.ensure(s);
        if (s.meta.estateSeen[roomId]) return true;
        if (this.isWork(roomId) && this.isLit(s, roomId)) return true;
        if (Grimoire.hasUnlock(s, 'hall_lantern') && this.adjacent('hall', roomId) && this.isWork(roomId)) {
            return true;
        }
        return false;
    },

    roomName: function (roomId) {
        var rooms = Grimoire.CONTENT.estateRooms;
        return (rooms[roomId] && rooms[roomId].name) || roomId;
    },

    current: function (s) {
        this.ensure(s);
        return s.meta.estateRoom || 'hall';
    },

    adjacent: function (from, to) {
        var n = this.neighbors[from];
        if (!n) return false;
        for (var d in n) {
            if (Object.prototype.hasOwnProperty.call(n, d) && n[d] === to) return true;
        }
        return false;
    },

    destInDir: function (from, dir) {
        var n = this.neighbors[from];
        return (n && n[dir]) || null;
    },

    canWalk: function (s, dest) {
        if (!dest || !this.neighbors[dest]) return false;
        var here = this.current(s);
        if (dest === here) return false;
        return this.adjacent(here, dest);
    },

    walk: function (s, dest) {
        if (!s.meta.shuttersOpen) return false;
        if (!this.canWalk(s, dest)) return false;
        this.ensure(s);
        var firstWalk = !s.meta.estateEntered[dest];
        s.meta.estateSeen[dest] = true;
        s.meta.estateEntered[dest] = true;
        s.meta.estateVisits[dest] = (s.meta.estateVisits[dest] || 0) + 1;
        s.meta.estateRoom = dest;
        if (firstWalk) {
            var line = Grimoire.CONTENT.estateDiscover[dest];
            if (line) Grimoire.log(s, line, { highlight: true });
        } else {
            this.maybeFind(s, dest);
        }
        Grimoire.mark('estate', 'projects', 'buttons');
        return true;
    },

    walkDir: function (s, dir) {
        var dest = this.destInDir(this.current(s), dir);
        if (!dest) return false;
        return this.walk(s, dest);
    },

    findDef: function (id) {
        var list = Grimoire.CONTENT.estateFinds || [];
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) return list[i];
        }
        return null;
    },

    findsFor: function (roomId) {
        var list = Grimoire.CONTENT.estateFinds || [];
        var out = [];
        for (var i = 0; i < list.length; i++) {
            if (list[i].rooms && list[i].rooms.indexOf(roomId) !== -1) out.push(list[i]);
        }
        return out;
    },

    hasFind: function (s, roomId) {
        return !!(s.meta.estateFind && s.meta.estateFind.room === roomId);
    },

    maybeFind: function (s, roomId) {
        if (!this.houseLive(s)) return false;
        if (s.meta.estateFind) return false;
        if ((s.meta.playMs || 0) < (s.meta.estateFindCool || 0)) return false;
        if (this.isWork(roomId) && !this.isLit(s, roomId)) return false;
        var visits = (s.meta.estateVisits && s.meta.estateVisits[roomId]) || 0;
        if (!s.meta.estateKey && visits >= this.KEY_VISITS) {
            var keyDef = this.findDef('house_key');
            if (keyDef && keyDef.rooms && keyDef.rooms.indexOf(roomId) !== -1 &&
                Math.random() < this.FIND_KEY_CHANCE) {
                s.meta.estateFind = { id: 'house_key', room: roomId };
                Grimoire.log(s, keyDef.seen);
                Grimoire.mark('estate', 'log');
                return true;
            }
        }
        var pool = this.findsFor(roomId);
        var buffs = [];
        var i;
        for (i = 0; i < pool.length; i++) {
            if (pool[i].kind !== 'key') buffs.push(pool[i]);
        }
        if (!buffs.length) return false;
        var chance = this.cooking(s, roomId) ? this.FIND_CHANCE_RETURN : this.FIND_CHANCE;
        if (Math.random() >= chance) return false;
        var pick = buffs[Math.floor(Math.random() * buffs.length)];
        s.meta.estateFind = { id: pick.id, room: roomId };
        Grimoire.log(s, pick.seen);
        Grimoire.mark('estate', 'log');
        return true;
    },

    takeFind: function (s) {
        this.ensure(s);
        var sitting = s.meta.estateFind;
        if (!sitting || sitting.room !== this.current(s)) return false;
        var def = this.findDef(sitting.id);
        s.meta.estateFind = null;
        s.meta.estateFindCool = (s.meta.playMs || 0) + this.FIND_COOLDOWN_MS;
        if (def && def.kind === 'key') {
            s.meta.estateKey = true;
            Grimoire.log(s, def.take);
        } else if (def) {
            s.meta.estateBuff = { id: def.id, left: def.dur };
            Grimoire.log(s, def.take);
        }
        Grimoire.mark('estate', 'jobs', 'buttons', 'resources', 'projects');
        return true;
    },

    buffLeft: function (s) {
        var b = s.meta.estateBuff;
        if (!b || !b.id || !(b.left > 0)) return 0;
        return b.left;
    },

    buffMul: function (s, kind) {
        var b = s.meta.estateBuff;
        if (!b || !b.id || !(b.left > 0)) return 1;
        var def = this.findDef(b.id);
        if (!def) return 1;
        if (def.kind === kind) return def.mul;
        if (def.kind === 'house' && (kind === 'render' || kind === 'collate' || kind === 'bath' || kind === 'drip')) {
            return def.mul;
        }
        return 1;
    },

    buffLine: function (s) {
        var left = this.buffLeft(s);
        if (left <= 0) return '';
        var def = this.findDef(s.meta.estateBuff.id);
        if (!def) return '';
        return def.name + ' · ' + def.buff + ' · ' + Math.ceil(left) + 's';
    },

    advanceBuff: function (s, dt) {
        var b = s.meta.estateBuff;
        if (!b || !b.id) return;
        if (!this.houseLive(s)) return;
        b.left -= dt;
        if (b.left <= 0) {
            s.meta.estateBuff = null;
            Grimoire.log(s, 'the scrap is spent.');
            Grimoire.mark('estate', 'jobs', 'buttons');
        }
    },

    cooking: function (s, roomId) {
        this.ensure(s);
        if (roomId === 'glasshouse') {
            return this.isLit(s, 'glasshouse');
        }
        var b = s.meta.estateBatches[roomId];
        return !!(b && b.active);
    },

    workProgress: function (s, roomId) {
        this.ensure(s);
        if (roomId === 'glasshouse') {
            if (!this.isLit(s, 'glasshouse')) return null;
            return (s.meta.estateBatches.glasshouse && s.meta.estateBatches.glasshouse.progress) || 0;
        }
        var b = s.meta.estateBatches[roomId];
        if (!b || !b.active) return null;
        var p = b.progress || 0;
        if (p < 0) p = 0;
        if (p > 1) p = 1;
        return p;
    },

    isWorkPaused: function (s, roomId) {
        if (this.workProgress(s, roomId) == null) return false;
        if (!this.houseLive(s)) return true;
        var b = s.meta.estateBatches[roomId];
        if (b && b.spoiled) return true;
        if (roomId === 'library' && !this.libraryCanProgress(s)) return true;
        return false;
    },

    progressPhrase: function (s, roomId) {
        var p = this.workProgress(s, roomId);
        if (p == null) return '';
        if (this.isSpoiled(s, roomId)) return 'soured';
        if (this.isWorkPaused(s, roomId)) return 'waiting';
        if (p >= 0.8) return 'almost done';
        if (p >= 0.45) return 'underway';
        return 'just started';
    },

    nameLine: function (s, roomId) {
        var seen = this.isSeen(s, roomId);
        var name = seen ? this.roomName(roomId).toUpperCase() : '····';
        if (roomId === 'gate' && seen) name = 'the gate';
        var mark = '';
        if (this.current(s) === roomId) mark += '@';
        if (s.meta.dispatchedQuill === roomId) mark += 'q';
        if (this.hasFind(s, roomId)) mark += '!';
        if (name.length + (mark ? 1 : 0) + mark.length > 12) {
            name = name.slice(0, 12 - mark.length - (mark ? 1 : 0));
        }
        var gap = 12 - name.length - mark.length;
        if (gap < 0) gap = 0;
        var sp = '            ';
        return name + sp.slice(0, gap) + mark;
    },

    pad12: function (text) {
        var t = String(text);
        if (t.length > 12) return t.slice(0, 12);
        var left = Math.floor((12 - t.length) / 2);
        var right = 12 - t.length - left;
        var sp = '            ';
        return sp.slice(0, left) + t + sp.slice(0, right);
    },

    asciiFrame: function () {
        return (Grimoire.view && Grimoire.view.asciiFrame) || 0;
    },

    flairLine: function (s, roomId) {
        var f = this.asciiFrame() % 4;
        var cooking = this.workProgress(s, roomId) != null;
        var paused = this.isWorkPaused(s, roomId);
        var here = this.current(s) === roomId;
        var live = this.houseLive(s);
        if (!this.isSeen(s, roomId)) return this.pad12('····');
        if (roomId === 'hall') {
            if (here) return this.pad12(['.  .', ' . .', '. . ', '  . '][f]);
            return this.pad12('.');
        }
        if (roomId === 'gate') {
            if (s.meta.packetLeft) return this.pad12(f % 2 ? '.  .' : '. .');
            return this.pad12(['. : . :', ': . : .', '. : . :', ' : . : '][f]);
        }
        if (!this.isLit(s, roomId)) {
            if (roomId === 'cellars') return this.pad12('n    n');
            if (roomId === 'library') return this.pad12('||| |||');
            if (roomId === 'glasshouse') return this.pad12('.    .');
            if (roomId === 'vault') return this.pad12('U');
            return this.pad12('');
        }
        var line = '';
        if (roomId === 'cellars') {
            if (cooking && live && !paused) {
                line = ['n ~ n', 'n n ~', '~ n n', 'n ~ n'][f];
            } else if (cooking) line = 'n . n';
            else line = 'n   n';
        } else if (roomId === 'library') {
            if (cooking && live && !paused) line = ['|#| |=|', '|=| |#|', '|:| |=|', '|=| |:|'][f];
            else if (cooking) line = '|=| |?|';
            else line = '|=| |=|';
        } else if (roomId === 'glasshouse') {
            if (live) line = ["*'  *", '*  \'*', '* . *', '*  *\''][f];
            else line = '*    *';
        } else if (roomId === 'vault') {
            if (cooking && live && !paused) line = ['(~)', '(-)', '(~)', '( )'][f];
            else if (cooking) line = '(.)';
            else line = 'U';
        }
        return this.pad12(line);
    },

    interiorArt: function (s, roomId) {
        var f = this.asciiFrame() % 4;
        var cooking = this.workProgress(s, roomId) != null;
        var live = this.houseLive(s);
        var paused = this.isWorkPaused(s, roomId);
        var stir = live && cooking && !paused;
        if (roomId === 'hall') {
            var named = Grimoire.hasUnlock(s, 'hall_lantern') ? '   the dark keeps names' : '   four dark mouths';
            return [
                '        |',
                '     ---@---',
                '        |',
                named
            ].join('\n');
        }
        if (roomId === 'gate') {
            var gravel = ['. : . : .', ': . : . :', '. : . : .', ' : . : . '][f];
            if (s.meta.packetLeft) {
                return ['    ' + gravel, '      .  .', '   the drive is empty'].join('\n');
            }
            return ['    ' + gravel, '      [  ]', '   the lantern stops'].join('\n');
        }
        if (roomId === 'cellars') {
            if (this.isSpoiled(s, 'cellars')) {
                return ['  n   n   n', ' (x) (x) ( )', '  ==========', '   the fat is cold'].join('\n');
            }
            var hooks = stir ? ['  n   n~  n', '  n~  n   n', ' ~n   n   n', '  n   n  ~n'][f] : '  n   n   n';
            var hides = stir ? [' ( ) (~) ( )', ' (~) ( ) ( )', ' ( ) ( ) (~)', ' (.) ( ) ( )'][f] : ' ( ) ( ) ( )';
            return [hooks, hides, '  ==========', '   cool stone'].join('\n');
        }
        if (roomId === 'library') {
            var shelf = stir ? [' |#|  |=|  |-|', ' |=|  |#|  |=|', ' |-|  |=|  |#|', ' |=|  |-|  |=|'][f] : ' |=|  |=|  |=|';
            return [' |||  |||  |||', shelf, '  the leaves wait'].join('\n');
        }
        if (roomId === 'glasshouse') {
            var drip = live ? ["  *'  *   *", "  *   *'  *", "  *   *   *'", '  * . *   *'][f] : '  *   *   *';
            return ['   glass and earth', drip, '  the season keeps'].join('\n');
        }
        if (roomId === 'vault') {
            if (this.isSpoiled(s, 'vault')) {
                return ['   a ruined basin', '    ( x )', '  the bath is cold'].join('\n');
            }
            var basin = stir ? ['    ( ~ )', '    ( - )', '    ( ~ )', '    (   )'][f] : '    ( U )';
            return ['   a dry basin', basin, '  ink takes tarnish'].join('\n');
        }
        return '';
    },

    houseIdleUnfinished: function (s) {
        this.ensure(s);
        for (var i = 0; i < this.WORK.length; i++) {
            var id = this.WORK[i];
            if (!this.isLit(s, id)) return true;
            if (this.cooking(s, id) && id !== 'glasshouse') return true;
        }
        return false;
    },

    toolCount: function (s, roomId) {
        return (s.purchased && s.purchased[this.toolId(roomId)]) || 0;
    },

    toolMul: function (s, roomId) {
        return Math.pow(this.TOOL_MUL, this.toolCount(s, roomId));
    },

    quillMul: function (s, roomId) {
        return s.meta.dispatchedQuill === roomId ? this.QUILL_MUL : 1;
    },

    presenceMul: function (s, roomId) {
        if (s.meta.estateRoom !== roomId) return 1;
        if (roomId === 'cellars' || roomId === 'vault') return this.PRESENCE_MUL;
        return 1;
    },

    houseMul: function (s) {
        return Grimoire.hasUnlock(s, 'file_folios') ? this.HOUSE_FILE_MUL : 1;
    },

    seasonMul: function (s, roomId) {
        var name = Grimoire.CONTENT.seasons[s.meta.season] || 'Spring';
        if (roomId === 'cellars') {
            if (name === 'Solstice') return 1.5;
            if (name === 'Autumn') return 1.15;
            if (name === 'Equinox') return 0.9;
        }
        if (roomId === 'library') {
            if (name === 'Equinox') return 1.4;
            if (name === 'Solstice') return 0.8;
        }
        if (roomId === 'vault') {
            if (name === 'Equinox') return 0.7;
            if (name === 'Solstice') return 1.2;
        }
        return 1;
    },

    isSpoiled: function (s, roomId) {
        this.ensure(s);
        var b = s.meta.estateBatches[roomId];
        return !!(b && b.active && b.spoiled);
    },

    progressRate: function (s, roomId) {
        var base = this.BASE_DURATION[roomId];
        if (!base) return 0;
        var b = s.meta.estateBatches[roomId];
        if (!b || !b.active) return 0;
        if (b.spoiled) return 0;
        if (roomId === 'library' && !this.libraryCanProgress(s)) return 0;
        var kind = roomId === 'cellars' ? 'render' : roomId === 'library' ? 'collate' : 'bath';
        var mul = this.toolMul(s, roomId) * this.quillMul(s, roomId) * this.buffMul(s, kind) *
            this.presenceMul(s, roomId) * this.seasonMul(s, roomId) * this.houseMul(s);
        if (roomId === 'vault' && b.usedExtract) mul *= this.EXTRACT_MUL;
        return mul / base;
    },

    libraryCanProgress: function (s) {
        if (s.meta.estateRoom === 'library') return true;
        if (s.meta.dispatchedQuill === 'library') return true;
        return Grimoire.hasUnlock(s, 'mechanical_cataloger');
    },

    extractRate: function (s) {
        if (!this.isLit(s, 'glasshouse')) return 0;
        var rate = 1 / this.EXTRACT_BASE;
        rate *= this.toolMul(s, 'glasshouse');
        if (s.meta.estateRoom === 'glasshouse') rate *= 2;
        if (s.meta.dispatchedQuill === 'glasshouse') rate *= 2;
        rate *= this.buffMul(s, 'drip');
        rate *= this.houseMul(s);
        var season = Grimoire.CONTENT.seasons[s.meta.season] || 'Spring';
        if (season === 'Solstice') rate *= 2;
        else if (season === 'Equinox') rate *= 0.5;
        return rate;
    },

    secondsLeft: function (s, roomId) {
        if (roomId === 'glasshouse') {
            var er = this.extractRate(s);
            if (er <= 0) return 0;
            var gp = (s.meta.estateBatches.glasshouse && s.meta.estateBatches.glasshouse.progress) || 0;
            return (1 - gp) / er;
        }
        var b = s.meta.estateBatches[roomId];
        if (!b || !b.active) return 0;
        var r = this.progressRate(s, roomId);
        if (r <= 0) return 0;
        return (1 - (b.progress || 0)) / r;
    },

    houseLive: function (s) {
        return !!(s.meta.deskRevealed && s.meta.candleLit && s.resources.oil > 0);
    },

    canStart: function (s, roomId) {
        if (!this.houseLive(s)) return false;
        if (!this.isLit(s, roomId)) return false;
        this.ensure(s);
        var b = s.meta.estateBatches[roomId];
        if (roomId === 'glasshouse') return false;
        if (b && b.active) return false;
        if (roomId === 'cellars') return s.resources.tallow >= this.RENDER_TALLOW;
        if (roomId === 'library') {
            return s.resources.vellum >= this.COLLATE_VELLUM && s.resources.ink >= this.COLLATE_INK;
        }
        if (roomId === 'vault') return s.resources.ink >= this.BATH_INK;
        return false;
    },

    startBatch: function (s, roomId) {
        if (!this.canStart(s, roomId)) return false;
        this.ensure(s);
        var b = s.meta.estateBatches[roomId];
        if (roomId === 'cellars') {
            s.resources.tallow -= this.RENDER_TALLOW;
            b.usedExtract = false;
            Grimoire.log(s, 'a hide is set to render.');
        } else if (roomId === 'library') {
            s.resources.vellum -= this.COLLATE_VELLUM;
            s.resources.ink -= this.COLLATE_INK;
            b.usedExtract = false;
            Grimoire.log(s, 'leaves laid out. the folio will take time.');
        } else if (roomId === 'vault') {
            s.resources.ink -= this.BATH_INK;
            b.usedExtract = s.resources.extracts >= 1;
            if (b.usedExtract) {
                s.resources.extracts -= 1;
                Grimoire.log(s, 'ink and a drop of extract into the bath.');
            } else {
                Grimoire.log(s, 'ink into the bath. it will take the metal slowly.');
            }
        } else {
            return false;
        }
        b.active = true;
        b.progress = 0;
        b.spoiled = false;
        Grimoire.mark('estate', 'resources', 'projects', 'buttons');
        return true;
    },

    completeBatch: function (s, roomId) {
        this.ensure(s);
        var b = s.meta.estateBatches[roomId];
        if (b) {
            b.active = false;
            b.progress = 0;
            b.usedExtract = false;
            b.spoiled = false;
        }
        if (roomId === 'cellars') {
            s.resources.vellum += 1;
            Grimoire.noteFirstVellum(s);
            Grimoire.log(s, 'the hide is vellum now.');
        } else if (roomId === 'library') {
            s.resources.folios += 1;
            Grimoire.noteFirstFolio(s);
            Grimoire.log(s, 'a folio is sewn. it could leave the house.');
        } else if (roomId === 'vault') {
            s.resources.silver += 1;
            Grimoire.noteFirstSilver(s);
            Grimoire.log(s, 'the bath gives up a coin.');
        }
        Grimoire.mark('estate', 'resources', 'projects', 'buttons', 'layout');
    },

    onLit: function (s, roomId) {
        this.ensure(s);
        s.meta.estateSeen[roomId] = true;
        Grimoire.mark('estate', 'layout', 'resources', 'projects');
    },

    canDispatch: function (s, roomId) {
        if (!roomId || !this.isWork(roomId)) return false;
        if (!this.isLit(s, roomId)) return false;
        if (s.meta.dispatchedQuill) return false;
        if ((s.generators.quills || 0) < 1) return false;
        return Grimoire.jobs.totalAssigned(s) >= 1;
    },

    dispatch: function (s, roomId) {
        if (!this.canDispatch(s, roomId)) return false;
        var a = s.generators.assignments;
        var order = ['transcribe', 'copy', 'ward', 'attend'];
        var took = false;
        for (var i = 0; i < order.length; i++) {
            if ((a[order[i]] || 0) > 0) {
                a[order[i]] -= 1;
                took = true;
                break;
            }
        }
        if (!took) return false;
        s.meta.dispatchedQuill = roomId;
        Grimoire.log(s, 'a feather leaves the study. it goes to the ' + this.roomName(roomId) + '.');
        Grimoire.mark('estate', 'jobs', 'resources', 'buttons');
        return true;
    },

    recall: function (s, opts) {
        opts = opts || {};
        if (!s.meta.dispatchedQuill) return false;
        var from = s.meta.dispatchedQuill;
        s.meta.dispatchedQuill = null;
        s.generators.assignments.transcribe = (s.generators.assignments.transcribe || 0) + 1;
        if (!opts.silent) {
            Grimoire.log(s, 'the feather comes back to transcribe.');
        }
        Grimoire.mark('estate', 'jobs', 'resources', 'buttons');
        return from;
    },

    tick: function (s, dt) {
        if (!s.meta.shuttersOpen) return;
        this.ensure(s);
        if (!this.houseLive(s)) return;
        var working = false;
        var rooms = ['cellars', 'library', 'vault'];
        for (var i = 0; i < rooms.length; i++) {
            var id = rooms[i];
            var b = s.meta.estateBatches[id];
            if (!b || !b.active) continue;
            working = true;
            var rate = this.progressRate(s, id);
            if (rate <= 0) continue;
            b.progress += rate * dt;
            if (b.progress >= 1) this.completeBatch(s, id);
        }
        if (this.isLit(s, 'glasshouse')) {
            working = true;
            var g = s.meta.estateBatches.glasshouse;
            g.progress += this.extractRate(s) * dt;
            var n = 0;
            while (g.progress >= 1) {
                g.progress -= 1;
                n += 1;
            }
            if (n > 0) {
                s.resources.extracts += n;
                Grimoire.noteFirstExtracts(s);
                Grimoire.mark('resources', 'projects', 'buttons');
            }
        }
        if (working) Grimoire.mark('estate');
        this.advanceBuff(s, dt);
    },

    anyCooking: function (s) {
        this.ensure(s);
        for (var i = 0; i < this.WORK.length; i++) {
            if (this.cooking(s, this.WORK[i])) return true;
        }
        return false;
    },

    onDrown: function (s) {
        this.ensure(s);
        var rooms = ['cellars', 'vault'];
        var spoiled = false;
        for (var i = 0; i < rooms.length; i++) {
            var b = s.meta.estateBatches[rooms[i]];
            if (b && b.active && !b.spoiled) {
                b.spoiled = true;
                spoiled = true;
            }
        }
        if (spoiled) {
            Grimoire.log(s, Grimoire.CONTENT.estateDrown);
            Grimoire.mark('estate', 'log', 'buttons');
        }
    },

    canSalvage: function (s, roomId) {
        this.ensure(s);
        if (this.current(s) !== roomId) return false;
        return this.isSpoiled(s, roomId);
    },

    salvageBatch: function (s, roomId) {
        if (!this.canSalvage(s, roomId)) return false;
        var b = s.meta.estateBatches[roomId];
        b.active = false;
        b.progress = 0;
        b.usedExtract = false;
        b.spoiled = false;
        if (roomId === 'cellars') {
            s.resources.tallow += this.SALVAGE_CELLARS_TALLOW;
            Grimoire.clampResource(s, 'tallow', Grimoire.candle.tallowCap(s));
            Grimoire.log(s, Grimoire.CONTENT.estateSalvageCellars);
        } else if (roomId === 'vault') {
            s.resources.ink += this.SALVAGE_VAULT_INK;
            Grimoire.log(s, Grimoire.CONTENT.estateSalvageVault);
        } else {
            Grimoire.log(s, Grimoire.CONTENT.estateDump);
        }
        Grimoire.mark('estate', 'resources', 'projects', 'buttons', 'log');
        return true;
    },

    dumpBatch: function (s, roomId) {
        if (!this.canSalvage(s, roomId)) return false;
        var b = s.meta.estateBatches[roomId];
        b.active = false;
        b.progress = 0;
        b.usedExtract = false;
        b.spoiled = false;
        Grimoire.log(s, Grimoire.CONTENT.estateDump);
        Grimoire.mark('estate', 'resources', 'projects', 'buttons', 'log');
        return true;
    },

    listenMood: function (s, roomId) {
        if (!this.houseLive(s)) return 'dark';
        if (roomId === 'gate' && s.meta.packetLeft) return 'empty';
        if (roomId === 'hall' && s.meta.packetLeft && !this.anyCooking(s)) return 'empty';
        if (this.anyCooking(s)) return 'cooking';
        return 'idle';
    },

    canListen: function (s) {
        this.ensure(s);
        var room = this.current(s);
        if (room !== 'hall' && room !== 'gate') return false;
        return (s.meta.playMs || 0) >= (s.meta.estateListenCool || 0);
    },

    listen: function (s) {
        if (!this.canListen(s)) return false;
        var room = this.current(s);
        var mood = this.listenMood(s, room);
        var table = Grimoire.CONTENT.estateListen || {};
        var lines = table[room] || {};
        var line = lines[mood] || lines.idle;
        if (line) Grimoire.log(s, line);
        s.meta.estateListenCool = (s.meta.playMs || 0) + this.LISTEN_COOLDOWN_MS;
        Grimoire.mark('estate', 'log', 'buttons');
        return true;
    },

    canOpenDrawer: function (s) {
        this.ensure(s);
        if (this.current(s) !== 'hall') return false;
        if (!s.meta.estateKey || !s.meta.packetLeft) return false;
        return !s.meta.drawerOpen;
    },

    openDrawer: function (s) {
        if (!this.canOpenDrawer(s)) return false;
        s.meta.drawerOpen = true;
        Grimoire.log(s, Grimoire.CONTENT.drawerOpen, { highlight: true });
        Grimoire.mark('estate', 'log', 'projects', 'buttons');
        return true;
    },

    catchUp: function (s, seconds) {
        if (seconds <= 0 || !s.meta.shuttersOpen) return;
        this.ensure(s);
        if (!this.houseLive(s)) return;
        var rooms = ['cellars', 'library', 'vault'];
        for (var i = 0; i < rooms.length; i++) {
            var id = rooms[i];
            var b = s.meta.estateBatches[id];
            if (!b || !b.active) continue;
            var rate = this.progressRate(s, id);
            if (rate <= 0) continue;
            b.progress += rate * seconds;
            if (b.progress >= 1) this.completeBatch(s, id);
        }
        if (this.isLit(s, 'glasshouse')) {
            var g = s.meta.estateBatches.glasshouse;
            var gained = (g.progress || 0) + this.extractRate(s) * seconds;
            var whole = Math.floor(gained);
            if (whole > 0) {
                s.resources.extracts += whole;
                Grimoire.noteFirstExtracts(s);
            }
            g.progress = gained - whole;
            Grimoire.mark('resources', 'estate');
        }
    },

    mapSig: function (s) {
        this.ensure(s);
        var here = this.current(s);
        var parts = [here, s.meta.dispatchedQuill || '', this.houseLive(s) ? '1' : '0',
            (s.meta.estateFind && s.meta.estateFind.room) || '', this.buffLeft(s) > 0 ? 'b' : ''];
        var ids = ['glasshouse', 'library', 'hall', 'vault', 'cellars', 'gate'];
        for (var i = 0; i < ids.length; i++) {
            var id = ids[i];
            var p = this.workProgress(s, id);
            parts.push(id + (this.isSeen(s, id) ? 's' : '.') + (this.isLit(s, id) ? 'L' : 'd') +
                (p == null ? '' : 'w') + (this.isWorkPaused(s, id) ? 'P' : '') +
                (this.isSpoiled(s, id) ? 'X' : '') +
                (here === id ? '@' : '') +
                (s.meta.dispatchedQuill === id ? 'q' : '') + (this.hasFind(s, id) ? '!' : '') + (this.canWalk(s, id) ? '>' : ''));
        }
        return parts.join('|');
    },

    cellClass: function (s, roomId) {
        var cls = 'map-room';
        if (this.current(s) === roomId) cls += ' is-here';
        if (this.canWalk(s, roomId)) cls += ' is-near';
        if (!this.isSeen(s, roomId)) cls += ' is-fog';
        else if (this.isWork(roomId) && !this.isLit(s, roomId)) cls += ' is-dark';
        else cls += ' is-open';
        var p = this.workProgress(s, roomId);
        if (p != null) {
            cls += ' is-work';
            if (this.isSpoiled(s, roomId)) cls += ' is-paused is-spoiled';
            else if (this.isWorkPaused(s, roomId)) cls += ' is-paused';
            else if (p >= 0.8) cls += ' is-late';
            else if (p >= 0.45) cls += ' is-mid';
            else cls += ' is-early';
        }
        if (this.hasFind(s, roomId)) cls += ' is-find';
        return cls;
    },

    roomLabel: function (s, roomId) {
        var label = this.isSeen(s, roomId) ? this.roomName(roomId) : 'unlit wing';
        if (this.current(s) === roomId) label += ', you are here';
        if (s.meta.dispatchedQuill === roomId) label += ', a quill is here';
        if (this.hasFind(s, roomId)) label += ', something left here';
        var phrase = this.progressPhrase(s, roomId);
        if (phrase) label += ', ' + phrase;
        else if (this.isWork(roomId) && this.isLit(s, roomId)) label += ', idle';
        return label;
    },

    cellHtml: function (s, roomId) {
        var walk = this.canWalk(s, roomId);
        var here = this.current(s) === roomId;
        var tag = (walk || here) ? 'button' : 'div';
        var extra = '';
        if (tag === 'button') {
            extra = ' type="button" data-room="' + roomId + '"';
            if (here) extra += ' aria-current="true"';
        } else {
            extra = ' data-room="' + roomId + '"';
        }
        extra += ' aria-label="' + this.roomLabel(s, roomId) + '"';
        var p = this.workProgress(s, roomId);
        var pct = p == null ? 0 : Math.max(0, Math.min(100, Math.round(p * 100)));
        var meter = '';
        if (this.isWork(roomId) && this.isSeen(s, roomId)) {
            meter = '<span class="map-meter' + (p != null ? ' is-on' : '') +
                '" aria-hidden="true"><span class="map-meter-fill" style="width:' + pct +
                '%"></span></span>';
        }
        return '<' + tag + ' class="' + this.cellClass(s, roomId) + '"' + extra + '>' +
            '<pre class="map-room-art" aria-hidden="true">' +
            '.------------.\n|' +
            '<span class="map-room-flair">' + this.flairLine(s, roomId) + '</span>' +
            '|\n|' +
            '<span class="map-room-name">' + this.nameLine(s, roomId) + '</span>' +
            "|\n'------------'" +
            '</pre>' + meter +
            '</' + tag + '>';
    },

    mapHtml: function (s) {
        this.ensure(s);
        var c = this.cellHtml.bind(this, s);
        var bar = '<div class="map-conn map-conn-v" aria-hidden="true">|</div>';
        var hy = '<div class="map-conn map-conn-h" aria-hidden="true">--</div>';
        var empty = '<div class="map-empty" aria-hidden="true"></div>';
        return '<div class="estate-map-grid">' +
            empty + empty + c('glasshouse') + empty + empty +
            empty + empty + bar + empty + empty +
            c('library') + hy + c('hall') + hy + c('vault') +
            empty + empty + bar + empty + empty +
            empty + empty + c('cellars') + empty + empty +
            empty + empty + bar + empty + empty +
            empty + empty + c('gate') + empty + empty +
            '</div>' +
            '<p class="map-legend muted">@ you · q quill · ! a scrap · a gold bar means work is cooking. fuller is closer to done. arrows walk.</p>';
    },

    startLabel: function (s, roomId) {
        if (roomId === 'cellars') return 'Render a hide — ' + this.RENDER_TALLOW + ' tallow';
        if (roomId === 'library') {
            return 'Collate a folio — ' + this.COLLATE_VELLUM + ' vellum, ' + this.COLLATE_INK + ' ink';
        }
        if (roomId === 'vault') {
            if (s.resources.extracts >= 1) return 'Charge the bath — ' + this.BATH_INK + ' ink, 1 extract';
            return 'Charge the bath — ' + this.BATH_INK + ' ink';
        }
        return '';
    }
};
