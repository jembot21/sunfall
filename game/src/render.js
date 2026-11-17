'use strict';
// Renderer, golden-hour atmosphere, chase camera and a single sun shadow map.
SF.initRender=function(){
 const r=SF.renderer=new THREE.WebGLRenderer({canvas:document.getElementById('game'),antialias:true});
 r.setPixelRatio(Math.min(devicePixelRatio,1.5));r.setSize(innerWidth,innerHeight);
 r.outputEncoding=THREE.sRGBEncoding;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=.95;
 r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=SF.scene=new THREE.Scene();scene.fog=new THREE.Fog(0xd38b65,140,480);
 SF.camera=new THREE.PerspectiveCamera(61,innerWidth/innerHeight,.2,1200);
 scene.add(new THREE.HemisphereLight(0xffcfab,0x354c60,.8));
 const sun=SF.sun=new THREE.DirectionalLight(0xffb66e,2.1);sun.castShadow=true;
 sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-65;sun.shadow.camera.right=65;sun.shadow.camera.top=65;sun.shadow.camera.bottom=-65;sun.shadow.camera.near=1;sun.shadow.camera.far=240;sun.shadow.bias=-.001;sun.shadow.normalBias=.06;scene.add(sun,sun.target);
 const sky=new THREE.Mesh(new THREE.SphereGeometry(800,24,12),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,vertexShader:'varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 p;void main(){float t=clamp(p.y/700.,0.,1.);gl_FragColor=vec4(mix(vec3(.98,.36,.12),mix(vec3(.48,.42,.48),vec3(.035,.29,.39),t),sqrt(t)),1.);}'}));scene.add(sky);
 SF.camTarget=new THREE.Vector3();SF.camDesired=new THREE.Vector3();SF.camLook=new THREE.Vector3();
 addEventListener('resize',function(){r.setSize(innerWidth,innerHeight);SF.camera.aspect=innerWidth/innerHeight;SF.camera.updateProjectionMatrix();});
};
SF.updateCamera=function(dt){
 const p=SF.player;let yaw=SF.input.yaw;
 if(SF.car){if(!document.pointerLockElement||SF.time-(SF.input.lastLook||0)>.8)SF.input.yaw+=SF.angle(SF.car.angle-SF.input.yaw)*Math.min(1,dt*3);yaw=SF.input.yaw;}
 const distance=SF.shotView?SF.shotView.distance:SF.car?10.5:6.5, pitch=SF.input.pitch;
 if(SF.shotView)yaw=(SF.car?SF.car.angle:0)+SF.shotView.yaw;
 SF.camDesired.set(p.x-Math.sin(yaw)*distance,(SF.shotView?SF.shotView.height:2.3+Math.sin(pitch)*distance),p.z-Math.cos(yaw)*distance);
 // Keep the camera out of building footprints by shortening its boom.
 for(let i=0;i<4&&SF.solid(SF.camDesired.x,SF.camDesired.z,.3);i++){SF.camDesired.x=(SF.camDesired.x+p.x)*.5;SF.camDesired.z=(SF.camDesired.z+p.z)*.5;SF.camDesired.y+=1;}
 SF.camera.position.lerp(SF.camDesired,1-Math.exp(-dt*7));SF.camLook.set(p.x,1.5,p.z);SF.camera.lookAt(SF.camLook);
 const fov=61+(SF.car?Math.abs(SF.car.speed)*.25:0);if(Math.abs(SF.camera.fov-fov)>.05){SF.camera.fov=fov;SF.camera.updateProjectionMatrix();}
 SF.sun.position.set(p.x-70,95,p.z+45);SF.sun.target.position.set(p.x,0,p.z);
 if(SF.ocean)SF.ocean.material.uniforms.time.value=SF.time;
};
