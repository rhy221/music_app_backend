const fs = require('fs');
const src = process.argv[2];
const dest = process.argv[3];
const pkg = JSON.parse(fs.readFileSync(src, 'utf8'));
const deps = {};
for (const [k, v] of Object.entries(pkg.dependencies || {})) {
  if (!v.startsWith('workspace:')) deps[k] = v;
}
fs.writeFileSync(dest, JSON.stringify({ name: 'prod-deps', version: '1.0.0', dependencies: deps }, null, 2));
console.log('Production deps:', Object.keys(deps).join(', '));
