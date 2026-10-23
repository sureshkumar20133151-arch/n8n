const { Client } = require('pg');

const client = new Client({
  host: 'ep-small-hill-ao5qihno.c-2.ap-southeast-1.aws.neon.tech',
  port: 5432,
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_Gme79tBoJKQP',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const res = await client.query('SELECT * FROM oauth_clients ORDER BY "createdAt" DESC LIMIT 1');
  const c = res.rows[0];
  console.log('CLIENT_ID=' + c.id);
  console.log('CLIENT_SECRET=' + c.clientSecret);
  console.log('REDIRECT_URIS=' + JSON.stringify(c.redirectUris));
  await client.end();
}

run().catch(console.error);
