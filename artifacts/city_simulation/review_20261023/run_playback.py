import bpy,json
w=bpy.context.window_manager.windows[0]
s=w.scene
s.frame_set(1)
s.camera=bpy.data.objects['Camera_Overview']
s.sync_mode='FRAME_DROP'
a=next(a for a in w.screen.areas if a.type=='VIEW_3D')
a.spaces.active.region_3d.view_perspective='CAMERA'
a.spaces.active.overlay.show_overlays=False
a.spaces.active.shading.type='MATERIAL'
r=next(r for r in a.regions if r.type=='WINDOW')
with bpy.context.temp_override(window=w,area=a,region=r):
    if not w.screen.is_animation_playing:
        bpy.ops.screen.animation_play()
print(json.dumps(dict(file=bpy.data.filepath,playing=w.screen.is_animation_playing,frame=s.frame_current,fps=s.render.fps)))
