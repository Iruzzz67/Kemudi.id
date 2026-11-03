import bpy, json
from pathlib import Path
out = Path('C:/Users/user/Kemudi.id/artifacts/city_simulation/review_20261023')
source = Path(bpy.data.filepath)
required = ['Vehicles','Environment','Roads','Houses','Props','Lights','Cameras','Animation','Materials']
for name in required:
    if name not in bpy.data.collections:
        c = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(c)
audit = dict(source=str(source), version=bpy.app.version_string, objects=len(bpy.context.scene.objects), collections={c.name:len(c.all_objects) for c in bpy.data.collections}, scenes=[s.name for s in bpy.data.scenes])
(out/'initial_audit.json').write_text(json.dumps(audit,indent=2))
for t in bpy.data.texts:
    if t.name.endswith('.py'):
        (out/t.name).write_text(t.as_string(),encoding='utf-8')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'preserved_original.blend'),copy=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'city_simulation_v01.blend'))
print(json.dumps(audit))
