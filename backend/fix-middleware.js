const fs = require('fs');

// Fix checkPermission.js
let checkContent = fs.readFileSync('src/middleware/checkPermission.js', 'utf8');
checkContent = checkContent.replace("const db = require('../config/database');", "const { query } = require('../database/connection-sqlite');");
checkContent = checkContent.replace(/db\.query/g, 'query');
fs.writeFileSync('src/middleware/checkPermission.js', checkContent);

console.log('✅ Fixed checkPermission.js');
console.log('✅ All middleware fixed!');
