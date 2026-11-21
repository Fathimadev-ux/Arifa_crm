import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`pages_blocks_banner_buttons\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`link\` text,
  	\`style\` text DEFAULT 'primary',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_banner\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_banner_buttons_order_idx\` ON \`pages_blocks_banner_buttons\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_banner_buttons_parent_id_idx\` ON \`pages_blocks_banner_buttons\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_banner\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text,
  	\`text\` text,
  	\`image_id\` integer,
  	\`block_name\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_banner_order_idx\` ON \`pages_blocks_banner\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_banner_parent_id_idx\` ON \`pages_blocks_banner\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_banner_path_idx\` ON \`pages_blocks_banner\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_banner_image_idx\` ON \`pages_blocks_banner\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_buttons_buttons\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`link\` text,
  	\`style\` text DEFAULT 'primary',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_buttons\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_buttons_buttons_order_idx\` ON \`pages_blocks_buttons_buttons\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_buttons_buttons_parent_id_idx\` ON \`pages_blocks_buttons_buttons\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_buttons\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_buttons_order_idx\` ON \`pages_blocks_buttons\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_buttons_parent_id_idx\` ON \`pages_blocks_buttons\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_buttons_path_idx\` ON \`pages_blocks_buttons\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_banner_buttons\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`link\` text,
  	\`style\` text DEFAULT 'primary',
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_banner\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_banner_buttons_order_idx\` ON \`_pages_v_blocks_banner_buttons\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_banner_buttons_parent_id_idx\` ON \`_pages_v_blocks_banner_buttons\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_banner\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`heading\` text,
  	\`text\` text,
  	\`image_id\` integer,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_banner_order_idx\` ON \`_pages_v_blocks_banner\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_banner_parent_id_idx\` ON \`_pages_v_blocks_banner\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_banner_path_idx\` ON \`_pages_v_blocks_banner\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_banner_image_idx\` ON \`_pages_v_blocks_banner\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_buttons_buttons\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`link\` text,
  	\`style\` text DEFAULT 'primary',
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_buttons\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_buttons_buttons_order_idx\` ON \`_pages_v_blocks_buttons_buttons\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_buttons_buttons_parent_id_idx\` ON \`_pages_v_blocks_buttons_buttons\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_buttons\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_buttons_order_idx\` ON \`_pages_v_blocks_buttons\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_buttons_parent_id_idx\` ON \`_pages_v_blocks_buttons\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_buttons_path_idx\` ON \`_pages_v_blocks_buttons\` (\`_path\`);`)
  await db.run(sql`ALTER TABLE \`site_settings\` ADD \`max_video_upload_mb\` numeric DEFAULT 50;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`pages_blocks_banner_buttons\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_banner\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_buttons_buttons\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_buttons\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_banner_buttons\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_banner\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_buttons_buttons\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_buttons\`;`)
  await db.run(sql`ALTER TABLE \`site_settings\` DROP COLUMN \`max_video_upload_mb\`;`)
}
