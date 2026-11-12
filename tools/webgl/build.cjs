// Assemble the browser simulator without changing the independent Unity project.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const source = path.join(root, 'src/Kemudi.Web/wwwroot/simulation-3d');
const output = path.join(root, 'Builds/WebGL');
const roster = {};
// An authored script referenced by the portable entry must actually ship.
const entry = fs.readFileSync(path.join(source, 'index.html'), 'utf8');
for (const [, script] of entry.matchAll(/<script\s+src="([^"]+)"/g)) {
  const target = path.resolve(source, script);
  const relative = path.relative(source, target);
  if (relative.startsWith('..') || path.isAbsolute(relative) || !fs.statSync(target).isFile())
    throw Error(`Missing or unsafe runtime script: ${script}`);
}
// Reject stale or mixed asset packages before copying anything into the build.
const assetRoot = path.join(source, 'models/city');
const assets = JSON.parse(fs.readFileSync(path.join(assetRoot, 'manifest.json'), 'utf8'));
for (const [name, expected] of Object.entries(assets.files)) {
  const data = fs.readFileSync(path.join(assetRoot, name));
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  if (hash !== expected.sha256 || data.length !== expected.bytes)
    throw Error(`Asset package mismatch: ${name}. Export the complete package from Blender again.`);
}
function copy(relative) {
  const from = path.join(source, relative);
  if (fs.statSync(from).isDirectory()) {
    for (const name of fs.readdirSync(from)) copy(path.join(relative, name));
    return;
  }
  const data = fs.readFileSync(from);
  if (relative.endsWith('.glb')) {
    if (data.toString('ascii', 0, 4) !== 'glTF' || data.readUInt32LE(4) !== 2 || data.readUInt32LE(8) !== data.length)
      throw Error(`Invalid GLB: ${relative}`);
    const json = JSON.parse(data.toString('utf8', 20, 20 + data.readUInt32LE(12)));
    if (json.animations?.length) throw Error(`Baked presentation animation found in drivable asset: ${relative}`);
    if (relative.endsWith('car.glb') || relative.endsWith('truck.glb') || relative.endsWith('bike.glb')) {
      const wheels = json.nodes.filter(n => n.extras?.wheel_radius);
      const expected = relative.endsWith('bike.glb') ? 2 : 4;
      if (wheels.length !== expected) throw Error(`Expected ${expected} wheel pivots in ${relative}`);
    }
  }
  const target = path.join(output, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(from, target);
  roster[relative.replaceAll('\\', '/')] = { bytes: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex') };
}
for (const name of fs.readdirSync(source).filter(n => /\.(html|js|css)$/.test(n))) copy(name);
copy('vendor');
copy('models/city');
if (fs.existsSync(path.join(source, 'systems'))) copy('systems');
if (fs.existsSync(path.join(source, 'input'))) copy('input');
fs.writeFileSync(path.join(output, 'build-manifest.json'), JSON.stringify({ runtime: 'Three.js r128 / WebGL', entry: 'index.html', files: roster }, null, 2));
fs.copyFileSync(path.join(__dirname, 'README.md'), path.join(output, 'README.md'));
fs.writeFileSync(path.join(output, 'README.txt'), 'Kemudi.id WebGL\nFrom the project root: npm.cmd --prefix tools/webgl start\nOr serve this exported folder over HTTP, for example:\npython -m http.server 8080 --directory Builds/WebGL\nOpen http://localhost:8080\nAll runtime scripts and models are included locally. This is the native browser simulation used by Kemudi.Web, not a Unity player build.\nControls: Enter enter vehicle, I ignition, Space handbrake, W gas, S brake, A/D steer, R reverse, C camera, P pause.\n');
console.log(JSON.stringify({ output, files: Object.keys(roster).length, bytes: Object.values(roster).reduce((n, f) => n + f.bytes, 0) }, null, 2));
