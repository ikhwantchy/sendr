/**
 * CONVERT POSTGRESQL TO SQLITE - AUTOMATIC
 * This script converts all PostgreSQL syntax to SQLite in backend files
 */

const fs = require('fs');
const path = require('path');

const filesToConvert = [
    'src/middleware/checkPermission.js',
    'src/modules/datasource/dataSourceService.ts',
    'src/database/repositories/eventLogRepository.ts',
    'src/database/repositories/keywordRuleRepository.ts',
    'src/database/repositories/botRepository.ts',
    'src/controllers/usersController.js',
    'src/controllers/permissionsController.js',
    'src/api/routes/authRoutes.ts',
];

function convertFile(filePath) {
    const fullPath = path.join(__dirname, filePath);

    if (!fs.existsSync(fullPath)) {
        console.log(`⚠️  File not found: ${filePath}`);
        return false;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;

    // Convert $1, $2, $3, etc. to ?
    // This regex replaces $N with ? in SQL queries
    content = content.replace(/\$\d+/g, '?');

    // Convert NOW() to datetime('now')
    content = content.replace(/NOW\(\)/g, "datetime('now')");

    // Convert RETURNING * to nothing (SQLite doesn't support RETURNING in all cases)
    // We'll keep it for now as some queries might need it

    if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`✅ Converted: ${filePath}`);
        return true;
    } else {
        console.log(`ℹ️  No changes: ${filePath}`);
        return false;
    }
}

console.log('🔄 Converting PostgreSQL syntax to SQLite...\n');

let convertedCount = 0;
let totalFiles = filesToConvert.length;

filesToConvert.forEach(file => {
    if (convertFile(file)) {
        convertedCount++;
    }
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`✅ Conversion complete!`);
console.log(`   Files converted: ${convertedCount}/${totalFiles}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (convertedCount > 0) {
    console.log('🚀 Next steps:');
    console.log('   1. npm run build');
    console.log('   2. Restart backend (npm run dev)');
    console.log('   3. Test login\n');
}

process.exit(0);
