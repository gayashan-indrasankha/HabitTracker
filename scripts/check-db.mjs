import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url || !/^postgres(?:ql)?:\/\//.test(url)) {
  throw new Error('DATABASE_URL must be a PostgreSQL connection URL');
}

const sql = postgres(url, { max: 1, connect_timeout: 5 });
try {
  await sql`select 1 as healthy`;
  console.log('PostgreSQL connection OK');
} finally {
  await sql.end();
}
