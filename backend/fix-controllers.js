const fs = require('fs');

// Fix permissionsController.js
let permContent = fs.readFileSync('src/controllers/permissionsController.js', 'utf8');
permContent = permContent.replace("const db = require('../config/database');", "const { query } = require('../database/connection-sqlite');");
permContent = permContent.replace(/db\.query/g, 'query');
fs.writeFileSync('src/controllers/permissionsController.js', permContent);

console.log('✅ Fixed permissionsController.js');
console.log('✅ All controllers fixed!');
