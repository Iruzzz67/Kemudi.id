import bpy,json
from pathlib import Path
out=Path('C:/Users/user/Kemudi.id/artifacts/city_simulation/review_20261023')
s=bpy.context.scene
doc=bpy.data.texts.get('README_City_Simulation') or bpy.data.texts.new('README_City_Simulation')
doc.clear();doc.write((out/'README.md').read_text(encoding='utf-8'))
(out/'frames').mkdir(exist_ok=True)
s.render.filepath=str(out/'frames'/'city_')
s.render.resolution_percentage=100
s.frame_set(1);s.camera=bpy.data.objects['Camera_Overview']
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_perspective='CAMERA'
bpy.ops.wm.save_as_mainfile(filepath=str(out/'city_simulation_final.blend'))
files=['city_simulation_v01.blend','city_simulation_v02.blend','city_simulation_v03_vehicles.blend','city_simulation_v04_environment.blend','city_simulation_v05_lookdev.blend','city_simulation_v06_animation.blend','city_simulation_final.blend','preview_overview.png','preview_car.png','preview_bike.png','preview_truck.png','preview_finale.png','qa_report.json','README.md']
manifest={name:{'exists':(out/name).is_file(),'bytes':(out/name).stat().st_size if (out/name).is_file() else 0} for name in files}
assert all(v['exists'] and v['bytes']>0 for v in manifest.values())
(out/'manifest.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps({'file':bpy.data.filepath,'frame':s.frame_current,'camera':s.camera.name,'artifacts':manifest}))
