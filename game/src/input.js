(function () {
  'use strict';
  // One physical-key map serves driving, walking, menus and contextual interaction.
  var down = Object.create(null), edges = Object.create(null);
  var mouseX = 0, mouseY = 0, locked = false;
  var canvas = document.getElementById('game');
  var bindings = {
    forward:['KeyW','ArrowUp'], reverse:['KeyS','ArrowDown'],
    left:['KeyA','ArrowLeft'], right:['KeyD','ArrowRight'],
    sprint:['ShiftLeft','ShiftRight'], jump:['Space'], interact:['KeyE','KeyF'],
    enter:['KeyE'], attack:[], reload:['KeyR'],
    weapon1:['Digit1'], weapon2:['Digit2'], weapon3:['Digit3'], weapon4:['Digit4'], weapon5:['Digit5'],
    radio:['KeyN'], map:['KeyM'], pause:['Escape','KeyP']
  };
  var actions = Object.create(null);
  Object.keys(bindings).forEach(function(action){
    bindings[action].forEach(function(code){actions[code]=action;});
  });
  window.addEventListener('keydown',function(event){
    var action=actions[event.code];
    if(action||event.code==='Space')event.preventDefault();
    if(action&&!down[action])edges[action]=true;
    if(action)down[action]=true;
  });
  window.addEventListener('keyup',function(event){var action=actions[event.code];if(action)down[action]=false;});
  canvas.addEventListener('click',function(){
    if(document.pointerLockElement!==canvas&&canvas.requestPointerLock){
      var result=canvas.requestPointerLock();if(result&&result.catch)result.catch(function(){});
    }
  });
  canvas.addEventListener('mousedown',function(event){
    if(event.button===0&&document.pointerLockElement===canvas){
      if(!down.attack)edges.attack=true;down.attack=true;
    }
  });
  window.addEventListener('mouseup',function(event){if(event.button===0)down.attack=false;});
  canvas.addEventListener('contextmenu',function(event){event.preventDefault();});
  window.addEventListener('blur',function(){
    Object.keys(down).forEach(function(action){down[action]=false;});
    mouseX=mouseY=0;
  });
  document.addEventListener('mousemove',function(event){
    if(document.pointerLockElement===canvas){mouseX+=event.movementX||0;mouseY+=event.movementY||0;}
  });
  document.addEventListener('pointerlockchange',function(){locked=document.pointerLockElement===canvas;});
  document.addEventListener('pointerlockerror',function(){locked=false;});
  SF.input={
    isDown:function(key){return !!down[actions[key]||key];},
    pressed:function(key){var action=actions[key]||key,hit=!!edges[action];edges[action]=false;return hit;},
    get lookDX(){return mouseX;},get lookDY(){return mouseY;},get locked(){return locked;},
    clearLook:function(){mouseX=mouseY=0;},
    clearEdges:function(){Object.keys(edges).forEach(function(action){edges[action]=false;});}
  };
}());
