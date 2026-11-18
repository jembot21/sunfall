(function(SF){
'use strict';
const T=THREE,marker=new T.Group();
const beam=new T.Mesh(new T.CylinderGeometry(1.2,1.2,8,12,1,true),new T.MeshBasicMaterial({color:0xffb347,transparent:true,opacity:.3,side:T.DoubleSide}));
const ring=new T.Mesh(new T.CylinderGeometry(3,3,.15,24),new T.MeshBasicMaterial({color:0xffc45b}));
marker.add(beam,ring);marker.visible=false;SF.render.scene.add(marker);
const missions=[['First Drop','Get the borrowed car to the marina.','deliver',500],['Quiet Favor','Meet the contact downtown.','goto',700],['Hot Package','Deliver the package, then lose the heat.','escape',1200],['Bay Sprint','Beat the clock to the coast road.','race',900],['Last Light','Bring the final envelope home. Reward: $2,400.','deliver',2400],['Free Roads','Solano Bay is yours to work.','side',300]];
let index=0,stage=0,active=false;
function current(){const m=missions[index];SF.missions.current={title:m[0],text:m[1],stage,index,target:marker.position.clone()};}
function begin(){
 active=true;stage=0;
 const coastRoad=SF.world.bounds.min+6;
 marker.position.set(index===4?0:index%2?0:coastRoad,0,index===4?18:index%2?-180:0);
 marker.visible=true;current();SF.hud.showBanner(missions[index][0],missions[index][1]);
}
SF.missions={current:null,storyDone:false,start(){if(!active)begin();},
 enterFreeRoam(){active=false;index=5;this.storyDone=true;this.current=null;marker.visible=false;SF.hud.clearBanner();},
 update(dt){
  if(!active)return;
  const m=missions[index];
  if(SF.player.position.distanceTo(marker.position)>=9)return;
  if(m[2]==='escape'&&SF.police.wanted>0){SF.hud.showBanner('BREAK THE LINE','Lose the police.');return;}
  stage++;SF.audio.jingle();SF.player.addCash(m[3]);
  SF.hud.showBanner('JOB COMPLETE',m[0]+'  +$'+m[3].toLocaleString('en-US'));
  index++;active=false;marker.visible=false;this.current=null;
  if(index>=5){this.storyDone=true;index=5;}
  if(SF.save){SF.save.data.story=index;SF.save.store();}
 }
};
})(window.SF);
