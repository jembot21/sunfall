(function () {
  'use strict';
  var context=null,master=null,noise=null,engineOsc=null,engineGain=null,sirenOsc=null,sirenGain=null,radioGain=null;
  var engineOn=false,sirenOn=false,radioOn=false,station=0,nextNote=0,step=0,scheduler=0;
  var stations=[
    {name:'SOLANO FM 99.1',track:'Peach Skyline · The Boardwalks',beat:0.17,wave:'triangle',notes:[72,76,79,76,74,77,81,77,72,76,79,83,81,79,76,74],bass:[48,48,53,55]},
    {name:'PALMA GOLD',track:'Sunday Convertible · Vera Sol',beat:0.22,wave:'sine',notes:[67,0,69,72,71,69,67,64,65,0,67,69,67,65,64,62],bass:[48,57,53,55]},
    {name:'HARBOR AFTER DARK',track:'Neon Estuary · Violet Circuit',beat:0.15,wave:'triangle',notes:[64,71,76,79,64,71,76,83,60,67,72,79,62,69,74,81],bass:[40,40,36,38]}
  ];
  function frequency(note){return 440*Math.pow(2,(note-69)/12);}
  function tone(freq,duration,type,volume,when,bus,end){
    if(!context)return;var t=when===undefined?context.currentTime:when,o=context.createOscillator(),g=context.createGain();
    o.type=type||'triangle';o.frequency.setValueAtTime(freq,t);if(end)o.frequency.exponentialRampToValueAtTime(Math.max(1,end),t+duration);
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(0.0002,volume),t+0.006);g.gain.exponentialRampToValueAtTime(0.0001,t+duration);
    o.connect(g);g.connect(bus||master);o.start(t);o.stop(t+duration+0.01);o.onended=function(){o.disconnect();g.disconnect();o.onended=null;};
  }
  function hiss(duration,volume,cutoff,when,bus){
    if(!context)return;var t=when===undefined?context.currentTime:when,s=context.createBufferSource(),g=context.createGain(),f=context.createBiquadFilter();
    s.buffer=noise;f.type='lowpass';f.frequency.value=cutoff;g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(0.0001,t+duration);
    s.connect(f);f.connect(g);g.connect(bus||master);s.start(t);s.stop(t+duration);s.onended=function(){s.disconnect();f.disconnect();g.disconnect();s.onended=null;};
  }
  function unlock(){
    if(!context){var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      context=new AC();master=context.createGain();master.gain.value=0.24;master.connect(context.destination);
      noise=context.createBuffer(1,Math.floor(context.sampleRate*0.6),context.sampleRate);var data=noise.getChannelData(0);for(var i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      engineGain=context.createGain();engineGain.gain.value=0;engineGain.connect(master);engineOsc=context.createOscillator();engineOsc.type='sawtooth';engineOsc.frequency.value=42;engineOsc.connect(engineGain);engineOsc.start();
      sirenGain=context.createGain();sirenGain.gain.value=0;sirenGain.connect(master);sirenOsc=context.createOscillator();sirenOsc.type='triangle';sirenOsc.connect(sirenGain);sirenOsc.start();
      radioGain=context.createGain();radioGain.gain.value=0;radioGain.connect(master);nextNote=context.currentTime;
    }
    if(context.state==='suspended')context.resume().catch(function(){});
  }
  function radioNext(){station=(station+1)%stations.length;step=0;if(context)nextNote=context.currentTime+0.02;radioOn=!!SF.player.inCar;SF.hud.radioToast(stations[station].name,stations[station].track);}
  function update(dt){
    if(!context)return;var now=context.currentTime,car=SF.player.inCar;
    engineGain.gain.setTargetAtTime(engineOn&&car?0.075:0,now,0.06);engineOsc.frequency.setTargetAtTime(38+(car?Math.abs(car.speed)*3.3:0),now,0.06);
    sirenGain.gain.setTargetAtTime(sirenOn?0.065:0,now,0.06);sirenOsc.frequency.setTargetAtTime(Math.sin(now*5)>0?690:920,now,0.025);
    radioGain.gain.setTargetAtTime(radioOn&&car?0.65:0,now,0.04);
    scheduler+=dt;if(scheduler<0.06)return;scheduler=0;if(!radioOn||!car){nextNote=now+0.03;return;}
    if(nextNote<now)nextNote=now+0.01;var st=stations[station];
    while(nextNote<now+0.18){
      var note=st.notes[step%16];if(note)tone(frequency(note),st.beat*0.75,st.wave,0.07,nextNote,radioGain);
      if(step%4===0)tone(frequency(st.bass[Math.floor(step/4)%4]),st.beat*2.7,'triangle',0.15,nextNote,radioGain);
      if(step%2===0)hiss(0.025,0.025,7000,nextNote,radioGain);
      if(step%4===0)tone(110,0.11,'sine',0.15,nextNote,radioGain,35);
      step++;nextNote+=st.beat;
    }
  }
  SF.audio={unlock:unlock,update:update,shot:function(def,index){var i=index||SF.weapons.cur;hiss(i===3?0.18:0.09,i===3?0.7:0.35,i===4?1900:3500);tone(i===4?110:180,0.09,'square',0.1,undefined,null,45);},punch:function(){hiss(0.07,0.15,450);tone(90,0.09,'sine',0.16);},hit:function(){tone(70,0.14,'triangle',0.18,undefined,null,28);},emptyClick:function(){tone(700,0.025,'square',0.05);},reload:function(){if(!context)return;tone(850,0.035,'square',0.04);tone(1250,0.05,'square',0.04,context.currentTime+0.22);},siren:function(on){sirenOn=!!on;},engine:function(on){engineOn=!!on;if(on){radioOn=true;}else radioOn=false;},pickup:function(){tone(660,0.13,'triangle',0.17);if(context)tone(990,0.2,'triangle',0.13,context.currentTime+0.09);},cash:function(){if(!context)return;for(var i=0;i<3;i++)tone(660+i*220,0.12,'square',0.06,context.currentTime+i*0.07);},missionComplete:function(){if(!context)return;var notes=[60,64,67,72,76];for(var i=0;i<notes.length;i++)tone(frequency(notes[i]),0.3,'triangle',0.15,context.currentTime+i*0.12);},radioNext:radioNext,radioStop:function(){radioOn=false;},pause:function(paused){if(context)master.gain.setTargetAtTime(paused?0:0.24,context.currentTime,0.03);},setVolume:function(n){if(master)master.gain.value=Math.max(0,Math.min(1,n));}};
  window.addEventListener('pointerdown',unlock,{once:true});window.addEventListener('keydown',unlock,{once:true});
}());
