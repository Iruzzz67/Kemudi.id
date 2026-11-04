import bpy,json
from pathlib import Path
out=Path('C:/Users/user/Kemudi.id/artifacts/city_simulation/review_20261023')
required=['Car_Body','Car_Glass','Car_Lights','Car_Wheel_FL','Car_Wheel_FR','Car_Wheel_RL','Car_Wheel_RR','Bike_Body','Bike_Wheel_F','Bike_Wheel_R','Bike_Handlebar','Bike_Seat','Bike_Exhaust','Bike_Lights','Truck_Cabin','Truck_Box','Truck_Glass','Truck_Lights','Truck_Wheel_FL','Truck_Wheel_FR','Truck_Wheel_RL','Truck_Wheel_RR']
assert all(n in bpy.data.objects for n in required)
report={}
for prefix in ['Car','Bike','Truck']:
    rig=bpy.data.objects[prefix+'_Rig']
    children=list(rig.children_recursive)
    report[prefix]={'rig_location':list(rig.location),'rig_rotation':list(rig.rotation_euler),'children':len(children),'meshes':[{'name':o.name,'location':list(o.location),'dimensions':list(o.dimensions),'parent':o.parent.name if o.parent else None} for o in children if o.type=='MESH']}
report['materials']={m.name:{i.name:list(i.default_value) if hasattr(i.default_value,'__len__') else i.default_value for i in m.node_tree.nodes.get('Principled BSDF').inputs if i.name in ['Base Color','Roughness','Metallic','Transmission Weight']} for m in bpy.data.materials if m.use_nodes and m.node_tree.nodes.get('Principled BSDF')}
(out/'stage03_audit.json').write_text(json.dumps(report,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(out/'city_simulation_v03_vehicles.blend'))
print(json.dumps({k:{'children':v['children'],'rig_location':v['rig_location']} for k,v in report.items() if k!='materials'}))
