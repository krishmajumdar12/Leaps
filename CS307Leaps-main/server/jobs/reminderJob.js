const cron = require('node-cron');
const db = require('../config/db');

// Run every 5 minutes
cron.schedule('*/1 * * * *', async () => {
  try {
    const now = new Date();
    const start = new Date(now.getTime() + 24 * 60 * 60 * 1000 - 2 * 60 * 1000); // 24h - 2min
    const end = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 2 * 60 * 1000);   // 24h + 2min

    const startIso = start.toISOString();
    const endIso = end.toISOString();

    console.log(
        `\n\n\n\n\n\nTHE JOB WAS JUST EXECUTED\n\n\n\n\n`
    )

    // Combined query for both 'events' and 'custom-event'
    const query = `
      SELECT 
        u.id AS user_id,
        t.id AS trip_id,
        t.name AS trip_name,
        COALESCE(e.name, ce.name) AS event_name
      FROM trip_members tm
      JOIN users u ON u.id = tm.user_id
      JOIN trips t ON t.id = tm.trip_id
      JOIN trip_items ti ON ti.trip_id = t.id
      LEFT JOIN events e ON ti.item_type IN ('event', 'events') AND ti.item_id = e.id::TEXT
      LEFT JOIN customevents ce ON ti.item_type = 'custom-event' AND ti.item_id = ce.id::TEXT
      WHERE (
        (e.start_time BETWEEN $1 AND $2)
        OR (ce.start_time BETWEEN $1 AND $2)
      )
    `;

    const { rows } = await db.query(query, [startIso, endIso]);

    for (const row of rows) {
      const message = `Reminder: ${row.event_name} in "${row.trip_name}" is starting in 24 hours!`;

      const alreadySent = await db.query(
        `SELECT 1 FROM notifications 
         WHERE user_id = $1 AND trip_id = $2 AND type = 'event_reminder' AND message = $3`,
        [row.user_id, row.trip_id, message]
      );

      if (alreadySent.rows.length === 0) {
        await db.query(
          `INSERT INTO notifications (user_id, trip_id, type, message)
           VALUES ($1, $2, 'event_reminder', $3)`,
          [row.user_id, row.trip_id, message]
        );
      }
    }

    console.log(`✅ 24h reminders sent: ${rows.length}`);
  } catch (err) {
    console.error('❌ Failed to send 24h event reminders:', err);
  }
});
