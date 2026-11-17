'use strict';
// Shared constants and the single game namespace. Distances are metres.
window.SF = { C: { size: 440, roads: [-192,-128,-64,0,64,128,192], roadWidth: 15,
  hospital: {x:-192,z:64}, station:{x:64,z:128}, hideout:{x:-192,z:-128},
  food: {x:-64,z:64}, start:{x:-4,z:75} }, time:0, frame:0, mode:'title',
  cash:80, story:0, health:100, wanted:0, car:null, notice:'', noticeUntil:0,
  settings:{sound:true,sensitivity:1}, temp:new THREE.Object3D() };
SF.clamp = function(v,a,b){ return Math.max(a,Math.min(b,v)); };
SF.dist = function(a,b){ return Math.hypot(a.x-b.x,a.z-b.z); };
SF.angle = function(a){ return Math.atan2(Math.sin(a),Math.cos(a)); };
SF.message = function(s,seconds){ SF.notice=s; SF.noticeUntil=SF.time+(seconds||5); };
