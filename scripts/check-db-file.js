const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'data', 'database.sqlite');

console.log('========================================');
console.log('  DATABASE FILE CHECK');
console.log('========================================');
console.log('');

if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    console.log('✅ Database file EXISTS');
    console.log('');
    console.log('Location:', dbPath);
    console.log('Size:', Math.round(stats.size / 1024), 'KB');
    console.log('Modified:', stats.mtime.toLocaleString());
    console.log('');
    console.log('========================================');
    console.log('  ACTION REQUIRED:');
    console.log('========================================');
    console.log('');
    console.log('This database file is using OLD SCHEMA!');
    console.log('');
    console.log('To fix:');
    console.log('1. Stop backend (Ctrl+C)');
    console.log('2. Delete this file manually');
    console.log('3. Restart backend');
    console.log('');
    console.log('Command to delete:');
    console.log('del "' + dbPath + '"');
    console.log('');
} else {
    console.log('✅ Database file DOES NOT EXIST');
    console.log('');
    console.log('This is GOOD!');
    console.log('Backend will create new one with correct schema.');
    console.log('');
    console.log('Just restart backend:');
    console.log('  cd backend');
    console.log('  npm run dev');
    console.log('');
}

console.log('========================================');
