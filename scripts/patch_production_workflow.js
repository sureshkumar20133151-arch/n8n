const fs = require('fs');
const file = 'production_builder_outreach_system.json';
const json = JSON.parse(fs.readFileSync(file, 'utf8'));

const nodeA = json.nodes.find(n => n.id === 'generate_copy_no_website');
const nodeB = json.nodes.find(n => n.id === 'generate_copy_with_website');

// Update to zoomed-out avatar URL: https://iili.io/nyHVyrB.png
[nodeA, nodeB].forEach(node => {
  node.parameters.jsCode = node.parameters.jsCode
    .replace(/https:\/\/iili\.io\/nyHI144\.png/g, 'https://iili.io/nyHVyrB.png');
});

fs.writeFileSync(file, JSON.stringify(json, null, 2), 'utf8');
console.log('✅ Patched production_builder_outreach_system.json with zoomed-out avatar!');
