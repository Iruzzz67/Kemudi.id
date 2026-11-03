"""Run through Blender MCP on the existing Cedar Grove scene."""
import bpy
import math
from pathlib import Path

root = Path('C:/Users/user/Kemudi.id')
out = root / 'artifacts/city_simulation/revision_20261102'
out.mkdir(exist_ok=True)
bpy.context.scene.frame_set(1)

def lens(name, rig, location, dimensions, color):
    if name in bpy.data.objects:
        return
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.object
    obj.name = name
    obj.parent = rig
    obj.location = location
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for c in list(obj.users_collection): c.objects.unlink(obj)
    bpy.data.collections['Vehicles'].objects.link(obj)
    mat = bpy.data.materials.new(name + '_Material')
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Emission Color'].default_value = (*color, 1)
    shader.inputs['Emission Strength'].default_value = 0
    shader.inputs['Roughness'].default_value = .3
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new('Lens_Edge', 'BEVEL')
    bevel.width = .012
    bevel.segments = 2

# +X is forward in the authored rigs; +Y is the driver's left.
for prefix, front, rear, side, height in [
    ('Car', 2.18, -2.23, .82, .65),
    ('Bike', .70, -.87, .22, .94),
    ('Truck', 2.99, -3.26, .94, .85),
]:
    rig = bpy.data.objects[prefix + '_Rig']
    for label, y in [('L', side), ('R', -side)]:
        for end, x in [('F', front), ('R', rear)]:
            lens(f'{prefix}_Indicator_{end}{label}', rig, (x, y, height), (.045, .13, .075), (1, .28, .008))
    if not any('Taillight' in o.name for o in rig.children_recursive):
        for label, y in [('L', side * .7), ('R', -side * .7)]:
            lens(f'{prefix}_Taillight_{label}', rig, (rear, y, height + .12), (.045, .16, .075), (.8, .012, .006))

def block(name, location, dimensions, material, collection):
    if name in bpy.data.objects: return bpy.data.objects[name]
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for c in list(obj.users_collection): c.objects.unlink(obj)
    bpy.data.collections[collection].objects.link(obj)
    obj.data.materials.append(bpy.data.materials[material])
    return obj

for i in range(10):
    block(f'Crossing_Main_{i:02d}', (9, -3.6 + i * .8, .094), (2.4, .4, .008), 'Road_Paint', 'Roads')
block('Crossing_StopLine', (6.7, -2, .094), (.25, 3.5, .008), 'Road_Paint', 'Roads')
block('StreetLight_Pole_CrossingSign', (5, -4.7, 1.25), (.065, .065, 2.5), 'Alloy', 'Props')
block('Crossing_Sign_Back', (5, -4.7, 2.35), (.065, 1, .72), 'Blue_Metal', 'Props')
if 'Crossing_Sign_Text' not in bpy.data.objects:
    bpy.ops.object.text_add(location=(4.96, -4.7, 2.35), rotation=(math.pi / 2, 0, -math.pi / 2))
    obj = bpy.context.object
    obj.name = 'Crossing_Sign_Text'
    obj.data.body = 'AWAS\nPENYEBERANG'
    obj.data.align_x = obj.data.align_y = 'CENTER'
    obj.data.size = .10
    obj.data.extrude = .001
    obj.data.materials.append(bpy.data.materials['White'])
    for c in list(obj.users_collection): c.objects.unlink(obj)
    bpy.data.collections['Props'].objects.link(obj)

bpy.ops.wm.save_as_mainfile(filepath=str(out / 'city_simulation.blend'))
print('Saved revised scene with independent turn signal lenses:', bpy.data.filepath)
