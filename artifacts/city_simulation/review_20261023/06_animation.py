import bpy,json
from pathlib import Path
out=Path('C:/Users/user/Kemudi.id/artifacts/city_simulation/review_20261023')
s=bpy.context.scene
s.render.fps=24;s.render.fps_base=1;s.frame_start=1;s.frame_end=240
shots=[(1,'01_Overview_0-2s','Camera_Overview'),(49,'02_Car_2-5s','Camera_VehicleFocus'),(121,'03_Bike_5-7s','Camera_Street'),(169,'04_Truck_7-9s','Camera_Truck'),(217,'05_Finale_9-10s','Camera_Finale')]
for frame,name,cam in shots:
    marker=next((m for m in s.timeline_markers if m.frame==frame and m.camera),None)
    if not marker:marker=s.timeline_markers.new(name,frame=frame)
    marker.name=name;marker.camera=bpy.data.objects[cam]
positions={}
for f in [1,48,49,85,120,121,145,168,169,192,216,217,240]:
    s.frame_set(f)
    positions[f]={p:list(bpy.data.objects[p+'_Rig'].location) for p in ['Car','Bike','Truck']}
drivers={}
for o in bpy.data.collections['Vehicles'].objects:
    if o.animation_data and o.animation_data.drivers:
        drivers[o.name]=[{'path':d.data_path,'axis':d.array_index,'expression':d.driver.expression,'valid':d.driver.is_valid,'variables':[{'name':v.name,'type':v.type,'targets':[{'id':t.id.name if t.id else None,'path':t.data_path,'transform':t.transform_type} for t in v.targets]} for v in d.driver.variables]} for d in o.animation_data.drivers]
assert len(drivers)==10, 'All ten wheels must have rotation drivers'
assert positions[49]['Car']!=positions[120]['Car']
assert positions[121]['Bike']!=positions[168]['Bike']
assert positions[169]['Truck']!=positions[216]['Truck']
report={'duration_seconds':240/24,'shots':shots,'positions':positions,'drivers':drivers,'actions':[a.name for a in bpy.data.actions]}
(out/'stage06_audit.json').write_text(json.dumps(report,indent=2))
s.frame_set(1);s.camera=bpy.data.objects['Camera_Overview']
bpy.ops.wm.save_as_mainfile(filepath=str(out/'city_simulation_v06_animation.blend'))
print(json.dumps(report))
