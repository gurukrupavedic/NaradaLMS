import { Client } from 'pg';

/**
 * Fix Chapter Order for Track 1 (Vaidika Nithya Karma)
 * 
 * ISSUE: Track 1 chapters have order values 2-11 instead of 1-10
 * FIX: Decrement all order values by 1
 */

async function fixTrack1ChapterOrder() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:welcome@localhost:5432/vediclms_dev'
    });

    try {
        await client.connect();
        console.log('✅ Connected to database');

        // Start transaction
        await client.query('BEGIN');
        console.log('📝 Starting transaction...');

        // Get current chapters for Track 1 (trackId = 2)
        const beforeResult = await client.query(
            'SELECT id, title, track_id, "order" FROM chapters WHERE track_id = 2 ORDER BY "order" ASC'
        );

        console.log('\n📊 BEFORE FIX:');
        console.log('Total chapters:', beforeResult.rows.length);
        console.log('Order values:', beforeResult.rows.map(r => r.order).join(', '));
        console.table(beforeResult.rows.map(r => ({
            id: r.id,
            title: r.title.substring(0, 40),
            order: r.order
        })));

        // Update order values: decrement each by 1
        const updateResult = await client.query(`
      UPDATE chapters 
      SET "order" = "order" - 1 
      WHERE track_id = 2
      RETURNING id, title, "order"
    `);

        console.log('\n✨ UPDATED:', updateResult.rowCount, 'chapters');

        // Verify the fix
        const afterResult = await client.query(
            'SELECT id, title, track_id, "order" FROM chapters WHERE track_id = 2 ORDER BY "order" ASC'
        );

        console.log('\n📊 AFTER FIX:');
        console.log('Total chapters:', afterResult.rows.length);
        console.log('Order values:', afterResult.rows.map(r => r.order).join(', '));
        console.table(afterResult.rows.map(r => ({
            id: r.id,
            title: r.title.substring(0, 40),
            order: r.order
        })));

        // Commit transaction
        await client.query('COMMIT');
        console.log('\n✅ Transaction committed successfully!');
        console.log('🎉 Chapter order fixed! CH1 should now appear in the UI.');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Error occurred, rolling back transaction');
        console.error(error);
        process.exit(1);
    } finally {
        await client.end();
        console.log('\n👋 Disconnected from database');
    }
}

// Run the fix
fixTrack1ChapterOrder();
