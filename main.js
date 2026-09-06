(function () {
    Grimoire.state = Grimoire.loadFromStorage();
    Grimoire.view.bind();
    if (Grimoire.DEBUG && Grimoire.debug) Grimoire.debug.mount();
    if (Grimoire.state.meta.checksumWarn) {
        Grimoire.log(Grimoire.state, 'the copy is smudged. the last clean page remains.', { highlight: true });
    }
    Grimoire.view.hydrateLog(Grimoire.state);
    Grimoire.markAll();
    Grimoire.view.draw();
    Grimoire.engine.start();
})();
