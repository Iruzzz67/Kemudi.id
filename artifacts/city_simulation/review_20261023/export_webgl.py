"""Executed by the live Blender MCP add-on. Exports portable runtime assets."""
import bpy, math, json, hashlib, re
from pathlib import Path
from mathutils import Matrix, Vector

root=Path('C:/Users/user/Kemudi.id')
out=root/'src/Kemudi.Web/wwwroot/simulation-3d/models/city'
out.mkdir(parents=True,exist_ok=True)
window=bpy.context.window
source=window.scene
old_frame=source.frame_current
if window.screen.is_animation_playing:
    bpy.ops.screen.animation_cancel(restore_frame=False)
source.frame_set(1)
dg=bpy.context.evaluated_depsgraph_get()
rotate=Matrix.Rotation(math.pi/2,4,'Z')
created_materials=[]
materials={}
def material(src):
    src=src or bpy.data.materials['Concrete']
    if src.name in materials:return materials[src.name]
    m=bpy.data.materials.new('WebGL_'+src.name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    sp=src.node_tree.nodes.get('Principled BSDF') if src.use_nodes else None
    for key in ['Base Color','Metallic','Roughness','Coat Weight','Coat Roughness','Emission Color','Emission Strength']:
        if sp and key in sp.inputs:p.inputs[key].default_value=sp.inputs[key].default_value
    if src.name=='Glass':
        p.inputs['Alpha'].default_value=.4
        p.inputs['Metallic'].default_value=.1
        m.surface_render_method='DITHERED'
    m.use_backface_culling=True
    materials[src.name]=m;created_materials.append(m)
    return m
def export_scene(name,build):
    temp=bpy.data.scenes.new('WebGL_Export_'+name)
    try:
        window.scene=temp
        build(temp)
        bpy.ops.export_scene.gltf(filepath=str(out/(name+'.glb')),export_format='GLB',use_active_scene=True,export_animations=False,export_cameras=False,export_lights=False,export_yup=True,export_extras=True,export_apply=False)
    finally:
        window.scene=source
        for obj in list(temp.objects):
            data=obj.data
            bpy.data.objects.remove(obj,do_unlink=True)
            if data and data.users==0 and isinstance(data,bpy.types.Mesh):bpy.data.meshes.remove(data)
        bpy.data.scenes.remove(temp)

manifest={'source':str(root/'artifacts/city_simulation/review_20261023/city_simulation_final.blend'),'provenance':'Original project geometry authored in Blender; exported directly through Blender MCP. No third-party model downloads.','coordinates':'Meters, Y up, vehicle forward -Z, wheel axle X. Static environment mapping: web(-BlenderY, BlenderZ, -BlenderX).','files':{},'vehicles':{}}
for prefix,name,radius in [('Car','car',.37),('Bike','bike',.33),('Truck','truck',.47)]:
    rig=source.objects[prefix+'_Rig']
    transform=rotate@rig.matrix_world.inverted()
    originals=[o for o in rig.children_recursive if o.type in {'MESH','FONT','EMPTY'}]
    def build_vehicle(temp):
        copies={};positions={};bounds=[]
        for o in originals:
            evaluated=o.evaluated_get(dg)
            matrix=transform@evaluated.matrix_world
            positions[o]=matrix.translation.copy()
            if o.type in {'MESH','FONT'}:
                me=bpy.data.meshes.new_from_object(evaluated,depsgraph=dg)
                me.name=o.name+'_RuntimeMesh'
                me.transform(matrix.to_3x3().to_4x4())
                source_mats=[slot.material for slot in o.material_slots];me.materials.clear()
                for m in source_mats:me.materials.append(material(m))
                ob=bpy.data.objects.new(o.name,me)
                bounds.extend([matrix@Vector(c) for c in evaluated.bound_box])
            else:ob=bpy.data.objects.new(o.name,None)
            temp.collection.objects.link(ob);copies[o]=ob
            ob['source_name']=o.name
            if re.fullmatch(prefix+r'_Wheel_(FL|FR|RL|RR|F|R)',o.name):
                ob['wheel_radius']=radius
                ob['wheel_front']=o.name.endswith(('_FL','_FR','_F'))
        for original,ob in copies.items():
            if original.parent in copies:
                ob.parent=copies[original.parent]
                ob.location=positions[original]-positions[original.parent]
            else:ob.location=positions[original]
        low=[min(v[i] for v in bounds) for i in range(3)]
        high=[max(v[i] for v in bounds) for i in range(3)]
        manifest['vehicles'][name]={'width':high[0]-low[0],'height':high[2]-low[2],'length':high[1]-low[1],'wheel_radius':radius,'objects':len(copies)}
    export_scene(name,build_vehicle)

colliders=[]
buckets={}
for collection in ['Environment','Roads','Houses','Props']:
    for o in bpy.data.collections[collection].objects:
        if o.type not in {'MESH','FONT'} or o.hide_render or o.name=='Presentation_Backdrop':continue
        evaluated=o.evaluated_get(dg)
        me=bpy.data.meshes.new_from_object(evaluated,depsgraph=dg)
        matrix=rotate@evaluated.matrix_world
        world=[matrix@v.co for v in me.vertices]
        for poly in me.polygons:
            src=me.materials[poly.material_index] if me.materials else bpy.data.materials['Concrete']
            key=(collection,src.name)
            bucket=buckets.setdefault(key,{'verts':[],'faces':[],'material':material(src)})
            offset=len(bucket['verts'])
            bucket['verts'].extend([tuple(world[i]) for i in poly.vertices])
            bucket['faces'].append(tuple(range(offset,offset+len(poly.vertices))))
        if collection=='Houses' or (collection=='Props' and re.search(r'Trunk|Fence_|StreetLight_(Pole|Base)|Carport_Post|Bench|Bollard|Planter|Bin',o.name)):
            pts=[matrix@Vector(c) for c in evaluated.bound_box]
            # Blender coordinates after normalization -> glTF coordinates.
            web=[Vector((p.x,p.z,-p.y)) for p in pts]
            lo=[min(p[i] for p in web) for i in range(3)]
            hi=[max(p[i] for p in web) for i in range(3)]
            if hi[1]>.3:colliders.append({'name':o.name,'min':lo,'max':hi})
        bpy.data.meshes.remove(me)
def build_environment(temp):
    for (collection,matname),b in buckets.items():
        me=bpy.data.meshes.new(collection+'_'+matname)
        me.from_pydata(b['verts'],[],b['faces']);me.update()
        me.materials.append(b['material'])
        ob=bpy.data.objects.new(collection+'_'+matname,me)
        temp.collection.objects.link(ob)
export_scene('neighborhood',build_environment)
(out/'colliders.json').write_text(json.dumps({'roadHeight':.09,'roadRectangles':[[-4,4,-33,33],[-20,-4,-18.5,-11.5]],'colliders':colliders},separators=(',',':')))
for path in sorted(out.glob('*')):
    if path.name=='manifest.json':continue
    manifest['files'][path.name]={'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
manifest['environment_draw_groups']=len(buckets)
(out/'manifest.json').write_text(json.dumps(manifest,indent=2))
for m in created_materials:
    if m.users==0:bpy.data.materials.remove(m)
source.frame_set(old_frame)
print(json.dumps(manifest))
