
import bpy, math, os, json, random
from mathutils import Vector
scene=bpy.context.scene
out=scene["output_directory"]
def mat(name,color,metal=0,rough=.45,emission=0):
    m=bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes=True
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Metallic'].default_value=metal
    p.inputs['Roughness'].default_value=rough
    if emission:
        p.inputs['Emission Color'].default_value=(*color,1)
        p.inputs['Emission Strength'].default_value=emission
    m.diffuse_color=(*color,1)
    return m
def link(obj,coll,material=None,parent=None):
    bpy.data.collections[coll].objects.link(obj)
    if material: obj.data.materials.append(bpy.data.materials[material] if isinstance(material,str) else material)
    if parent: obj.parent=parent
    return obj
def mesh(name,verts,faces,coll,material,parent=None,bevel=0):
    me=bpy.data.meshes.new(name+'_Mesh'); me.from_pydata(verts,[],faces); me.update()
    ob=bpy.data.objects.new(name,me); link(ob,coll,material,parent)
    if bevel:
        mod=ob.modifiers.new('Soft_Edges','BEVEL'); mod.width=bevel; mod.segments=2
    return ob
def box(name,loc,size,coll,material,parent=None,bevel=.03):
    x,y,z=[v/2 for v in size]
    vs=[(-x,-y,-z),(-x,-y,z),(-x,y,-z),(-x,y,z),(x,-y,-z),(x,-y,z),(x,y,-z),(x,y,z)]
    fs=[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)]
    ob=mesh(name,vs,fs,coll,material,parent,bevel); ob.location=loc; return ob
def empty(name,coll,loc=(0,0,0)):
    ob=bpy.data.objects.new(name,None); link(ob,coll); ob.location=loc; ob.empty_display_size=.6; return ob
def cyl(name,loc,r,depth,coll,material,parent=None,axis='Z',n=20):
    vs=[]
    for h in [-depth/2,depth/2]:
        for i in range(n):
            a=2*math.pi*i/n
            vs.append((r*math.cos(a),h,r*math.sin(a)) if axis=='Y' else (r*math.cos(a),r*math.sin(a),h))
    fs=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
    fs += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    ob=mesh(name,vs,fs,coll,material,parent,.012); ob.location=loc
    for p in ob.data.polygons[2:]: p.use_smooth=True
    return ob
def bar(name,a,b,r,coll,material,parent=None):
    va,vb=Vector(a),Vector(b); ob=cyl(name,(va+vb)/2,r,(vb-va).length,coll,material,parent)
    ob.rotation_euler=(vb-va).to_track_quat('Z','Y').to_euler(); return ob
def sphere(name,loc,size,coll,material,parent=None):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=loc)
    ob=bpy.context.object; ob.name=name
    for c in list(ob.users_collection): c.objects.unlink(ob)
    link(ob,coll,material,parent)
    for v in ob.data.vertices: v.co.x*=size[0]; v.co.y*=size[1]; v.co.z*=size[2]
    for p in ob.data.polygons:p.use_smooth=True
    return ob
def loft(name,rings,coll,material,parent=None,bevel=.03):
    # each ring: x, half width, bottom, top. front direction +X
    vs=[]
    for x,w,b,t in rings: vs.extend([(x,-w,b),(x,w,b),(x,w,t),(x,-w,t)])
    fs=[(3,2,1,0)]
    for k in range(len(rings)-1):
        for j in range(4):fs.append((k*4+j,k*4+(j+1)%4,(k+1)*4+(j+1)%4,(k+1)*4+j))
    fs.append(tuple(range(len(vs)-4,len(vs))))
    return mesh(name,vs,fs,coll,material,parent,bevel)
def text_obj(name,body,loc,size,coll,material,rotation=(0,0,0),parent=None):
    cu=bpy.data.curves.new(name+'_Font','FONT');cu.body=body;cu.size=size;cu.extrude=.002
    ob=bpy.data.objects.new(name,cu);link(ob,coll,material,parent);ob.location=loc;ob.rotation_euler=rotation;return ob
def save(stage,file):
    scene["stage"]=stage;bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,file))
    print(json.dumps({"stage":stage,"file":file,"objects":len(scene.objects),"mesh_faces":sum(len(o.data.polygons) for o in scene.objects if o.type=='MESH')}))
