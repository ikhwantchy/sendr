// Run database migration for bot expiration
// Usage: npx tsx scripts/run-migration.ts

import initSqlJs from 'sql.js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const DB_PATH = join(process.cwd(), 'data/database.sqlite')

async function runMigration() {
    console.log('Running migration: Add expires_at column to bots table...')
    console.log('Database path:', DB_PATH)
    
    if (!existsSync(DB_PATH)) {
        console.error('❌ Database file not found:', DB_PATH)
        process.exit(1)
    }
    
    const SQL = await initSqlJs()
    const buffer = readFileSync(DB_PATH)
    const db = new SQL.Database(buffer)
    
    try {
        // Check if column already exists
        const tableInfo = db.exec("PRAGMA table_info(bots)")
        const columns = tableInfo[0]?.values.map((row: any[]) => row[1]) || []
        
        console.log('Current columns:', columns)
        
        const hasExpiresAt = columns.includes('expires_at')
        const hasExpiredReason = columns.includes('expired_reason')

        if (!hasExpiresAt) {
            db.run("ALTER TABLE bots ADD COLUMN expires_at TEXT NULL")
            console.log('✅ Added expires_at column')
        } else {
            console.log('ℹ️ expires_at column already exists')
        }

        if (!hasExpiredReason) {
            db.run("ALTER TABLE bots ADD COLUMN expired_reason TEXT NULL")
            console.log('✅ Added expired_reason column')
        } else {
            console.log('ℹ️ expired_reason column already exists')
        }

        // Save the database
        const data = db.export()
        const buffer = Buffer.from(data)
        writeFileSync(DB_PATH, buffer)
        
        console.log('Migration complete!')
    } catch (error) {
        console.error('Migration failed:', error)
        process.exit(1)
    } finally {
        db.close()
    }
}

runMigration()
