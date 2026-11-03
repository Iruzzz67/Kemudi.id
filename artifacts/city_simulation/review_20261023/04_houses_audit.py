import bpy,json
from pathlib import Path
out=Path('C:/Users/user/Kemudi.id/artifacts/city_simulation/review_20261023')
required=['House_Main','House_01','House_02','StreetLight_01','Tree_01']
assert all(n in bpy.data.objects for n in required)
report={'houses':{n:{'type':bpy.data.objects[n].type,'location':list(bpy.data.objects[n].location),'children':len(bpy.data.objects[n].children_recursive)} for n in required[:3]},'props':[o.name for o in bpy.data.collections['Props'].objects if any(x in o.name for x in ['Carport','StreetLight','Tree_','Fence'])],'lights':{o.name:{'type':o.data.type,'energy':o.data.energy,'location':list(o.location)} for o in bpy.data.collections['Lights'].objects},'cameras':{o.name:{'type':o.data.type,'lens':o.data.lens,'location':list(o.location),'constraints':[c.type for c in o.constraints]} for o in bpy.data.collections['Cameras'].objects},'render':{'engine':bpy.context.scene.render.engine,'exposure':bpy.context.scene.view_settings.exposure,'look':bpy.context.scene.view_settings.look}}
(out/'stage04_audit.json').write_text(json.dumps(report,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(out/'city_simulation_v04_environment.blend'))
print(json.dumps(report))
