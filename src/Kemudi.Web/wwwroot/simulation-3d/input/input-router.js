/* Whole-source arbitration and safety; does not move vehicles or read devices. */
(function(root) {
  const zero = () => ({ throttle:0, brakeAmount:0, steer:0, clutch:false, horn:false, walk:0, parkingBrake:false, lookX:0, lookY:0 });
  class GamepadInputRouter {
    constructor() { this.source='keyboard'; this.gated=false; this.neutralObserved=false; this.context=null; this.lastSwitch=-Infinity; this.wasMeaningful=false; }
    reset() { this.gated=true; this.neutralObserved=false; }
    update(keyboard, pad, {context,dt=0,now=0,focused=true}={}) {
      if(this.context!==null && context!==this.context) this.reset();
      this.context=context;
      const rising=pad.meaningful&&!this.wasMeaningful || Object.values(pad.edges||{}).some(Boolean);
      this.wasMeaningful=!!pad.meaningful;
      if(!focused || pad.lost) this.reset();
      const canSwitch=now-this.lastSwitch>=200;
      if(keyboard.meaningful && canSwitch) { this.source='keyboard';this.lastSwitch=now; }
      else if(rising && pad.device && canSwitch) { this.source='gamepad';this.lastSwitch=now; }
      if(!pad.device || ['disabled','unsupported','error','disconnected'].includes(pad.status)) this.source='keyboard';
      const neutral=c=>!c.throttle&&!c.brakeAmount&&!c.parkingBrake&&!c.steer&&!c.clutch&&!c.horn&&!c.lookX&&!c.lookY;
      if(this.gated && focused) {
        if(neutral(keyboard.continuous) && !Object.values(keyboard.edges).some(Boolean) && (!pad.device || pad.neutral)) this.neutralObserved=true;
        // Re-arm only after neutral followed by a fresh deliberate action. The
        // neutral frame itself must not drop a manual clutch into an engaged gear.
        else if(this.neutralObserved && (keyboard.meaningful || rising)) this.gated=false;
      }
      const chosen=this.source==='gamepad'?pad:keyboard;
      const navigation=this.source==='gamepad' ? {...pad.edges} : {};
      const edges={...chosen.edges};
      if(this.source==='gamepad') edges.enterVehicle=!!edges.interact;
      // Pause is a global safety action, ORed once rather than toggled per source.
      edges.pause=!!(keyboard.edges.pause || pad.edges?.pause);
      const blocked=this.gated || !focused || context!=='DRIVING' && context!=='ON_FOOT';
      const continuous=blocked ? zero() : {lookX:0,lookY:0,...chosen.continuous};
      if(this.source==='gamepad' && continuous.brakeAmount>0) continuous.throttle=0;
      if(blocked) for(const key of Object.keys(edges)) if(key!=='pause'&&key!=='menu') delete edges[key];
      return {source:this.source, continuous, edges, navigation, neutralGate:this.gated};
    }
  }
  root.GamepadInputRouter=GamepadInputRouter;
})(window);
