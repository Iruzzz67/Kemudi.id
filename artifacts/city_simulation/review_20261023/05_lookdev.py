import bpy,json,math
from pathlib import Path
out=Path('C:/Users/user/Kemudi.id/artifacts/city_simulation/review_20261023')
s=bpy.context.scene
s['output_directory']=str(out)
s['revision_note']='Existing scene preserved, audited, and refined through live Blender MCP.'
def principled(name):
    return bpy.data.materials[name].node_tree.nodes.get('Principled BSDF')
for name in ['Red_Metal','Blue_Metal']:
    p=principled(name)
    p.inputs['Coat Weight'].default_value=.5
    p.inputs['Coat Roughness'].default_value=.16
    p.inputs['Roughness'].default_value=.23
principled('Red_Metal').inputs['Base Color'].default_value=(.68,.012,.022,1)
principled('Rubber').inputs['Base Color'].default_value=(.009,.012,.016,1)
def microtexture(name,scale,strength,distance):
    nt=bpy.data.materials[name].node_tree
    noise=nt.nodes.new('ShaderNodeTexNoise'); noise.name='Surface_Microtexture';noise.inputs['Scale'].default_value=scale
    noise.inputs['Detail'].default_value=2
    tex=nt.nodes.new('ShaderNodeTexCoord');tex.name='Surface_Coordinates'
    bump=nt.nodes.new('ShaderNodeBump');bump.name='Surface_Micro_Bump'
    bump.inputs['Strength'].default_value=strength;bump.inputs['Distance'].default_value=distance
    nt.links.new(tex.outputs['Object'],noise.inputs['Vector'])
    nt.links.new(noise.outputs['Fac'],bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'],principled(name).inputs['Normal'])
microtexture('Asphalt',48,.28,.018)
microtexture('Concrete',32,.13,.012)
microtexture('Rubber',95,.12,.008)
microtexture('Warm_Wall',22,.12,.012)
s.world.use_nodes=True
bg=next(n for n in s.world.node_tree.nodes if n.type=='BACKGROUND')
bg.inputs['Color'].default_value=(.48,.65,.85,1)
bg.inputs['Strength'].default_value=.45
bpy.data.objects['Sun_Late_Afternoon'].data.energy=3.0
bpy.data.objects['Sun_Late_Afternoon'].data.angle=math.radians(7)
bpy.data.objects['Area_Soft_Sky'].data.energy=5000
bpy.data.objects['Area_Rim'].data.energy=8000
s.view_settings.view_transform='AgX'
s.view_settings.look='AgX - Medium High Contrast'
s.view_settings.exposure=.35
# Increase the truck shot's safe margin, preserving its animated dolly.
bpy.data.objects['Camera_Truck'].data.lens=38
s.render.engine='BLENDER_EEVEE'
if hasattr(s.eevee,'use_raytracing'): s.eevee.use_raytracing=True
if hasattr(s.eevee,'taa_render_samples'):s.eevee.taa_render_samples=64
s.render.resolution_x=1600;s.render.resolution_y=900;s.render.resolution_percentage=100
s.render.image_settings.file_format='PNG'
s.render.filepath=str(out/'frames'/'city_')
s.frame_set(1)
s.camera=bpy.data.objects['Camera_Overview']
bpy.ops.wm.save_as_mainfile(filepath=str(out/'city_simulation_v05_lookdev.blend'))
print(json.dumps({'saved':bpy.data.filepath,'engine':s.render.engine,'raytracing':getattr(s.eevee,'use_raytracing',None),'cameras':len(bpy.data.collections['Cameras'].objects),'materials':len(bpy.data.materials)}))
