import bpy,json
from pathlib import Path
out=Path('C:/Users/user/Kemudi.id/artifacts/city_simulation/review_20261023')
s=bpy.context.scene
original=(s.render.resolution_percentage,s.render.filepath,s.frame_current)
s.render.resolution_percentage=80
s.frame_set(85)
s.render.filepath=str(out/'preview_car.png')
bpy.ops.render.render(write_still=True)
s.render.resolution_percentage=original[0];s.render.filepath=original[1];s.frame_set(original[2])
print(json.dumps({'render':str(out/'preview_car.png')}))
