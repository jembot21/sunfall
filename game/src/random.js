(function () {
  var seed = 0x51f411;
  function next() {
    seed = (seed + 0x6D2B79F5) | 0;
    var t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  var helpers = {
    next: next,
    random: next,
    range: function (min, max) { return min + next() * (max - min); },
    pick: function (items) { return items[Math.floor(next() * items.length)]; },
    chance: function (probability) { return next() < probability; },
    reseed: function (value) { seed = (Number(value) || 0) | 0; },
    shuffle: function (items) {
      var copy = items.slice();
      for (var i = copy.length - 1; i > 0; i--) {
        var j = Math.floor(next() * (i + 1));
        var tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
      }
      return copy;
    }
  };
  Object.assign(SF, helpers);
  SF.random = helpers;
  SF.rng = helpers;
}());
