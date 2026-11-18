(function(SF){
'use strict';
const health=document.getElementById('healthFill'),cash=document.getElementById('cash'),wanted=document.getElementById('wanted'),mission=document.getElementById('mission'),state=document.getElementById('state'),stateText=document.getElementById('stateText'),map=document.getElementById('map'),ctx=map.getContext('2d');
cash.style.textAlign='right';cash.style.minWidth='8ch';cash.style.textShadow='0 1px 3px #0009';
const bayLabel=document.createElement('div');bayLabel.textContent='SOLANO BAY';Object.assign(bayLabel.style,{position:'absolute',right:'24px',top:'248px',width:'220px',textAlign:'center',fontSize:'10px',letterSpacing:'2px',color:'#ffd078',textShadow:'0 1px 3px #000'});document.getElementById('hud').appendChild(bayLabel);
let banner=0;
function showBanner(t,x){const text=t+'  |  '+x;if(mission.textContent!==text&&SF.audio)SF.audio.click();mission.textContent=text;banner=5;}
function draw(){
 const w=map.width,h=map.height,b=SF.world.bounds;
 const min=Math.min(b.min,SF.world.coastX)-24,max=b.max+24,s=Math.min(w,h)/(max-min);
 const px=x=>(x-min)*s,pz=z=>(z-min)*s;
 ctx.fillStyle='#142024';ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#204b59';ctx.fillRect(0,0,px(SF.world.coastX),h);
 ctx.strokeStyle='#59615e';ctx.lineWidth=Math.max(2,SF.CONFIG.city.road*s);
 for(const c of SF.world.roadCenters){
  ctx.beginPath();ctx.moveTo(px(c),pz(b.min));ctx.lineTo(px(c),pz(b.max));ctx.stroke();
  ctx.beginPath();ctx.moveTo(px(b.min),pz(c));ctx.lineTo(px(b.max),pz(c));ctx.stroke();
 }
 function dot(x,z,color,r){ctx.fillStyle=color;ctx.beginPath();ctx.arc(px(x),pz(z),r,0,Math.PI*2);ctx.fill();}
 const m=SF.missions&&SF.missions.current;
 if(m&&m.target)dot(m.target.x,m.target.z,'#ffc14d',5);
 dot(SF.world.coastX+20,0,'#55d68a',3);dot(0,18,'#fff',3);
 if(SF.police&&SF.police.wanted>0)SF.police.units.forEach(c=>{if(c.mesh.visible)dot(c.pos.x,c.pos.z,'#ef4444',3);});
 const p=SF.player;
 if(p){ctx.save();ctx.translate(px(p.position.x),pz(p.position.z));ctx.rotate(-(p.inCar?p.inCar.heading:p.mesh.rotation.y));ctx.fillStyle='#fff';ctx.strokeStyle='#142024';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,7);ctx.lineTo(-4,-4);ctx.lineTo(0,-2);ctx.lineTo(4,-4);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
}
SF.hud={showBanner,clearBanner(){banner=0;mission.textContent='';},refreshSaveButtons(){},update(dt){
 const p=SF.player;if(!p)return;
 health.style.width=Math.max(0,p.health)+'%';cash.textContent='$'+Math.floor(p.cash).toLocaleString('en-US');
 const stars=Math.ceil(SF.police.wanted);wanted.textContent='★'.repeat(stars)+'☆'.repeat(5-stars);
 if(banner>0){banner-=dt;if(banner<=0)mission.textContent='';}
 if(SF.police.state==='busted'||p.health<=0){state.classList.remove('hidden');stateText.textContent=SF.police.state==='busted'?'BUSTED':'WASTED';}else state.classList.add('hidden');
 draw();
}};
})(window.SF);
