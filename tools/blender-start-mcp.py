"""Start the repository's Blender MCP add-on in a local authoring session."""
import importlib.util
import bpy

spec = importlib.util.spec_from_file_location('kemudi_blender_mcp', 'C:/Users/user/Kemudi.id/blender-mcp/addon.py')
addon = importlib.util.module_from_spec(spec)
spec.loader.exec_module(addon)
addon.register()
bpy.types.kemudi_mcp_server = addon.BlenderMCPServer(host='127.0.0.1', port=9876)
bpy.types.kemudi_mcp_server.start()
print('Kemudi Blender MCP listening on 127.0.0.1:9876')
