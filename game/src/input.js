'use strict';
// Held controls and consumable edges, with pointer lock available from the game canvas.
SF.input={keys:Object.create(null),edges:Object.create(null),yaw:0,pitch:.28,fire:false};
SF.input.take=function(k){const v=this.edges[k];this.edges[k]=false;return v;};
addEventListener('keydown',function(e){if(!SF.input.keys[e.code]&&!e.repeat)SF.input.edges[e.code]=true;SF.input.keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','Tab'].includes(e.code))e.preventDefault();});
addEventListener('keyup',function(e){SF.input.keys[e.code]=false;});
addEventListener('blur',function(){for(const k in SF.input.keys)SF.input.keys[k]=false;SF.input.fire=false;if(SF.mode==='play')SF.pause();});
addEventListener('mousemove',function(e){if(document.pointerLockElement&&SF.mode==='play'){SF.input.lastLook=SF.time;SF.input.yaw-=e.movementX*.0025*SF.settings.sensitivity;SF.input.pitch=SF.clamp(SF.input.pitch+e.movementY*.002,.06,.85);}});
addEventListener('mouseup',function(){SF.input.fire=false;});
addEventListener('contextmenu',function(e){e.preventDefault();});
