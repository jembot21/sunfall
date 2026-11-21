(function () {
  'use strict';
  // Stable world population and capture staging share this seeded stream.
  var seed = 0x20f411;
  function next() {
    seed = (seed + 0x6D2B79F5) | 0;
    var value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }
  var api = {
    next:next, random:next,
    range:function(min,max){return min+next()*(max-min);},
    pick:function(items){return items[Math.floor(next()*items.length)];},
    chance:function(probability){return next()<probability;},
    reseed:function(value){seed=(Number(value)||0)|0;},
    shuffle:function(items){
      var copy=items.slice();
      for(var i=copy.length-1;i>0;i--){var j=Math.floor(next()*(i+1)),t=copy[i];copy[i]=copy[j];copy[j]=t;}
      return copy;
    }
  };
  SF.random=api;SF.rng=api;
}());
