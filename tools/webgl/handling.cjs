// Deterministic player handling checks without renderer, hardware or a second input loop.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const THREE=require('../../src/Kemudi.Web/wwwroot/simulation-3d/vendor/three.min.js');
const source=path.resolve(__dirname,'../../src/Kemudi.Web/wwwroot/simulation-3d');
const context={THREE,performance,window:{},console};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(source,'vehicle.js'),'utf8'),context);
const {Vehicle}=context.window;Vehicle.prototype._loadModel=async function(){};
const checks=[];
function check(name,fn){fn();checks.push(name);console.log('PASS',name);}
function create(type,steeringWeight=50,steeringReturn=1){
  const v=new Vehicle(new THREE.Scene(),type);v.setHandling({steeringWeight,steeringReturn});return v;
}
check('handling defaults and atomic validation are isolated per vehicle',()=>{
  const a=new Vehicle(new THREE.Scene(),'MOBIL'),b=new Vehicle(new THREE.Scene(),'MOBIL');
  assert.equal(a.handling.steeringWeight,50);assert.equal(a.handling.steeringReturn,1);
  assert.ok(Object.isFrozen(a.handling));a.setHandling({steeringWeight:0,steeringReturn:2});
  assert.equal(b.handling.steeringWeight,50);
  for(const patch of [{steeringWeight:-1},{steeringWeight:101},{steeringWeight:NaN},{steeringReturn:0},{steeringReturn:Infinity},{steeringReturn:null}]){
    assert.throws(()=>a.setHandling(patch));assert.equal(a.handling.steeringWeight,0);assert.equal(a.handling.steeringReturn,2);
  }
});
for(const type of ['MOTOR','MOBIL','TRUK'])for(const analog of [false,true]){
  const turn=analog?{analog:true,steer:-1}:{left:true};
  const released=analog?{analog:true,steer:0}:{};
  check(`${type} ${analog?'analog':'keyboard'} light responds faster, full lock and default remain compatible`,()=>{
    const light=create(type,0),normal=create(type),heavy=create(type,100),dt=1/60;
    for(const v of [light,normal,heavy])v._updateSteering(turn,dt);
    assert.ok(light.steerAngle>normal.steerAngle&&normal.steerAngle>heavy.steerAngle);
    const legacy=analog?dt/.09:2.5*dt;assert.ok(Math.abs(normal.steerAngle-legacy)<1e-10,'normal reproduces original initial response');
    for(let i=0;i<240;i++)for(const v of [light,normal,heavy])v._updateSteering(turn,dt);
    for(const v of [light,normal,heavy])assert.ok(Math.abs(v.steerAngle-1)<1e-8,'weight changes response, not maximum lock');
    for(const v of [light,normal,heavy]){v.steerAngle=0;v._updateSteering(analog?{analog:true,steer:1}:{right:true},dt);assert.ok(v.steerAngle<0,'right remains right');}
  });
  check(`${type} ${analog?'analog':'keyboard'} return speed is adjustable without crossing neutral`,()=>{
    const slow=create(type,50,.5),fast=create(type,50,2);slow.steerAngle=fast.steerAngle=.5;
    slow._updateSteering(released,1/60);fast._updateSteering(released,1/60);
    assert.ok(fast.steerAngle<slow.steerAngle&&fast.steerAngle>=0);
    for(const sign of [-1,1])for(const v of [slow,fast]){
      v.steerAngle=.06*sign;v._updateSteering(released,.1);assert.ok(v.steerAngle*sign>=0,'return cannot steer in the opposite direction');
    }
  });
  check(`${type} ${analog?'analog':'keyboard'} speed limit, drivetrain and deferred motion safety remain`,()=>{
    for(const weight of [0,50,100])for(const hz of [15,30,60]){
      const v=create(type,weight);v.speed=v.config.topSpeed;
      for(let i=0;i<hz;i++)v._updateSteering(turn,1/hz);
      assert.ok(Math.abs(v.steerAngle)<=.4000001,'high-speed steering reduction remains');
      assert.equal(v.gear,0);assert.equal(v.engineOn,false);
      v.speed=0;v.steerAngle=0;const before=v.position.clone();
      const proposal=v.planMotion(turn,1/hz);
      assert.ok(v.position.equals(before),'plan must not commit pose');assert.ok(proposal.position.equals(before),'looking/steering alone does not drive');
    }
  });
}
const output=path.resolve(__dirname,'../../artifacts/gamepad');fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'handling-unit-report.json'),JSON.stringify({passed:true,checks},null,2));
