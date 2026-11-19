(function () {
  'use strict';
  var nodes=Object.create(null),cache=Object.create(null),slots=[],rows=[],acc=0,frame=0,force=true,mapOpen=false;
  var ids=['chapter-label','mission-title','mission-objective','stage-progress','stage-count','next-hint','day-label','clock','cash','wanted-stars','wanted-status','hud-police','police-rows','health-fill','health-value','armour-fill','armour-value','rep-fill','rep-value','rep-rank','district-name','hud-vehicle','vehicle-name','stolen-tag','vehicle-condition','speed','gear','hud-dialogue','portrait','speaker-name','speaker-role','dialogue-text','hud-toast','hud-radio','radio-track','map-overlay','map-legend','busted','wasted','busted-fee','wasted-fee'];
  for(var i=0;i<ids.length;i++)nodes[ids[i]]=document.getElementById(ids[i]);
  var boxes=document.querySelectorAll('.weapon-slot');
  for(var b=0;b<boxes.length;b++)slots.push({box:boxes[b],name:boxes[b].querySelector('.weapon-name'),ammo:boxes[b].querySelector('.weapon-ammo')});
  for(var r=0;r<5;r++){
    var row=document.createElement('div');row.className='unit-row';var label=document.createElement('span'),distance=document.createElement('span'),tactic=document.createElement('span');tactic.className='tactic';row.appendChild(label);row.appendChild(distance);row.appendChild(tactic);nodes['police-rows'].appendChild(row);rows.push({row:row,label:label,dist:distance,tactic:tactic});
  }
  nodes['map-legend'].textContent='▲ Dario Venn · Gold: objective / story · Teal: side jobs · Red: patrol · Violet: Gun Shop · + Safehouse';
  var mini=document.getElementById('minimap'),big=document.getElementById('city-map'),mc=mini.getContext('2d'),bc=big.getContext('2d');
  var queue=[],dialogue=null,dialogueT=0,toastT=0,radioT=0,day=1,hhmm='17:40';
  function text(id,value){value=String(value);if(cache[id]!==value){nodes[id].textContent=value;cache[id]=value;}}
  function style(id,key,value){var k=id+':'+key;if(cache[k]!==value){nodes[id].style[key]=value;cache[k]=value;}}
  function width(id,n){style(id,'width',Math.max(0,Math.min(100,n))+'%');}
  function display(id,on,mode){style(id,'display',on?(mode||'block'):'none');}
  function say(who,role,copy){if(queue.length>=3)queue.shift();queue.push({who:who,role:role,text:copy});force=true;}
  function toast(copy){text('hud-toast',copy);style('hud-toast','opacity','1');toastT=3.5;}
  function dot(ctx,x,z,color,r,cx,cz,scale,size){ctx.fillStyle=color;ctx.beginPath();ctx.arc(size/2+(x-cx)*scale,size/2+(z-cz)*scale,r,0,Math.PI*2);ctx.fill();}
  function drawMap(ctx,size,full){
    var p=SF.player,cx=full?-45:p.pos.x,cz=full?0:p.pos.z,scale=full?size/900:size/200;
    ctx.clearRect(0,0,size,size);ctx.fillStyle='#43505b';ctx.fillRect(0,0,size,size);
    var coast=size/2+(-260-cx)*scale,water=size/2+(-390-cx)*scale;
    ctx.fillStyle='#e1b66b';ctx.fillRect(0,0,Math.max(0,coast),size);ctx.fillStyle='#287b91';ctx.fillRect(0,0,Math.max(0,water),size);
    ctx.fillStyle='#282c3c';for(var k=-5;k<=5;k++){var center=k*82+41;ctx.fillRect(size/2+(center-cx-9)*scale,0,18*scale,size);ctx.fillRect(0,size/2+(center-cz-9)*scale,size,18*scale);}
    ctx.fillRect(size/2+(-245-cx)*scale,0,18*scale,size);
    if(full){ctx.fillStyle='#fff1d5';ctx.textAlign='center';ctx.font='bold 15px system-ui';for(var i=0;i<SF.CONFIG.districts.length;i++){var d=SF.CONFIG.districts[i];ctx.fillText(d.name,size/2+((d.x1+d.x2)/2-cx)*scale,size/2+((d.z1+d.z2)/2-cz)*scale);}}
    var jobs=SF.missions.sideJobs;for(var j=0;j<jobs.length;j++)dot(ctx,jobs[j].x,jobs[j].z,'#58e6d0',full?5:3,cx,cz,scale,size);
    var story=SF.missions.list[SF.missions.storyDone];if(story)dot(ctx,story.x,story.z,'#ffb24e',full?7:4,cx,cz,scale,size);
    var marker=SF.missions.blip;if(marker)dot(ctx,marker.x,marker.z,'#ffde7a',full?8:5,cx,cz,scale,size);
    dot(ctx,205,10,'#d197ff',full?6:4,cx,cz,scale,size);
    for(var h=0;h<SF.player.safehouses.length;h++){var home=SF.player.safehouses[h];dot(ctx,home.x,home.z,'#9be9a3',full?5:3,cx,cz,scale,size);}
    var units=SF.police.units;for(var c=0;c<units.length;c++){var u=units[c];if(u.active&&(full||u.pos.distanceToSquared(p.pos)<180*180))dot(ctx,u.pos.x,u.pos.z,'#ff6079',full?5:3,cx,cz,scale,size);}
    if(SF.police.air.active)dot(ctx,SF.police.air.pos.x,SF.police.air.pos.z,'#ff99dc',5,cx,cz,scale,size);
    ctx.save();ctx.translate(size/2+(p.pos.x-cx)*scale,size/2+(p.pos.z-cz)*scale);ctx.rotate(-(p.yaw||0));ctx.fillStyle='#ffffff';ctx.strokeStyle='#162039';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,9);ctx.lineTo(-6,-6);ctx.lineTo(0,-3);ctx.lineTo(6,-6);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();ctx.fillStyle='#fff';ctx.font='bold 12px system-ui';ctx.textAlign='left';ctx.fillText('N ↑',8,18);
  }
  function update(dt){
    frame++;acc+=dt;toastT=Math.max(0,toastT-dt);radioT=Math.max(0,radioT-dt);dialogueT=Math.max(0,dialogueT-dt);
    if(!force&&acc<0.1)return;acc=0;force=false;
    var p=SF.player,w=SF.weapons,pol=SF.police,m=SF.missions,a=m.active,s=m.stage();
    text('day-label','DAY '+day);text('clock',hhmm);text('cash','$'+Math.floor(p.cash).toLocaleString('en-US'));
    text('wanted-stars','★★★★★'.slice(0,pol.wanted)+'☆☆☆☆☆'.slice(pol.wanted));text('wanted-status',pol.wanted?(pol.seenPlayer?'IN SIGHT':'HIDDEN'):'CLEAR');style('wanted-status','color',pol.wanted?(pol.seenPlayer?'#ff727e':'#ffd285'):'#7dedb2');
    text('chapter-label',a?a.chapter:'SOLANO BAY · '+(m.storyDone===8?'FREE ROAM':'NEXT LEAD'));
    text('mission-title',a?a.title:m.nearest?m.nearest.title:'Explore Solano Bay');
    text('mission-objective',a?m.objective:m.nearest?'Find '+m.nearest.giver+' · '+Math.round(Math.hypot(p.pos.x-m.nearest.x,p.pos.z-m.nearest.z))+' m':'Eight districts. Your next move.');
    width('stage-progress',m.progress*100);text('stage-count',a?'STAGE '+(m.stageIndex+1)+' / '+a.stages.length:m.storyDone+' / 8 story jobs');
    text('next-hint',s&&s.limit?Math.ceil(m.timer)+' s':s&&s.type==='chase'?'CATCH / DISABLE':s&&s.type==='tail'?Math.round(m.progress*100)+'% tail':'E · interact');
    for(var i=0;i<slots.length;i++){
      var slot=slots[i],def=w.defs[i],ammo=w.ammo[i],name=w.owned[i]?def.name:'LOCKED',rounds=i?ammo.mag+' / '+ammo.reserve:'∞',cls='weapon-slot'+(w.owned[i]?'':' locked')+(w.cur===i?' active':'');
      if(slot.box.className!==cls)slot.box.className=cls;if(slot.name.textContent!==name)slot.name.textContent=name;if(slot.ammo.textContent!==rounds)slot.ammo.textContent=rounds;
    }
    display('hud-police',pol.wanted>0);var report=pol.report();
    for(var n=0;n<rows.length;n++){var rr=rows[n],unit=report[n];if(rr.row.style.display!==(unit?'grid':'none'))rr.row.style.display=unit?'grid':'none';if(unit){if(rr.label.textContent!==unit.label)rr.label.textContent=unit.label;var ds=unit.dist+' m';if(rr.dist.textContent!==ds)rr.dist.textContent=ds;if(rr.tactic.textContent!==unit.tactic){rr.tactic.textContent=unit.tactic;rr.tactic.style.color=/fire|intercept|ram/i.test(unit.tactic)?'#ff778d':'#ffd28c';}}}
    width('health-fill',p.health);width('armour-fill',p.armour);text('health-value',Math.ceil(p.health));text('armour-value',Math.ceil(p.armour));
    var levels=SF.CONFIG.repLevels,rank=0;for(var l=1;l<levels.length;l++)if(p.rep>=levels[l].threshold)rank=l;p.repName=levels[rank].name;
    text('rep-rank',p.repName);text('rep-value',p.rep);width('rep-fill',rank===levels.length-1?100:(p.rep-levels[rank].threshold)/(levels[rank+1].threshold-levels[rank].threshold)*100);
    text('district-name',SF.world.districtAt(p.pos.x,p.pos.z));display('hud-vehicle',!!p.inCar);
    if(p.inCar){var car=p.inCar;text('vehicle-name',car.name);display('stolen-tag',car.stolen);width('vehicle-condition',car.health);text('speed',Math.round(Math.abs(car.speed)*3.6));text('gear',Math.abs(car.speed)<0.5?'N':car.speed<0?'R':'D');}
    if(!dialogueT){dialogue=queue.shift()||null;if(dialogue){dialogueT=4.5;text('portrait',dialogue.who.charAt(0));text('speaker-name',dialogue.who);text('speaker-role',dialogue.role);text('dialogue-text',dialogue.text);}}
    display('hud-dialogue',!!dialogue,'flex');style('hud-toast','opacity',toastT?'1':'0');display('hud-radio',radioT>0);
    if(frame%2===0){drawMap(mc,mini.width,false);if(mapOpen)drawMap(bc,big.width,true);}
  }
  SF.hud={say:say,toast:toast,update:update,refresh:function(){force=true;acc=0.1;update(0);},setClock:function(d,t){day=d;hhmm=t;},radioToast:function(station,track){text('radio-track',station+' · '+track);radioT=5;},showEnd:function(kind,fee){display(kind,true,'grid');text(kind+'-fee',fee||'');},hideEnd:function(){display('busted',false);display('wasted',false);},toggleMap:function(close){mapOpen=close===false?false:!mapOpen;display('map-overlay',mapOpen,'grid');force=true;return mapOpen;},get mapOpen(){return mapOpen;}};
}());
