'use strict';
// Deterministic city layout; simulation decisions use the same inexpensive generator.
SF.seed=1709;
SF.random=function(){ SF.seed=(Math.imul(SF.seed,1664525)+1013904223)|0; return (SF.seed>>>0)/4294967296; };
SF.range=function(a,b){return a+(b-a)*SF.random();};
