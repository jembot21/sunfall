(function () {
  'use strict';
  var ids = ['chapter-label','mission-title','mission-objective','stage-progress','stage-count','next-hint',
    'day-label','clock','cash','wanted-stars','wanted-status','hud-police','police-rows',
    'health-fill','health-value','armour-fill','armour-value','rep-fill','rep-value','rep-rank','district-name',
    'hud-vehicle','vehicle-name','stolen-tag','vehicle-condition','speed','gear','hud-dialogue','portrait',
    'speaker-name','speaker-role','dialogue-text','hud-toast','hud-radio','radio-track','map-overlay','map-legend',
    'busted','wasted','busted-fee','wasted-fee','hud-mission','hud-action','action-label'];
  var node = Object.create(null), cache = Object.create(null), frame = 0, accumulator = 0, day = 1, time = '17:40';
  for (var i=0;i<ids.length;i++) node[ids[i]]=document.getElementById(ids[i]);
  var slots = document.querySelectorAll('.weapon-slot'), toastTime = 0, radioTime = 0, dialogueTime = 0;
  var queue = [], current = null, mapOpen = false, previousStars = 0, previousMission = null, starTimer = 0;
  var mini = document.getElementById('minimap'), fullMap = document.getElementById('city-map');
  var miniCtx = mini.getContext('2d'), fullCtx = fullMap.getContext('2d');

  function text(id,value){value=String(value);if(cache[id]!==value){node[id].textContent=value;cache[id]=value;}}
  function style(id,key,value){var k=id+':'+key;if(cache[k]!==value){node[id].style[key]=value;cache[k]=value;}}
  function width(id,n){style(id,'width',Math.max(0,Math.min(100,n))+'%');}
  function show(id,on,display){style(id,'display',on?(display||'block'):'none');}
  function say(who,role,copy){if(queue.length>=3)queue.shift();queue.push({who:who,role:role,text:copy});}
  function toast(copy){text('hud-toast',copy);style('hud-toast','opacity','1');toastTime=3.2;}
  function dot(ctx,x,z,color,r,cx,cz,scale,size){
    ctx.fillStyle=color;ctx.beginPath();ctx.arc(size/2+(x-cx)*scale,size/2+(z-cz)*scale,r,0,Math.PI*2);ctx.fill();
  }
  function map(ctx,size,worldMap){
    var p=SF.player, cx=worldMap?-65:p.pos.x, cz=worldMap?0:p.pos.z, scale=worldMap?size/690:size/260;
    ctx.clearRect(0,0,size,size);ctx.fillStyle='#c3aa88';ctx.fillRect(0,0,size,size);
    var sea=size/2+(-260-cx)*scale;
    ctx.fillStyle='#247d83';ctx.fillRect(0,0,Math.max(0,sea),size);
    ctx.fillStyle='#dfc492';ctx.fillRect(Math.max(0,sea-9*scale),0,Math.max(0,12*scale),size);
    ctx.fillStyle='#625c55';
    for(var k=-7;k<=7;k++){
      var center=k*82+41, road=18*scale;
      ctx.fillRect(size/2+(center-cx)*scale-road/2,0,road,size);
      ctx.fillRect(0,size/2+(center-cz)*scale-road/2,size,road);
    }
    ctx.fillStyle='#f0dfbd';ctx.globalAlpha=.72;
    for(var r=-6;r<=6;r++){
      var centerRoad=r*82;
      ctx.fillRect(size/2+(centerRoad-cx)*scale-0.5,0,1,size);
      ctx.fillRect(0,size/2+(centerRoad-cz)*scale-0.5,size,1);
    }ctx.globalAlpha=1;
    if(worldMap){
      ctx.fillStyle='#fff0d7';ctx.textAlign='center';ctx.font='bold 15px Impact, sans-serif';
      for(var d=0;d<SF.CONFIG.districts.length;d++){
        var zone=SF.CONFIG.districts[d];
        ctx.fillText(zone.name,size/2+((zone.x1+zone.x2)/2-cx)*scale,size/2+((zone.z1+zone.z2)/2-cz)*scale);
      }
    }
    var jobs=SF.missions.sideJobs;
    for(var j=0;j<jobs.length;j++)dot(ctx,jobs[j].x,jobs[j].z,jobs[j].id==='fare'?'#ffbf68':'#42d8cc',worldMap?5:3,cx,cz,scale,size);
    var story=SF.missions.list[Math.min(SF.missions.storyDone,SF.missions.list.length-1)];
    if(story)dot(ctx,story.x,story.z,'#42d8cc',worldMap?6:4,cx,cz,scale,size);
    var target=SF.missions.blip;
    if(target){
      ctx.strokeStyle='#42d8cc';ctx.lineWidth=worldMap?3:2;ctx.beginPath();ctx.moveTo(size/2+(p.pos.x-cx)*scale,size/2+(p.pos.z-cz)*scale);ctx.lineTo(size/2+(target.x-cx)*scale,size/2+(target.z-cz)*scale);ctx.stroke();
      dot(ctx,target.x,target.z,'#42d8cc',worldMap?8:5,cx,cz,scale,size);
    }
    var units=SF.police.units;
    for(var u=0;u<units.length;u++)if(units[u].active&&(worldMap||units[u].pos.distanceToSquared(p.pos)<190*190))dot(ctx,units[u].pos.x,units[u].pos.z,'#ff685b',worldMap?5:3,cx,cz,scale,size);
    if(SF.police.air.active)dot(ctx,SF.police.air.pos.x,SF.police.air.pos.z,'#ff685b',worldMap?6:4,cx,cz,scale,size);
    ctx.save();ctx.translate(size/2+(p.pos.x-cx)*scale,size/2+(p.pos.z-cz)*scale);ctx.rotate(-(p.yaw||0));
    ctx.fillStyle='#fff';ctx.strokeStyle='#24323a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,10);ctx.lineTo(-7,-7);ctx.lineTo(0,-4);ctx.lineTo(7,-7);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    ctx.fillStyle='#fff';ctx.font='bold 11px system-ui';ctx.textAlign='left';ctx.fillText('N ↑',8,16);
  }
  function update(dt){
    frame++;accumulator+=dt;toastTime=Math.max(0,toastTime-dt);radioTime=Math.max(0,radioTime-dt);dialogueTime=Math.max(0,dialogueTime-dt);
    if(starTimer){starTimer-=dt;if(starTimer<=0)node['wanted-stars'].classList.remove('gain');}
    if(accumulator<.09&&frame%2)return;accumulator=0;
    var p=SF.player,w=SF.weapons,pol=SF.police,m=SF.missions,active=m.active,s=m.stage();
    text('day-label','DAY '+day);text('clock',time);text('cash','$'+Math.floor(p.cash).toLocaleString('en-US'));
    text('wanted-stars','★'.repeat(pol.wanted)+'☆'.repeat(5-pol.wanted));text('wanted-status',pol.wanted?(pol.seenPlayer?'IN SIGHT':'SEARCHING'):'CLEAR');
    style('wanted-status','color',pol.wanted?'#ff8376':'#d3e4d9');
    if(pol.wanted>previousStars){node['wanted-stars'].className='stars';void node['wanted-stars'].offsetWidth;node['wanted-stars'].className='stars gain';starTimer=.62;}
    previousStars=pol.wanted;
    text('chapter-label',active?active.chapter:'SOLANO BAY · '+(m.storyDone===m.list.length?'FREE ROAM':'NEXT LEAD'));
    text('mission-title',active?active.title:m.nearest?m.nearest.title:'Explore the city');
    text('mission-objective',active?m.objective:m.nearest?'Meet '+m.nearest.giver+' in '+SF.world.districtAt(m.nearest.x,m.nearest.z)+'.':'Cruise the bay. Choose your next move.');
    width('stage-progress',m.progress*100);text('stage-count',active?'STAGE '+(m.stageIndex+1)+' / '+active.stages.length:m.storyDone+' / '+m.list.length+' story jobs');
    text('next-hint',s&&s.limit?Math.ceil(m.timer)+' s':s&&s.type==='chase'?'CATCH / DISABLE':s&&s.type==='tail'?Math.round(m.progress*100)+'% tail':'E · interact');
    if(active&&previousMission!==active){node['hud-mission'].className='panel';void node['hud-mission'].offsetWidth;node['hud-mission'].className='panel accepted';}
    else if(!active)node['hud-mission'].className='panel';
    previousMission=active;
    for(var k=0;k<slots.length;k++){
      var slot=slots[k],def=w.defs[k],ammo=w.ammo[k],name=slot.querySelector('.weapon-name'),rounds=slot.querySelector('.weapon-ammo');
      if(name){name.textContent=w.owned[k]?def.name:'LOCKED';rounds.textContent=k?ammo.mag+' / '+ammo.reserve:'∞';slot.className='weapon-slot'+(w.owned[k]?'':' locked')+(w.cur===k?' active':'');}
    }
    width('health-fill',p.health);width('armour-fill',p.armour);text('health-value',Math.ceil(p.health));text('armour-value',Math.ceil(p.armour));
    var levels=SF.CONFIG.repLevels,rank=0;for(var lv=1;lv<levels.length;lv++)if(p.rep>=levels[lv].threshold)rank=lv;
    text('rep-rank',levels[rank].name);text('rep-value',p.rep);width('rep-fill',rank===levels.length-1?100:(p.rep-levels[rank].threshold)/(levels[rank+1].threshold-levels[rank].threshold)*100);
    text('district-name',SF.world.districtAt(p.pos.x,p.pos.z));show('hud-vehicle',!!p.inCar);
    if(p.inCar){var car=p.inCar;text('vehicle-name',car.name);show('stolen-tag',car.stolen);width('vehicle-condition',car.health);text('speed',Math.round(Math.abs(car.speed)*3.6));text('gear',Math.abs(car.speed)<.5?'N':car.speed<0?'R':'D');}
    if(!dialogueTime){current=queue.shift()||null;if(current){dialogueTime=4.1;text('portrait',current.who.charAt(0));text('speaker-name',current.who);text('speaker-role',current.role);text('dialogue-text',current.text);}}
    show('hud-dialogue',!!current&&dialogueTime>0,'flex');style('hud-toast','opacity',toastTime?'1':'0');show('hud-radio',radioTime>0);
    if(frame%2===0){map(miniCtx,mini.width,false);if(mapOpen)map(fullCtx,fullMap.width,true);}
  }
  function prompt(copy){text('action-label',copy||'');style('hud-action','display',copy?'block':'none');}
  SF.hud={
    say:say,toast:toast,update:update,prompt:prompt,
    refresh:function(){accumulator=.1;update(0);},
    setClock:function(d,t){day=d;time=t;},
    radioToast:function(station,track){text('radio-track',station+' · '+track);radioTime=4;},
    showEnd:function(kind,fee){show(kind,true,'grid');text(kind+'-fee',fee||'');},
    hideEnd:function(){show('busted',false);show('wasted',false);},
    toggleMap:function(close){mapOpen=close===false?false:!mapOpen;show('map-overlay',mapOpen,'grid');accumulator=.1;return mapOpen;},
    get mapOpen(){return mapOpen;}
  };
}());
