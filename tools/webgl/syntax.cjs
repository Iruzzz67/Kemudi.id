// Dependency-free static syntax checks for authored runtime and tooling.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = path.resolve(__dirname, '../../src/Kemudi.Web/wwwroot/simulation-3d');
let count = 0;
for (const folder of [source, path.join(source, 'systems'), __dirname]) {
  for (const file of fs.readdirSync(folder).filter(name => /\.(js|cjs)$/.test(name))) {
    new vm.Script(fs.readFileSync(path.join(folder, file), 'utf8'), { filename: path.join(folder, file) });
    count++;
  }
}
console.log(`PASS ${count} authored JavaScript files parse`);
