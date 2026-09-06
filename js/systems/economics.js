var Grimoire = window.Grimoire || (window.Grimoire = {});

Grimoire.economics = {
    geometricCost: function (base, rate, owned) {
        return Math.ceil(base * Math.pow(rate, owned));
    },

    bulkCost: function (base, rate, owned, n) {
        if (n <= 0) return 0;
        if (rate === 1) return Math.ceil(base * n);
        return Math.ceil(base * Math.pow(rate, owned) * (Math.pow(rate, n) - 1) / (rate - 1));
    },

    maxAffordable: function (base, rate, owned, currency) {
        var first = this.geometricCost(base, rate, owned);
        if (currency < first) return 0;
        if (rate === 1) return Math.floor(currency / base);
        var inner = currency * (rate - 1) / (base * Math.pow(rate, owned)) + 1;
        if (inner <= 1) return 0;
        return Math.floor(Math.log(inner) / Math.log(rate));
    },

    format: function (n) {
        if (!isFinite(n)) return '0';
        var sign = n < 0 ? '-' : '';
        n = Math.abs(n);
        if (n < 1000) {
            if (n === 0) return '0';
            if (n < 10 && n !== Math.floor(n)) return sign + n.toFixed(1);
            return sign + String(Math.floor(n));
        }
        var suffixes = ['K', 'M', 'B', 'T', 'Qa', 'Qi'];
        var i = -1;
        while (n >= 1000 && i < suffixes.length - 1) {
            n /= 1000;
            i++;
        }
        var digits = n >= 100 ? 0 : n >= 10 ? 1 : 2;
        return sign + n.toFixed(digits) + suffixes[i];
    }
};
