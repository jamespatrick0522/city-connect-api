require('dotenv').config();
const postgres = require('postgres');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing.');
  }

  const sql = postgres(process.env.DATABASE_URL, { prepare: false });

  try {
    const migrations = await sql`
      select id, hash, created_at
      from drizzle.__drizzle_migrations
      order by created_at
    `;

    const [checks] = await sql`
      select
        to_regclass('public.establishment_media') as establishment_media,
        exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'establishments'
            and column_name = 'business_permit_number'
        ) as has_business_permit_number,
        exists (
          select 1
          from pg_enum e
          join pg_type t on t.oid = e.enumtypid
          where t.typname = 'listing_status'
            and e.enumlabel = 'draft'
        ) as has_draft_status
    `;

    console.log(JSON.stringify({ migrations, checks }, null, 2));
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
