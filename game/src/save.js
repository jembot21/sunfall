(function () {
  'use strict';
  var key='sunfall-v2-save';
  function clamp(value,min,max,fallback){return Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;}
  function save(){
    try{
      var p=SF.player,w=SF.weapons,m=SF.missions;
      var reserve=w.ammo.map(function(a,index){return index?a.mag+a.reserve:0;});
      localStorage.setItem(key,JSON.stringify({
        version:2,cash:p.cash,rep:p.rep,owned:w.owned.slice(),ammo:reserve,
        storyDone:m.storyDone,sideDone:m.sideDone,safehouseUnlocks:m.safehouseUnlocks.slice(),day:SF.day||1
      }));
      return true;
    }catch(error){
      if(SF.hud)SF.hud.toast('Could not save · local storage is unavailable.');
      return false;
    }
  }
  function load(){
    try{
      var raw=localStorage.getItem(key);if(!raw)return false;
      var data=JSON.parse(raw);
      if(!data||data.version!==2||!Array.isArray(data.owned)||!Array.isArray(data.ammo))return false;
      var p=SF.player,w=SF.weapons,m=SF.missions;
      p.cash=clamp(data.cash,0,100000000,350);p.rep=clamp(data.rep,0,10000000,0);
      for(var i=1;i<w.defs.length;i++){
        w.owned[i]=data.owned[i]===true;
        var total=Math.floor(clamp(data.ammo[i],0,w.defs[i].reserve+w.defs[i].mag,0));
        w.ammo[i].mag=Math.min(total,w.defs[i].mag);w.ammo[i].reserve=total-w.ammo[i].mag;
      }
      w.owned[0]=true;m.storyDone=Math.floor(clamp(data.storyDone,0,m.list.length,0));
      m.sideDone=Math.floor(clamp(data.sideDone,0,1000000,0));
      m.safehouseUnlocks=[0];
      if(Array.isArray(data.safehouseUnlocks)&&data.safehouseUnlocks.indexOf(1)>=0)m.safehouseUnlocks.push(1);
      for(var j=0;j<m.storyDone;j++)if(m.list[j].unlock!==undefined)w.unlock(m.list[j].unlock);
      if(m.storyDone>=7)w.unlock(4);
      SF.day=Math.floor(clamp(data.day,1,99999,1));return true;
    }catch(error){return false;}
  }
  SF.save={
    key:key,save:save,load:load,
    reset:function(){try{localStorage.removeItem(key);return true;}catch(error){return false;}}
  };
}());
