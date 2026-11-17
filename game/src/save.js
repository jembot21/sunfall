'use strict';
// A small validated, versioned save. In-progress jobs restart safely on Continue.
SF.readSave=function(){try{const s=JSON.parse(localStorage.getItem('sunfall.save.v1'));if(s&&s.version===1&&Number.isFinite(s.cash)&&Number.isInteger(s.story)&&s.story>=0&&s.story<=5)return s;}catch(e){}return null;};
SF.save=function(){try{localStorage.setItem('sunfall.save.v1',JSON.stringify({version:1,cash:SF.cash,story:SF.story,settings:SF.settings}));}catch(e){SF.message('Storage unavailable. Progress lasts for this visit.',4);}};
SF.load=function(){const s=SF.readSave();if(!s)return false;SF.cash=SF.clamp(s.cash,0,9999999);SF.story=s.story;if(s.settings){SF.settings.sound=s.settings.sound!==false;SF.settings.sensitivity=SF.clamp(Number(s.settings.sensitivity)||1,.3,2);}return true;};
