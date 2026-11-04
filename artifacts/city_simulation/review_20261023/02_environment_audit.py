import bpy,json
from pathlib import Path
out=Path('C:/Users/user/Kemudi.id/artifacts/city_simulation/review_20261023')
s=bpy.context.scene
s.frame_set(1)
names=['Road_Main','Road_Branch','Sidewalk_01','Grass_Area_01']
assert all(n in s.objects for n in names)
report={n:{'location':list(s.objects[n].location),'dimensions':list(s.objects[n].dimensions)} for n in names}
report['units']={'system':s.unit_settings.system,'scale':s.unit_settings.scale_length}
report['road_objects']=[o.name for o in bpy.data.collections['Roads'].objects]
report['environment_objects']=[o.name for o in bpy.data.collections['Environment'].objects]
(out/'stage02_audit.json').write_text(json.dumps(report,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(out/'city_simulation_v02.blend'))
print(json.dumps(report))
