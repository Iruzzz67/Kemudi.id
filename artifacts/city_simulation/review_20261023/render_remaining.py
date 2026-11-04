import bpy,json,time
from pathlib import Path
out=Path('C:/Users/user/Kemudi.id/artifacts/city_simulation/review_20261023')
s=bpy.context.scene
original=(s.render.resolution_percentage,s.render.filepath,s.frame_current)
done=[]
try:
    s.render.resolution_percentage=60
    for name,frame in [('overview',1),('bike',145),('truck',192),('finale',240)]:
        s.frame_set(frame)
        s.render.filepath=str(out/('preview_'+name+'.png'))
        bpy.ops.render.render(write_still=True)
        done.append({'name':name,'frame':frame,'path':s.render.filepath})
        (out/'render_status.json').write_text(json.dumps(done,indent=2))
finally:
    s.render.resolution_percentage=original[0];s.render.filepath=original[1];s.frame_set(original[2])
print(json.dumps(done))
