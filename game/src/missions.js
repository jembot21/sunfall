'use strict';
// Five authored jobs, followed by alternating passenger fares and timed courier runs.
SF.missions={stage:0,timer:0,running:false,delay:0,side:0,checkpoint:0,objective:'',target:{x:0,z:0},radius:10};
SF.missionNames=['01 / ONE LAST DELIVERY','02 / LOW TIDE','03 / GOLDEN CIRCUIT','04 / GILDED CAGE','05 / THE SUN GOES DOWN'];
SF.racePoints=[{x:128,z:0},{x:128,z:-128},{x:0,z:-128},{x:0,z:0},{x:64,z:64}];
SF.initMissions=function(){const m=SF.missions;m.ring=new THREE.Mesh(new THREE.TorusGeometry(4,.14,6,40),new THREE.MeshBasicMaterial({color:0xffd17c,depthTest:false,transparent:true,opacity:.85}));m.ring.rotation.x=Math.PI/2;m.ring.renderOrder=4;SF.scene.add(m.ring);m.beam=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,28,6),new THREE.MeshBasicMaterial({color:0xffda8f,transparent:true,opacity:.36,depthWrite:false}));SF.scene.add(m.beam);m.arrow=new THREE.Mesh(new THREE.ConeGeometry(1.4,2.5,4),new THREE.MeshBasicMaterial({color:0xffd17c}));SF.scene.add(m.arrow);m.retry();};
SF.missions.set=function(x,z,text){this.target.x=x;this.target.z=z;this.objective=text;};
SF.missions.retry=function(){this.stage=0;this.timer=0;this.running=false;this.delay=0;this.checkpoint=0;
 switch(SF.story){case 0:this.set(-128,-128,'Get in a car [E]. Deliver the sealed package to Harbor Club.');break;case 1:this.set(-192,-128,'Drive to the marina and collect Inez.');break;case 2:this.set(64,64,'Bring a car to the downtown starting line.');break;case 3:this.set(SF.luxury.x,SF.luxury.z,'Steal the gold Aureole from the guarded lot.');break;case 4:this.set(-192,-128,'Lose FOUR stars, then reach the safehouse.');SF.wanted=4;SF.heat=20;break;default:this.set(-192,0,this.side%2?'SIDE JOB / Collect a passenger on Coast Road.':'SIDE JOB / Collect a timed courier parcel on Coast Road.');}
};
SF.missions.complete=function(){SF.cash+=SF.story<5?500+SF.story*250:250;if(SF.story<5)SF.story++;else this.side++;SF.player.gun=SF.story>0;this.delay=4;this.timer=0;this.running=false;SF.message(SF.story===1?'Delivery paid. A pistol was in the envelope. Q equips / holsters.':SF.story===5?'You made it, Dario. Solano Bay is yours. Side jobs are now available.':'Job complete. Payment received. Next contact incoming.',7);SF.audio.tone(660,.3,.08);SF.save();};
SF.missions.update=function(dt){const m=this;if(m.delay>0){m.delay-=dt;if(m.delay<=0)m.retry();return;}
 const near=SF.dist(SF.player,m.target)<m.radius,car=SF.car;
 if(m.running){m.timer-=dt;if(m.timer<=0){SF.message('Time ran out. The job has been reset.',5);m.retry();return;}}
 switch(SF.story){
 case 0:if(car&&!m.running){m.running=true;m.timer=150;}if(near&&car)m.complete();break;
 case 1:if(near&&car){if(m.stage===0){m.stage=1;m.set(128,64,'Inez is aboard. Deliver her to the Night Market.');SF.wanted=Math.max(2,SF.wanted);SF.heat=20;SF.message('Inez: “Just drive. Do not stop for them.”',5);}else m.complete();}break;
 case 2:if(near&&car){if(!m.running){m.running=true;m.timer=130;m.checkpoint=0;const t=SF.racePoints[0];m.set(t.x,t.z,'Race through the gold checkpoints. 1 / 5');}else{m.checkpoint++;if(m.checkpoint>=5)m.complete();else{const t=SF.racePoints[m.checkpoint];m.set(t.x,t.z,'Race checkpoint '+(m.checkpoint+1)+' / 5 — keep moving.');}}}break;
 case 3:if(m.stage===0){m.target.x=SF.luxury.x;m.target.z=SF.luxury.z;if(car===SF.luxury){m.stage=1;m.set(-128,192,'Deliver the gold Aureole to the buyer at South Quay.');SF.wanted=Math.max(3,SF.wanted);SF.heat=20;}}else if(near&&car===SF.luxury)m.complete();break;
 case 4:if(near&&!SF.wanted)m.complete();break;
 default:if(near&&car){if(!m.running){m.running=true;m.timer=m.side%2?120:85;m.set(192,-64,m.side%2?'Passenger aboard. Take them to the east terminal.':'Courier parcel loaded. Reach the east terminal in time.');}else m.complete();}
 }
 m.ring.position.set(m.target.x,.2,m.target.z);m.beam.position.set(m.target.x,14,m.target.z);m.arrow.position.set(m.target.x,5.8+Math.sin(SF.time*2)*.5,m.target.z);m.arrow.rotation.z=Math.PI;m.arrow.rotation.y=SF.time;
};
