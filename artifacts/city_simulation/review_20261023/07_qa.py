import bpy,json,re,math
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
out=Path('C:/Users/user/Kemudi.id/artifacts/city_simulation/review_20261023')
s=bpy.context.scene
required='Car_Body Car_Glass Car_Lights Car_Wheel_FL Car_Wheel_FR Car_Wheel_RL Car_Wheel_RR Bike_Body Bike_Wheel_F Bike_Wheel_R Bike_Handlebar Bike_Seat Bike_Exhaust Bike_Lights Truck_Cabin Truck_Box Truck_Glass Truck_Lights Truck_Wheel_FL Truck_Wheel_FR Truck_Wheel_RL Truck_Wheel_RR House_Main House_01 House_02 Road_Main Road_Branch Sidewalk_01 StreetLight_01 Tree_01 Grass_Area_01'.split()
rigs=[bpy.data.objects[n+'_Rig'] for n in ['Car','Bike','Truck']]
meshes={r.name:[o for o in r.children_recursive if o.type=='MESH'] for r in rigs}
def points(o,dg):
    e=o.evaluated_get(dg)
    return [e.matrix_world@Vector(c) for c in e.bound_box]
def bounds(ps):
    return ([min(p[i] for p in ps) for i in range(3)],[max(p[i] for p in ps) for i in range(3)])
def overlap(a,b):
    return all(a[0][i]<b[1][i]-.001 and a[1][i]>b[0][i]+.001 for i in range(3))
s.frame_set(1);dg=bpy.context.evaluated_depsgraph_get()
static=[(o.name,bounds(points(o,dg))) for cn in ['Houses','Props'] for o in bpy.data.collections[cn].objects if o.type=='MESH' and not o.hide_render]
report={'frames_checked':240,'required_names_missing':[n for n in required if n not in s.objects], 'vehicle_overlaps':[],'static_overlaps':[],'lane_violations':[],'framing_violations':[],'invalid_drivers':[],'wheel_sync_max_error_rad':0.0,'wheel_contact_gap_m':{},'vehicle_dimensions_m':{},'camera_min_margin':{}}
for f in range(1,241):
    s.frame_set(f);dg=bpy.context.evaluated_depsgraph_get()
    rp={r.name:[p for o in meshes[r.name] for p in points(o,dg)] for r in rigs}
    rb={n:bounds(ps) for n,ps in rp.items()}
    for i,r in enumerate(rigs):
        b=rb[r.name]
        if f==1:report['vehicle_dimensions_m'][r.name]=[round(b[1][k]-b[0][k],3) for k in range(3)]
        if b[0][0]<-33 or b[1][0]>33 or b[0][1]<-4 or b[1][1]>4:report['lane_violations'].append([f,r.name])
        for r2 in rigs[i+1:]:
            if overlap(b,rb[r2.name]):report['vehicle_overlaps'].append([f,r.name,r2.name])
        for n,sb in static:
            if overlap(b,sb):report['static_overlaps'].append([f,r.name,n])
    for prefix,start,sign,radius in [('Car',-22,1,.37),('Bike',-29,1,.33),('Truck',24,-1,.47)]:
        rig=bpy.data.objects[prefix+'_Rig']
        wheels=[o for o in meshes[rig.name] if re.fullmatch(prefix+r'_Wheel_(FL|FR|RL|RR|F|R)',o.name)]
        expected=(rig.location.x-start)*sign/radius
        for o in wheels:
            error=abs(o.evaluated_get(dg).rotation_euler.y-expected)
            report['wheel_sync_max_error_rad']=max(report['wheel_sync_max_error_rad'],error)
            if not all(fc.driver.is_valid for fc in o.animation_data.drivers):report['invalid_drivers'].append([f,o.name])
            if f==1:report['wheel_contact_gap_m'][o.name]=round(o.matrix_world.translation.z-radius-.09,4)
    focus='Car_Rig' if 49<=f<=120 else 'Bike_Rig' if 121<=f<=168 else 'Truck_Rig' if 169<=f<=216 else None
    if focus:
        cp=[world_to_camera_view(s,s.camera,p) for p in rp[focus]]
        margin=min(min(p.x,p.y,1-p.x,1-p.y) for p in cp)
        report['camera_min_margin'][s.camera.name]=min(report['camera_min_margin'].get(s.camera.name,1),margin)
        if margin<0 or min(p.z for p in cp)<=0:report['framing_violations'].append([f,s.camera.name,margin])
    elif f in [1,48,217,240]:
        pp=[p for ps in rp.values() for p in ps]
        for hn in ['House_Main','House_01','House_02']:
            for o in bpy.data.objects[hn].children_recursive:
                if o.type=='MESH':pp.extend(points(o,dg))
        cp=[world_to_camera_view(s,s.camera,p) for p in pp]
        margin=min(min(p.x,p.y,1-p.x,1-p.y) for p in cp)
        report['camera_min_margin'][s.camera.name]=min(report['camera_min_margin'].get(s.camera.name,1),margin)
        if margin<0:report['framing_violations'].append([f,s.camera.name,margin])
vehicle_objects=bpy.data.collections['Vehicles'].objects
report['unparented_vehicle_meshes']=[o.name for o in vehicle_objects if o.type=='MESH' and not o.parent]
report['missing_materials']=[o.name for o in s.objects if o.type=='MESH' and not o.hide_render and not o.data.materials and 'Archive_Original' not in [c.name for c in o.users_collection]]
report['automatic_suffix_names']=[o.name for o in s.objects if re.search(r'\.\d{3}$',o.name)]
report['mesh_faces']=sum(len(o.data.polygons) for o in s.objects if o.type=='MESH')
report['objects']=len(s.objects)
report['duration_seconds']=(s.frame_end-s.frame_start+1)/s.render.fps
report['method']='Evaluated mesh AABB checks at every frame. Camera bounds checked for every vehicle-shot frame and both endpoints of wide shots. Wheel rotation compared to signed travel/radius. Does not perform rigid-body physics.'
(out/'qa_report.json').write_text(json.dumps(report,indent=2))
s.frame_set(1);s.camera=bpy.data.objects['Camera_Overview']
failures=[k for k in ['required_names_missing','vehicle_overlaps','static_overlaps','lane_violations','framing_violations','invalid_drivers','unparented_vehicle_meshes','missing_materials','automatic_suffix_names'] if report[k]]
print(json.dumps(report))
assert not failures, 'QA requires correction: '+str(failures)
assert report['wheel_sync_max_error_rad']<.0001
s['qa_status']='Passed 240 frame checks; see qa_report.json'
bpy.ops.wm.save_as_mainfile(filepath=str(out/'city_simulation_final.blend'))
