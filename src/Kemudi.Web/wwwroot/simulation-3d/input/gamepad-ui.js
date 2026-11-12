(function(root) {
  'use strict';
  const labels={interact:'Interaksi',horn:'Klakson',ignition:'Mesin',camera:'Kamera',signalLeft:'Sein kiri',signalRight:'Sein kanan',brake:'Rem',throttle:'Gas',menu:'Menu aksi',pause:'Jeda',clutch:'Kopling',hazard:'Hazard',lights:'Lampu',handbrake:'Rem tangan',gearDown:'Turun gigi / Reverse',gearUp:'Naik gigi / Drive'};
  const statuses={disconnected:'Controller tidak terhubung',connected:'Controller terhubung',active:'Controller aktif',unsupported:'Controller tidak didukung',error:'Gamepad diblokir / error browser',disabled:'Controller dinonaktifkan'};
  function el(tag,text,cls) { const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e; }
  class GamepadUI {
    constructor(callbacks={}) {
      this.callbacks=callbacks;this.state={};this.isOpen=false;this.refs=new Map();this.pageIndex=0;
      this.panel=el('aside',null,'gp-status');this.panel.id='gamepad-status';
      this.status=el('span','Controller tidak terhubung');this.status.setAttribute('role','status');this.status.setAttribute('aria-live','polite');
      this.openButton=this.button('Controller / Aksi',()=>this.open());this.openButton.id='gamepad-open';
      this.panel.append(this.status,this.openButton);document.body.append(this.panel);
      this.overlay=el('div',null,'gp-overlay');this.overlay.hidden=true;
      this.dialog=el('section',null,'gp-dialog');this.dialog.setAttribute('role','dialog');this.dialog.setAttribute('aria-modal','true');this.dialog.setAttribute('aria-labelledby','gp-title');
      const title=el('h2','Controller & aksi kendaraan');title.id='gp-title';
      this.message=el('p',null,'gp-message');this.message.setAttribute('role','status');
      this.help=el('p','Simulasi dijeda. D-pad pilih; kiri/kanan ubah nilai; A konfirmasi; B kembali. Lepaskan trigger/analog sebelum melanjutkan.','gp-help');
      this.actions=el('div',null,'gp-actions');this.settings=el('div',null,'gp-settings');
      this.closeButton=this.button('Kembali ke simulasi',()=>this.close());
      this.dialog.append(title,this.message,this.help,this.actions,this.settings,this.closeButton);this.overlay.append(this.dialog);document.body.append(this.overlay);
      this._key=e=>{
        if(!this.isOpen)return;
        if(e.key==='Escape'){e.preventDefault();e.stopPropagation();this.close();}
        if(e.key==='Tab') {
          const items=this.focusables(this.dialog);if(!items.length)return;
          const at=items.indexOf(document.activeElement);
          if(e.shiftKey&&at<=0){e.preventDefault();items.at(-1).focus();}
          else if(!e.shiftKey&&at===items.length-1){e.preventDefault();items[0].focus();}
        }
      };
      document.addEventListener('keydown',this._key);
    }
    button(text,callback) {const b=el('button',text);b.type='button';b.addEventListener('click',callback);return b;}
    open() {
      if(this.isOpen)return;this.previousFocus=document.activeElement;this.openedPhase=this.state.phase;
      this.isOpen=true;this.overlay.hidden=false;this.build();
      this.callbacks.onOpen?.();this.focusables(this.dialog)[0]?.focus();
    }
    close() {
      if(!this.isOpen)return;this.isOpen=false;this.overlay.hidden=true;
      const target=this.previousFocus?.isConnected?this.previousFocus:document.getElementById('sim-canvas');target?.focus();
      this.callbacks.onClose?.();
    }
    command(name) {try{this.callbacks.onAction?.(name);}catch(error){this.message.textContent=error.message||'Aksi tidak tersedia.';}}
    build() {
      this.actions.replaceChildren();this.settings.replaceChildren();this.refs.clear();
      const driving=['driving','paused'].includes(this.openedPhase);
      if(driving) {
        const entries=[['ignition','Nyalakan / matikan mesin'],['handbrake','Rem tangan'],['camera','Ganti kamera'],['lights','Lampu utama'],['highBeam','Lampu jauh'],['hazard','Hazard']];
        if(this.state.vehicleType==='MOTOR')entries.push(['helmet','Helm'],['jacket','Jaket'],['gloves','Sarung tangan'],['shoes','Sepatu']);
        else entries.push(['seatbelt','Sabuk pengaman'],['mirror','Tengok spion'],['seatUp','Naikkan kursi'],['seatDown','Turunkan kursi']);
        if(this.state.transmission==='manual') entries.push(['gearUp','Naik gigi (kopling)'],['gearDown','Turun gigi (kopling)']);
        else entries.push(['selectDrive','Pilih maju (berhenti + rem)'],['selectReverse','Pilih mundur (berhenti + rem)']);
        for(const [name,label]of entries){const b=this.button(label,()=>this.command(name));b.dataset.action=name;this.actions.append(b);}
      } else this.actions.append(el('p',this.openedPhase==='walking'?'Tutup menu lalu tekan A dekat kendaraan untuk masuk.':'Gunakan D-pad dan A untuk memilih menu simulasi.'));
      this.settings.append(el('h3','Handling & setir / stang'));
      this.settings.append(el('p','Berlaku untuk keyboard dan controller. Berat mengatur kecepatan respons setir/stang, bukan kekuatan fisik atau force feedback. Sensitivitas analog tetap diatur terpisah.','gp-help'));
      const presets=el('div',null,'gp-handling-presets');this.handlingPresets=[];
      for(const [label,value]of [['Ringan',0],['Normal',50],['Berat',100]]){
        const button=this.button(label,()=>this.change({steeringWeight:value}));
        button.dataset.handlingPreset=String(value);button.setAttribute('aria-pressed','false');
        this.handlingPresets.push(button);presets.append(button);
      }
      this.settings.append(presets);
      for(const [name,label,min,max,step]of [
        ['steeringWeight','Berat setir / stang (0 ringan - 100 berat)',0,100,5],
        ['steeringReturn','Kembali ke tengah (0,5 - 2x)',.5,2,.1]]){
        const input=el('input');input.type='number';input.min=min;input.max=max;input.step=step;input.dataset.setting=name;
        input.addEventListener('change',()=>this.change({[name]:input.valueAsNumber}));
        this.refs.set(name,input);this.settings.append(this.row(label,input));
      }
      this.settings.append(el('h3','Perangkat & sensitivitas'));
      this.deviceSelect=el('select');this.deviceSelect.setAttribute('aria-label','Gamepad aktif');this.deviceSelect.addEventListener('change',()=>this.callbacks.onDevice?.(this.deviceSelect.value===''?null:Number(this.deviceSelect.value)));
      this.settings.append(this.row('Gamepad aktif',this.deviceSelect));
      for(const [name,label,type,min,max,step]of [
        ['enabled','Aktifkan controller','checkbox'],['stickDeadzone','Deadzone analog','number',0,.5,.01],
        ['steerSensitivity','Sensitivitas setir','number',.1,2,.1],['steerExponent','Kurva setir','number',.5,4,.1],
        ['triggerDeadzone','Deadzone trigger','number',0,.5,.01],['clutchAssist','Bantuan kopling (bukan manual penuh)','checkbox']]) {
        const input=el('input');input.type=type;input.dataset.setting=name;
        if(type==='number'){input.min=min;input.max=max;input.step=step;}
        input.addEventListener('change',()=>this.change({[name]:type==='checkbox'?input.checked:Number(input.value)}));
        this.refs.set(name,input);this.settings.append(this.row(label,input));
      }
      this.settings.append(el('h3','Mapping tombol standard (0–31)'));
      this.settings.append(el('p','Menu tetap memakai D-pad/A/B standar. Duplikat tombol ditolak. Nonstandard belum didukung.','gp-help'));
      for(const [name,label]of Object.entries(labels)) {
        const input=el('input');input.type='number';input.min=0;input.max=31;input.step=1;input.dataset.binding=name;
        input.addEventListener('change',()=>this.change({bindings:{...this.state.settings?.bindings,[name]:Number(input.value)}}));
        this.refs.set('binding:'+name,input);this.settings.append(this.row(label,input));
      }
      this.settings.append(this.button('Reset ke default',()=>this.change({reset:true})));
      this.settings.append(el('p','RT gas · LT rem · stick kiri setir · A masuk · X mesin · Y kamera · Menu jeda · View aksi · L3 kopling + D-pad gigi.','gp-help'));
      this.deviceKey=null;this.syncSettings();this.syncDevices();
    }
    row(label,input){const row=el('label',null,'gp-row');row.append(el('span',label),input);return row;}
    change(patch) {
      try {const result=this.callbacks.onSettings?.(patch);if(result===false)throw Error('Pengaturan ditolak: periksa rentang atau duplikat tombol.');this.message.textContent='Pengaturan diperbarui.';}
      catch(error){this.message.textContent=error.message||'Pengaturan tidak valid.';this.syncSettings();}
    }
    syncSettings() {
      const value=this.state.settings||{};
      for(const [name,input]of this.refs){const v=name.startsWith('binding:')?value.bindings?.[name.slice(8)]:value[name];if(input.type==='checkbox')input.checked=!!v;else if(v!==undefined)input.value=String(v);}
      for(const button of this.handlingPresets||[])button.setAttribute('aria-pressed',String(Number(button.dataset.handlingPreset)===(value.steeringWeight??50)));
    }
    syncDevices() {
      if(!this.deviceSelect)return;
      const key=JSON.stringify([this.state.devices,this.state.device?.index]);if(key===this.deviceKey)return;this.deviceKey=key;
      this.deviceSelect.replaceChildren();const auto=el('option','Otomatis setelah tombol ditekan');auto.value='';this.deviceSelect.append(auto);
      for(const device of this.state.devices||[]){const option=el('option',`${device.index}: ${device.id} (${device.mapping||'nonstandard'})`);option.value=String(device.index);this.deviceSelect.append(option);}
      this.deviceSelect.value=this.state.device?String(this.state.device.index):'';
    }
    update(state={}) {
      this.state=state;
      const text=(statuses[state.status]||'Tekan tombol pada gamepad')+(state.status==='disconnected'?' · fokuskan simulator lalu tekan tombol':'')+(state.source==='gamepad'?' · aktif':' · keyboard')+(state.neutralGate?' · lepaskan trigger/analog':'');
      if(this.status.textContent!==text)this.status.textContent=text;
      if(this.isOpen){if(state.message&&this.lastMessage!==state.message){this.message.textContent=state.message;this.lastMessage=state.message;}this.syncDevices();
        const key=JSON.stringify(state.settings);if(this.settingsKey!==key){this.settingsKey=key;this.syncSettings();}}
    }
    focusables(container) {return [...container.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]')].filter(e=>!e.hidden&&e.getClientRects().length);}
    adjust(target,direction) {
      if(target.tagName==='SELECT'){target.selectedIndex=Math.max(0,Math.min(target.options.length-1,target.selectedIndex+direction));target.dispatchEvent(new Event('change',{bubbles:true}));return true;}
      if(target.tagName==='INPUT'&&target.type==='number'){
        if(target.dataset.binding){const used=new Set(Object.entries(this.state.settings?.bindings||{}).filter(([name])=>name!==target.dataset.binding).map(([,value])=>value));let next=Number(target.value);for(let n=0;n<32;n++){next=(next+direction+32)%32;if(!used.has(next)){target.value=String(next);break;}}}
        else direction>0?target.stepUp():target.stepDown();
        target.dispatchEvent(new Event('change',{bubbles:true}));return true;
      }
      if(target.tagName==='INPUT'&&target.type==='checkbox'){target.click();return true;}return false;
    }
    navigate(edges,container) {
      const items=this.focusables(container);if(!items.length)return;
      let at=items.indexOf(document.activeElement);if(at<0)at=0;
      if(edges.menuUp||edges.menuDown){at=(at+(edges.menuDown?1:-1)+items.length)%items.length;items[at].focus();items[at].scrollIntoView({block:'nearest'});}
      else if(edges.menuLeft||edges.menuRight){if(!this.adjust(items[at],edges.menuRight?1:-1)){at=(at+(edges.menuRight?1:-1)+items.length)%items.length;items[at].focus();}}
      if(edges.confirm){items[at].focus();if(items[at].tagName==='SELECT')this.adjust(items[at],1);else items[at].click();}
    }
    handle(edges={}) {if(!this.isOpen)return;if(edges.back||edges.menu){this.close();return;}this.navigate(edges,this.dialog);}
    handlePage(edges={},container=document.body) {
      if(this.isOpen)return;
      if(edges.back){const back=this.focusables(container).find(e=>e.id==='pause-resume'||e.dataset.action==='change');if(back){back.click();return;}}
      this.navigate(edges,container);
    }
    dispose(){if(this.isOpen)this.close();document.removeEventListener('keydown',this._key);this.panel.remove();this.overlay.remove();}
  }
  root.GamepadUI=GamepadUI;
})(window);
