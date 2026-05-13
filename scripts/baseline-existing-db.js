const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

require('dotenv').config();
const postgres = require('postgres');

const migrationTag = '0000_sour_chamber';
const migrationWhen = 1773749508471;

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required.');
  }

  const migrationPath = path.join(process.cwd(), 'drizzle', `${migrationTag}.sql`);
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  const migrationHash = crypto.createHash('sha256').update(migrationSql).digest('hex');

  const sql = postgres(process.env.DATABASE_URL, { prepare: false });

  try {
    const [baseSchema] = await sql`
      select
        to_regclass('public.users') is not null as has_users,
        to_regclass('public.establishments') is not null as has_establishments,
        exists (
          select 1
          from pg_type t
          join pg_namespace n on n.oid = t.typnamespace
          where n.nspname = 'public'
            and t.typname = 'business_status'
        ) as has_business_status
    `;

    if (!baseSchema?.has_users || !baseSchema?.has_establishments || !baseSchema?.has_business_status) {
      throw new Error(
        'The existing base schema was not detected. Refusing to baseline migration metadata.',
      );
    }

    await sql`create schema if not exists drizzle`;
    await sql`
      create table if not exists drizzle.__drizzle_migrations (
        id serial primary key,
        hash text not null,
        created_at bigint
      )
    `;

    const rows = await sql`
      select id, hash, created_at
      from drizzle.__drizzle_migrations
      order by created_at
    `;

    if (rows.length > 0) {
      console.log('Drizzle migration table already has entries. No baseline changes were made.');
      console.table(rows);
      return;
    }

    await sql`
      insert into drizzle.__drizzle_migrations (hash, created_at)
      values (${migrationHash}, ${migrationWhen})
    `;

    console.log(`Baselined existing database with ${migrationTag}.`);
    console.log('You can now run: npm run drizzle:migrate');
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
