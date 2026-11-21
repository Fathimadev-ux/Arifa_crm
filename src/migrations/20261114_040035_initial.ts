import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`pages_blocks_hero_slides\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`tagline\` text,
  	\`subtext\` text,
  	\`image_id\` integer,
  	\`products_button_label\` text DEFAULT 'Our Products',
  	\`contact_button_label\` text DEFAULT 'Contact Us',
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_hero\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_slides_order_idx\` ON \`pages_blocks_hero_slides\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_slides_parent_id_idx\` ON \`pages_blocks_hero_slides\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_slides_image_idx\` ON \`pages_blocks_hero_slides\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_hero\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_order_idx\` ON \`pages_blocks_hero\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_parent_id_idx\` ON \`pages_blocks_hero\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_path_idx\` ON \`pages_blocks_hero\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_product_categories\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_product_categories_order_idx\` ON \`pages_blocks_product_categories\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_product_categories_parent_id_idx\` ON \`pages_blocks_product_categories\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_product_categories_path_idx\` ON \`pages_blocks_product_categories\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_about_paragraphs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`text\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_about\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_about_paragraphs_order_idx\` ON \`pages_blocks_about_paragraphs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_about_paragraphs_parent_id_idx\` ON \`pages_blocks_about_paragraphs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_about_pillars\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_about\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_about_pillars_order_idx\` ON \`pages_blocks_about_pillars\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_about_pillars_parent_id_idx\` ON \`pages_blocks_about_pillars\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_about\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`company_name\` text,
  	\`heading\` text,
  	\`intro\` text,
  	\`image_id\` integer,
  	\`block_name\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_about_order_idx\` ON \`pages_blocks_about\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_about_parent_id_idx\` ON \`pages_blocks_about\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_about_path_idx\` ON \`pages_blocks_about\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_about_image_idx\` ON \`pages_blocks_about\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_sustainability_features\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`text\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_sustainability\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_sustainability_features_order_idx\` ON \`pages_blocks_sustainability_features\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_sustainability_features_parent_id_idx\` ON \`pages_blocks_sustainability_features\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_sustainability\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`eyebrow\` text,
  	\`heading\` text,
  	\`stat_value\` text,
  	\`stat_text\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_sustainability_order_idx\` ON \`pages_blocks_sustainability\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_sustainability_parent_id_idx\` ON \`pages_blocks_sustainability\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_sustainability_path_idx\` ON \`pages_blocks_sustainability\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_essentials_categories_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_essentials_categories\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_essentials_categories_items_order_idx\` ON \`pages_blocks_essentials_categories_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_essentials_categories_items_parent_id_idx\` ON \`pages_blocks_essentials_categories_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_essentials_categories\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`icon_id\` integer,
  	FOREIGN KEY (\`icon_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_essentials\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_essentials_categories_order_idx\` ON \`pages_blocks_essentials_categories\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_essentials_categories_parent_id_idx\` ON \`pages_blocks_essentials_categories\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_essentials_categories_icon_idx\` ON \`pages_blocks_essentials_categories\` (\`icon_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_essentials\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_essentials_order_idx\` ON \`pages_blocks_essentials\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_essentials_parent_id_idx\` ON \`pages_blocks_essentials\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_essentials_path_idx\` ON \`pages_blocks_essentials\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_services_services\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`text\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_services\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_services_services_order_idx\` ON \`pages_blocks_services_services\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_services_services_parent_id_idx\` ON \`pages_blocks_services_services\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_services\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text,
  	\`intro\` text,
  	\`button_label\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_services_order_idx\` ON \`pages_blocks_services\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_services_parent_id_idx\` ON \`pages_blocks_services\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_services_path_idx\` ON \`pages_blocks_services\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_leadership_members\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`role\` text,
  	\`photo_id\` integer,
  	FOREIGN KEY (\`photo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_leadership\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_leadership_members_order_idx\` ON \`pages_blocks_leadership_members\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_leadership_members_parent_id_idx\` ON \`pages_blocks_leadership_members\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_leadership_members_photo_idx\` ON \`pages_blocks_leadership_members\` (\`photo_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_leadership\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`eyebrow\` text,
  	\`heading\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_leadership_order_idx\` ON \`pages_blocks_leadership\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_leadership_parent_id_idx\` ON \`pages_blocks_leadership\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_leadership_path_idx\` ON \`pages_blocks_leadership\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_contact\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`eyebrow\` text,
  	\`heading\` text,
  	\`submit_label\` text DEFAULT 'Send Message',
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_contact_order_idx\` ON \`pages_blocks_contact\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_contact_parent_id_idx\` ON \`pages_blocks_contact\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_contact_path_idx\` ON \`pages_blocks_contact\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_faqs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`question\` text,
  	\`answer\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_faqs_order_idx\` ON \`pages_faqs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_faqs_parent_id_idx\` ON \`pages_faqs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_key_facts\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`value\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_key_facts_order_idx\` ON \`pages_key_facts\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_key_facts_parent_id_idx\` ON \`pages_key_facts\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_how_to_order\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`step\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_how_to_order_order_idx\` ON \`pages_how_to_order\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_how_to_order_parent_id_idx\` ON \`pages_how_to_order\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`slug\` text,
  	\`body\` text,
  	\`summary\` text,
  	\`seo_meta_title\` text,
  	\`seo_meta_description\` text,
  	\`seo_share_image_id\` integer,
  	\`seo_canonical_url\` text,
  	\`seo_include_in_sitemap\` integer DEFAULT true,
  	\`seo_hide_from_search\` integer DEFAULT false,
  	\`plain_text\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`seo_share_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`pages_slug_idx\` ON \`pages\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`pages_seo_seo_share_image_idx\` ON \`pages\` (\`seo_share_image_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_updated_at_idx\` ON \`pages\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`pages_created_at_idx\` ON \`pages\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`pages__status_idx\` ON \`pages\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_hero_slides\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`tagline\` text,
  	\`subtext\` text,
  	\`image_id\` integer,
  	\`products_button_label\` text DEFAULT 'Our Products',
  	\`contact_button_label\` text DEFAULT 'Contact Us',
  	\`_uuid\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_hero\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_slides_order_idx\` ON \`_pages_v_blocks_hero_slides\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_slides_parent_id_idx\` ON \`_pages_v_blocks_hero_slides\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_slides_image_idx\` ON \`_pages_v_blocks_hero_slides\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_hero\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_order_idx\` ON \`_pages_v_blocks_hero\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_parent_id_idx\` ON \`_pages_v_blocks_hero\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_path_idx\` ON \`_pages_v_blocks_hero\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_product_categories\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`heading\` text,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_product_categories_order_idx\` ON \`_pages_v_blocks_product_categories\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_product_categories_parent_id_idx\` ON \`_pages_v_blocks_product_categories\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_product_categories_path_idx\` ON \`_pages_v_blocks_product_categories\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_about_paragraphs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`text\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_about\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_about_paragraphs_order_idx\` ON \`_pages_v_blocks_about_paragraphs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_about_paragraphs_parent_id_idx\` ON \`_pages_v_blocks_about_paragraphs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_about_pillars\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_about\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_about_pillars_order_idx\` ON \`_pages_v_blocks_about_pillars\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_about_pillars_parent_id_idx\` ON \`_pages_v_blocks_about_pillars\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_about\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`company_name\` text,
  	\`heading\` text,
  	\`intro\` text,
  	\`image_id\` integer,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_about_order_idx\` ON \`_pages_v_blocks_about\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_about_parent_id_idx\` ON \`_pages_v_blocks_about\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_about_path_idx\` ON \`_pages_v_blocks_about\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_about_image_idx\` ON \`_pages_v_blocks_about\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_sustainability_features\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`text\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_sustainability\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_sustainability_features_order_idx\` ON \`_pages_v_blocks_sustainability_features\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_sustainability_features_parent_id_idx\` ON \`_pages_v_blocks_sustainability_features\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_sustainability\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`eyebrow\` text,
  	\`heading\` text,
  	\`stat_value\` text,
  	\`stat_text\` text,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_sustainability_order_idx\` ON \`_pages_v_blocks_sustainability\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_sustainability_parent_id_idx\` ON \`_pages_v_blocks_sustainability\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_sustainability_path_idx\` ON \`_pages_v_blocks_sustainability\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_essentials_categories_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_essentials_categories\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_essentials_categories_items_order_idx\` ON \`_pages_v_blocks_essentials_categories_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_essentials_categories_items_parent_id_idx\` ON \`_pages_v_blocks_essentials_categories_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_essentials_categories\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`icon_id\` integer,
  	\`_uuid\` text,
  	FOREIGN KEY (\`icon_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_essentials\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_essentials_categories_order_idx\` ON \`_pages_v_blocks_essentials_categories\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_essentials_categories_parent_id_idx\` ON \`_pages_v_blocks_essentials_categories\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_essentials_categories_icon_idx\` ON \`_pages_v_blocks_essentials_categories\` (\`icon_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_essentials\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`heading\` text,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_essentials_order_idx\` ON \`_pages_v_blocks_essentials\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_essentials_parent_id_idx\` ON \`_pages_v_blocks_essentials\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_essentials_path_idx\` ON \`_pages_v_blocks_essentials\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_services_services\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`text\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_services\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_services_services_order_idx\` ON \`_pages_v_blocks_services_services\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_services_services_parent_id_idx\` ON \`_pages_v_blocks_services_services\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_services\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`heading\` text,
  	\`intro\` text,
  	\`button_label\` text,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_services_order_idx\` ON \`_pages_v_blocks_services\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_services_parent_id_idx\` ON \`_pages_v_blocks_services\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_services_path_idx\` ON \`_pages_v_blocks_services\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_leadership_members\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`role\` text,
  	\`photo_id\` integer,
  	\`_uuid\` text,
  	FOREIGN KEY (\`photo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_leadership\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_leadership_members_order_idx\` ON \`_pages_v_blocks_leadership_members\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_leadership_members_parent_id_idx\` ON \`_pages_v_blocks_leadership_members\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_leadership_members_photo_idx\` ON \`_pages_v_blocks_leadership_members\` (\`photo_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_leadership\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`eyebrow\` text,
  	\`heading\` text,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_leadership_order_idx\` ON \`_pages_v_blocks_leadership\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_leadership_parent_id_idx\` ON \`_pages_v_blocks_leadership\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_leadership_path_idx\` ON \`_pages_v_blocks_leadership\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_contact\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`eyebrow\` text,
  	\`heading\` text,
  	\`submit_label\` text DEFAULT 'Send Message',
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_contact_order_idx\` ON \`_pages_v_blocks_contact\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_contact_parent_id_idx\` ON \`_pages_v_blocks_contact\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_contact_path_idx\` ON \`_pages_v_blocks_contact\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_version_faqs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`question\` text,
  	\`answer\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_version_faqs_order_idx\` ON \`_pages_v_version_faqs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_faqs_parent_id_idx\` ON \`_pages_v_version_faqs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_version_key_facts\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`value\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_version_key_facts_order_idx\` ON \`_pages_v_version_key_facts\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_key_facts_parent_id_idx\` ON \`_pages_v_version_key_facts\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_version_how_to_order\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`step\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_version_how_to_order_order_idx\` ON \`_pages_v_version_how_to_order\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_how_to_order_parent_id_idx\` ON \`_pages_v_version_how_to_order\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_slug\` text,
  	\`version_body\` text,
  	\`version_summary\` text,
  	\`version_seo_meta_title\` text,
  	\`version_seo_meta_description\` text,
  	\`version_seo_share_image_id\` integer,
  	\`version_seo_canonical_url\` text,
  	\`version_seo_include_in_sitemap\` integer DEFAULT true,
  	\`version_seo_hide_from_search\` integer DEFAULT false,
  	\`version_plain_text\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_seo_share_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_parent_idx\` ON \`_pages_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_slug_idx\` ON \`_pages_v\` (\`version_slug\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_seo_version_seo_share_image_idx\` ON \`_pages_v\` (\`version_seo_share_image_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_updated_at_idx\` ON \`_pages_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_created_at_idx\` ON \`_pages_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version__status_idx\` ON \`_pages_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_created_at_idx\` ON \`_pages_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_updated_at_idx\` ON \`_pages_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_latest_idx\` ON \`_pages_v\` (\`latest\`);`)
  await db.run(sql`CREATE TABLE \`product_categories_faqs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`question\` text,
  	\`answer\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`product_categories\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`product_categories_faqs_order_idx\` ON \`product_categories_faqs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`product_categories_faqs_parent_id_idx\` ON \`product_categories_faqs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`product_categories_key_facts\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`value\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`product_categories\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`product_categories_key_facts_order_idx\` ON \`product_categories_key_facts\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`product_categories_key_facts_parent_id_idx\` ON \`product_categories_key_facts\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`product_categories_how_to_order\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`step\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`product_categories\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`product_categories_how_to_order_order_idx\` ON \`product_categories_how_to_order\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`product_categories_how_to_order_parent_id_idx\` ON \`product_categories_how_to_order\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`product_categories\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`code\` text,
  	\`slug\` text,
  	\`order\` numeric DEFAULT 0,
  	\`description\` text,
  	\`hero_image_id\` integer,
  	\`hero_video_url\` text,
  	\`rating\` numeric DEFAULT 5,
  	\`summary\` text,
  	\`seo_meta_title\` text,
  	\`seo_meta_description\` text,
  	\`seo_share_image_id\` integer,
  	\`seo_canonical_url\` text,
  	\`seo_include_in_sitemap\` integer DEFAULT true,
  	\`seo_hide_from_search\` integer DEFAULT false,
  	\`plain_text\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`hero_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`seo_share_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`product_categories_code_idx\` ON \`product_categories\` (\`code\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`product_categories_slug_idx\` ON \`product_categories\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`product_categories_hero_image_idx\` ON \`product_categories\` (\`hero_image_id\`);`)
  await db.run(sql`CREATE INDEX \`product_categories_seo_seo_share_image_idx\` ON \`product_categories\` (\`seo_share_image_id\`);`)
  await db.run(sql`CREATE INDEX \`product_categories_updated_at_idx\` ON \`product_categories\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`product_categories_created_at_idx\` ON \`product_categories\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`product_categories__status_idx\` ON \`product_categories\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`_product_categories_v_version_faqs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`question\` text,
  	\`answer\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_product_categories_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_product_categories_v_version_faqs_order_idx\` ON \`_product_categories_v_version_faqs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_product_categories_v_version_faqs_parent_id_idx\` ON \`_product_categories_v_version_faqs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_product_categories_v_version_key_facts\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`value\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_product_categories_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_product_categories_v_version_key_facts_order_idx\` ON \`_product_categories_v_version_key_facts\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_product_categories_v_version_key_facts_parent_id_idx\` ON \`_product_categories_v_version_key_facts\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_product_categories_v_version_how_to_order\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`step\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_product_categories_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_product_categories_v_version_how_to_order_order_idx\` ON \`_product_categories_v_version_how_to_order\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_product_categories_v_version_how_to_order_parent_id_idx\` ON \`_product_categories_v_version_how_to_order\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_product_categories_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_code\` text,
  	\`version_slug\` text,
  	\`version_order\` numeric DEFAULT 0,
  	\`version_description\` text,
  	\`version_hero_image_id\` integer,
  	\`version_hero_video_url\` text,
  	\`version_rating\` numeric DEFAULT 5,
  	\`version_summary\` text,
  	\`version_seo_meta_title\` text,
  	\`version_seo_meta_description\` text,
  	\`version_seo_share_image_id\` integer,
  	\`version_seo_canonical_url\` text,
  	\`version_seo_include_in_sitemap\` integer DEFAULT true,
  	\`version_seo_hide_from_search\` integer DEFAULT false,
  	\`version_plain_text\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`product_categories\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_hero_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_seo_share_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_product_categories_v_parent_idx\` ON \`_product_categories_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_product_categories_v_version_version_code_idx\` ON \`_product_categories_v\` (\`version_code\`);`)
  await db.run(sql`CREATE INDEX \`_product_categories_v_version_version_slug_idx\` ON \`_product_categories_v\` (\`version_slug\`);`)
  await db.run(sql`CREATE INDEX \`_product_categories_v_version_version_hero_image_idx\` ON \`_product_categories_v\` (\`version_hero_image_id\`);`)
  await db.run(sql`CREATE INDEX \`_product_categories_v_version_seo_version_seo_share_imag_idx\` ON \`_product_categories_v\` (\`version_seo_share_image_id\`);`)
  await db.run(sql`CREATE INDEX \`_product_categories_v_version_version_updated_at_idx\` ON \`_product_categories_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_product_categories_v_version_version_created_at_idx\` ON \`_product_categories_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_product_categories_v_version_version__status_idx\` ON \`_product_categories_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_product_categories_v_created_at_idx\` ON \`_product_categories_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_product_categories_v_updated_at_idx\` ON \`_product_categories_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_product_categories_v_latest_idx\` ON \`_product_categories_v\` (\`latest\`);`)
  await db.run(sql`CREATE TABLE \`products_videos\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`file_id\` integer,
  	\`link\` text,
  	FOREIGN KEY (\`file_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`products_videos_order_idx\` ON \`products_videos\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`products_videos_parent_id_idx\` ON \`products_videos\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`products_videos_file_idx\` ON \`products_videos\` (\`file_id\`);`)
  await db.run(sql`CREATE TABLE \`products_faqs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`question\` text,
  	\`answer\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`products_faqs_order_idx\` ON \`products_faqs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`products_faqs_parent_id_idx\` ON \`products_faqs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`products_key_facts\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`value\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`products_key_facts_order_idx\` ON \`products_key_facts\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`products_key_facts_parent_id_idx\` ON \`products_key_facts\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`products_how_to_order\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`step\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`products_how_to_order_order_idx\` ON \`products_how_to_order\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`products_how_to_order_parent_id_idx\` ON \`products_how_to_order\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`products\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`code\` text,
  	\`slug\` text,
  	\`category_id\` integer,
  	\`custom_printing\` integer,
  	\`short_description\` text,
  	\`description\` text,
  	\`specs_material\` text,
  	\`specs_capacity\` text,
  	\`specs_dimensions\` text,
  	\`specs_thickness\` text,
  	\`specs_colours\` text,
  	\`specs_lid_options\` text,
  	\`specs_pieces_per_carton\` numeric,
  	\`moq_display\` text,
  	\`datasheet_id\` integer,
  	\`summary\` text,
  	\`seo_meta_title\` text,
  	\`seo_meta_description\` text,
  	\`seo_share_image_id\` integer,
  	\`seo_canonical_url\` text,
  	\`seo_include_in_sitemap\` integer DEFAULT true,
  	\`seo_hide_from_search\` integer DEFAULT false,
  	\`plain_text\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`category_id\`) REFERENCES \`product_categories\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`datasheet_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`seo_share_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`products_code_idx\` ON \`products\` (\`code\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`products_slug_idx\` ON \`products\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`products_category_idx\` ON \`products\` (\`category_id\`);`)
  await db.run(sql`CREATE INDEX \`products_datasheet_idx\` ON \`products\` (\`datasheet_id\`);`)
  await db.run(sql`CREATE INDEX \`products_seo_seo_share_image_idx\` ON \`products\` (\`seo_share_image_id\`);`)
  await db.run(sql`CREATE INDEX \`products_updated_at_idx\` ON \`products\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`products_created_at_idx\` ON \`products\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`products__status_idx\` ON \`products\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`products_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`media_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`products_rels_order_idx\` ON \`products_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`products_rels_parent_idx\` ON \`products_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`products_rels_path_idx\` ON \`products_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`products_rels_media_id_idx\` ON \`products_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE TABLE \`_products_v_version_videos\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`file_id\` integer,
  	\`link\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`file_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_products_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_products_v_version_videos_order_idx\` ON \`_products_v_version_videos\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_products_v_version_videos_parent_id_idx\` ON \`_products_v_version_videos\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_products_v_version_videos_file_idx\` ON \`_products_v_version_videos\` (\`file_id\`);`)
  await db.run(sql`CREATE TABLE \`_products_v_version_faqs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`question\` text,
  	\`answer\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_products_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_products_v_version_faqs_order_idx\` ON \`_products_v_version_faqs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_products_v_version_faqs_parent_id_idx\` ON \`_products_v_version_faqs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_products_v_version_key_facts\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`value\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_products_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_products_v_version_key_facts_order_idx\` ON \`_products_v_version_key_facts\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_products_v_version_key_facts_parent_id_idx\` ON \`_products_v_version_key_facts\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_products_v_version_how_to_order\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`step\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_products_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_products_v_version_how_to_order_order_idx\` ON \`_products_v_version_how_to_order\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_products_v_version_how_to_order_parent_id_idx\` ON \`_products_v_version_how_to_order\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_products_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_code\` text,
  	\`version_slug\` text,
  	\`version_category_id\` integer,
  	\`version_custom_printing\` integer,
  	\`version_short_description\` text,
  	\`version_description\` text,
  	\`version_specs_material\` text,
  	\`version_specs_capacity\` text,
  	\`version_specs_dimensions\` text,
  	\`version_specs_thickness\` text,
  	\`version_specs_colours\` text,
  	\`version_specs_lid_options\` text,
  	\`version_specs_pieces_per_carton\` numeric,
  	\`version_moq_display\` text,
  	\`version_datasheet_id\` integer,
  	\`version_summary\` text,
  	\`version_seo_meta_title\` text,
  	\`version_seo_meta_description\` text,
  	\`version_seo_share_image_id\` integer,
  	\`version_seo_canonical_url\` text,
  	\`version_seo_include_in_sitemap\` integer DEFAULT true,
  	\`version_seo_hide_from_search\` integer DEFAULT false,
  	\`version_plain_text\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_category_id\`) REFERENCES \`product_categories\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_datasheet_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_seo_share_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_products_v_parent_idx\` ON \`_products_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_products_v_version_version_code_idx\` ON \`_products_v\` (\`version_code\`);`)
  await db.run(sql`CREATE INDEX \`_products_v_version_version_slug_idx\` ON \`_products_v\` (\`version_slug\`);`)
  await db.run(sql`CREATE INDEX \`_products_v_version_version_category_idx\` ON \`_products_v\` (\`version_category_id\`);`)
  await db.run(sql`CREATE INDEX \`_products_v_version_version_datasheet_idx\` ON \`_products_v\` (\`version_datasheet_id\`);`)
  await db.run(sql`CREATE INDEX \`_products_v_version_seo_version_seo_share_image_idx\` ON \`_products_v\` (\`version_seo_share_image_id\`);`)
  await db.run(sql`CREATE INDEX \`_products_v_version_version_updated_at_idx\` ON \`_products_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_products_v_version_version_created_at_idx\` ON \`_products_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_products_v_version_version__status_idx\` ON \`_products_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_products_v_created_at_idx\` ON \`_products_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_products_v_updated_at_idx\` ON \`_products_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_products_v_latest_idx\` ON \`_products_v\` (\`latest\`);`)
  await db.run(sql`CREATE TABLE \`_products_v_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`media_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`_products_v\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_products_v_rels_order_idx\` ON \`_products_v_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`_products_v_rels_parent_idx\` ON \`_products_v_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_products_v_rels_path_idx\` ON \`_products_v_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`_products_v_rels_media_id_idx\` ON \`_products_v_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE TABLE \`tour_hotspots\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`text\` text,
  	\`order\` numeric DEFAULT 0,
  	\`product_id\` integer,
  	\`page_id\` integer,
  	\`plain_text\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`page_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`tour_hotspots_product_idx\` ON \`tour_hotspots\` (\`product_id\`);`)
  await db.run(sql`CREATE INDEX \`tour_hotspots_page_idx\` ON \`tour_hotspots\` (\`page_id\`);`)
  await db.run(sql`CREATE INDEX \`tour_hotspots_updated_at_idx\` ON \`tour_hotspots\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`tour_hotspots_created_at_idx\` ON \`tour_hotspots\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`tour_hotspots__status_idx\` ON \`tour_hotspots\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`_tour_hotspots_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_text\` text,
  	\`version_order\` numeric DEFAULT 0,
  	\`version_product_id\` integer,
  	\`version_page_id\` integer,
  	\`version_plain_text\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`tour_hotspots\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_product_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_page_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_tour_hotspots_v_parent_idx\` ON \`_tour_hotspots_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_tour_hotspots_v_version_version_product_idx\` ON \`_tour_hotspots_v\` (\`version_product_id\`);`)
  await db.run(sql`CREATE INDEX \`_tour_hotspots_v_version_version_page_idx\` ON \`_tour_hotspots_v\` (\`version_page_id\`);`)
  await db.run(sql`CREATE INDEX \`_tour_hotspots_v_version_version_updated_at_idx\` ON \`_tour_hotspots_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_tour_hotspots_v_version_version_created_at_idx\` ON \`_tour_hotspots_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_tour_hotspots_v_version_version__status_idx\` ON \`_tour_hotspots_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_tour_hotspots_v_created_at_idx\` ON \`_tour_hotspots_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_tour_hotspots_v_updated_at_idx\` ON \`_tour_hotspots_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_tour_hotspots_v_latest_idx\` ON \`_tour_hotspots_v\` (\`latest\`);`)
  await db.run(sql`CREATE TABLE \`faqs\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`answer\` text,
  	\`order\` numeric DEFAULT 0,
  	\`plain_text\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft'
  );
  `)
  await db.run(sql`CREATE INDEX \`faqs_updated_at_idx\` ON \`faqs\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`faqs_created_at_idx\` ON \`faqs\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`faqs__status_idx\` ON \`faqs\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`_faqs_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_answer\` text,
  	\`version_order\` numeric DEFAULT 0,
  	\`version_plain_text\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`faqs\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_faqs_v_parent_idx\` ON \`_faqs_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_faqs_v_version_version_updated_at_idx\` ON \`_faqs_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_faqs_v_version_version_created_at_idx\` ON \`_faqs_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_faqs_v_version_version__status_idx\` ON \`_faqs_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_faqs_v_created_at_idx\` ON \`_faqs_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_faqs_v_updated_at_idx\` ON \`_faqs_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_faqs_v_latest_idx\` ON \`_faqs_v\` (\`latest\`);`)
  await db.run(sql`CREATE TABLE \`certificates\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`description\` text,
  	\`file_id\` integer,
  	\`order\` numeric DEFAULT 0,
  	\`plain_text\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`file_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`certificates_file_idx\` ON \`certificates\` (\`file_id\`);`)
  await db.run(sql`CREATE INDEX \`certificates_updated_at_idx\` ON \`certificates\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`certificates_created_at_idx\` ON \`certificates\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`certificates__status_idx\` ON \`certificates\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`_certificates_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_description\` text,
  	\`version_file_id\` integer,
  	\`version_order\` numeric DEFAULT 0,
  	\`version_plain_text\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`certificates\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_file_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_certificates_v_parent_idx\` ON \`_certificates_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_certificates_v_version_version_file_idx\` ON \`_certificates_v\` (\`version_file_id\`);`)
  await db.run(sql`CREATE INDEX \`_certificates_v_version_version_updated_at_idx\` ON \`_certificates_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_certificates_v_version_version_created_at_idx\` ON \`_certificates_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_certificates_v_version_version__status_idx\` ON \`_certificates_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_certificates_v_created_at_idx\` ON \`_certificates_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_certificates_v_updated_at_idx\` ON \`_certificates_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_certificates_v_latest_idx\` ON \`_certificates_v\` (\`latest\`);`)
  await db.run(sql`CREATE TABLE \`client_logos\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`logo_id\` integer,
  	\`link\` text,
  	\`order\` numeric DEFAULT 0,
  	\`plain_text\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`client_logos_logo_idx\` ON \`client_logos\` (\`logo_id\`);`)
  await db.run(sql`CREATE INDEX \`client_logos_updated_at_idx\` ON \`client_logos\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`client_logos_created_at_idx\` ON \`client_logos\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`client_logos__status_idx\` ON \`client_logos\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`_client_logos_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_logo_id\` integer,
  	\`version_link\` text,
  	\`version_order\` numeric DEFAULT 0,
  	\`version_plain_text\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`client_logos\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_client_logos_v_parent_idx\` ON \`_client_logos_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_client_logos_v_version_version_logo_idx\` ON \`_client_logos_v\` (\`version_logo_id\`);`)
  await db.run(sql`CREATE INDEX \`_client_logos_v_version_version_updated_at_idx\` ON \`_client_logos_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_client_logos_v_version_version_created_at_idx\` ON \`_client_logos_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_client_logos_v_version_version__status_idx\` ON \`_client_logos_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_client_logos_v_created_at_idx\` ON \`_client_logos_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_client_logos_v_updated_at_idx\` ON \`_client_logos_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_client_logos_v_latest_idx\` ON \`_client_logos_v\` (\`latest\`);`)
  await db.run(sql`CREATE TABLE \`testimonials\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`company\` text,
  	\`quote\` text,
  	\`order\` numeric DEFAULT 0,
  	\`plain_text\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft'
  );
  `)
  await db.run(sql`CREATE INDEX \`testimonials_updated_at_idx\` ON \`testimonials\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`testimonials_created_at_idx\` ON \`testimonials\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`testimonials__status_idx\` ON \`testimonials\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`_testimonials_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_company\` text,
  	\`version_quote\` text,
  	\`version_order\` numeric DEFAULT 0,
  	\`version_plain_text\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`testimonials\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_testimonials_v_parent_idx\` ON \`_testimonials_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_testimonials_v_version_version_updated_at_idx\` ON \`_testimonials_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_testimonials_v_version_version_created_at_idx\` ON \`_testimonials_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_testimonials_v_version_version__status_idx\` ON \`_testimonials_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_testimonials_v_created_at_idx\` ON \`_testimonials_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_testimonials_v_updated_at_idx\` ON \`_testimonials_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_testimonials_v_latest_idx\` ON \`_testimonials_v\` (\`latest\`);`)
  await db.run(sql`CREATE TABLE \`media\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`alt\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`url\` text,
  	\`thumbnail_u_r_l\` text,
  	\`filename\` text,
  	\`mime_type\` text,
  	\`filesize\` numeric,
  	\`width\` numeric,
  	\`height\` numeric,
  	\`focal_x\` numeric,
  	\`focal_y\` numeric,
  	\`sizes_card_url\` text,
  	\`sizes_card_width\` numeric,
  	\`sizes_card_height\` numeric,
  	\`sizes_card_mime_type\` text,
  	\`sizes_card_filesize\` numeric,
  	\`sizes_card_filename\` text,
  	\`sizes_hero_url\` text,
  	\`sizes_hero_width\` numeric,
  	\`sizes_hero_height\` numeric,
  	\`sizes_hero_mime_type\` text,
  	\`sizes_hero_filesize\` numeric,
  	\`sizes_hero_filename\` text
  );
  `)
  await db.run(sql`CREATE INDEX \`media_updated_at_idx\` ON \`media\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`media_created_at_idx\` ON \`media\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`media_filename_idx\` ON \`media\` (\`filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_card_sizes_card_filename_idx\` ON \`media\` (\`sizes_card_filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_hero_sizes_hero_filename_idx\` ON \`media\` (\`sizes_hero_filename\`);`)
  await db.run(sql`CREATE TABLE \`enquiries\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`email\` text NOT NULL,
  	\`subject\` text NOT NULL,
  	\`message\` text NOT NULL,
  	\`is_read\` integer DEFAULT false,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`enquiries_updated_at_idx\` ON \`enquiries\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`enquiries_created_at_idx\` ON \`enquiries\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`users_sessions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`created_at\` text,
  	\`expires_at\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`users_sessions_order_idx\` ON \`users_sessions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`users_sessions_parent_id_idx\` ON \`users_sessions\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`users\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`role\` text DEFAULT 'editor' NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`enable_a_p_i_key\` integer,
  	\`api_key\` text,
  	\`api_key_index\` text,
  	\`email\` text NOT NULL,
  	\`reset_password_token\` text,
  	\`reset_password_expiration\` text,
  	\`salt\` text,
  	\`hash\` text,
  	\`reset_password_requested_at\` text,
  	\`login_attempts\` numeric DEFAULT 0,
  	\`lock_until\` text
  );
  `)
  await db.run(sql`CREATE INDEX \`users_updated_at_idx\` ON \`users\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`users_created_at_idx\` ON \`users\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`users_email_idx\` ON \`users\` (\`email\`);`)
  await db.run(sql`CREATE TABLE \`payload_kv\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text NOT NULL,
  	\`data\` text NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`payload_kv_key_idx\` ON \`payload_kv\` (\`key\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`global_slug\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_global_slug_idx\` ON \`payload_locked_documents\` (\`global_slug\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_updated_at_idx\` ON \`payload_locked_documents\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_created_at_idx\` ON \`payload_locked_documents\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`pages_id\` integer,
  	\`product_categories_id\` integer,
  	\`products_id\` integer,
  	\`tour_hotspots_id\` integer,
  	\`faqs_id\` integer,
  	\`certificates_id\` integer,
  	\`client_logos_id\` integer,
  	\`testimonials_id\` integer,
  	\`media_id\` integer,
  	\`enquiries_id\` integer,
  	\`users_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`pages_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`product_categories_id\`) REFERENCES \`product_categories\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`products_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`tour_hotspots_id\`) REFERENCES \`tour_hotspots\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`faqs_id\`) REFERENCES \`faqs\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`certificates_id\`) REFERENCES \`certificates\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`client_logos_id\`) REFERENCES \`client_logos\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`testimonials_id\`) REFERENCES \`testimonials\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`enquiries_id\`) REFERENCES \`enquiries\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_pages_id_idx\` ON \`payload_locked_documents_rels\` (\`pages_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_product_categories_id_idx\` ON \`payload_locked_documents_rels\` (\`product_categories_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_products_id_idx\` ON \`payload_locked_documents_rels\` (\`products_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_tour_hotspots_id_idx\` ON \`payload_locked_documents_rels\` (\`tour_hotspots_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_faqs_id_idx\` ON \`payload_locked_documents_rels\` (\`faqs_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_certificates_id_idx\` ON \`payload_locked_documents_rels\` (\`certificates_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_client_logos_id_idx\` ON \`payload_locked_documents_rels\` (\`client_logos_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_testimonials_id_idx\` ON \`payload_locked_documents_rels\` (\`testimonials_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_enquiries_id_idx\` ON \`payload_locked_documents_rels\` (\`enquiries_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text,
  	\`value\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_key_idx\` ON \`payload_preferences\` (\`key\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_updated_at_idx\` ON \`payload_preferences\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_created_at_idx\` ON \`payload_preferences\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_preferences\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_order_idx\` ON \`payload_preferences_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_parent_idx\` ON \`payload_preferences_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_path_idx\` ON \`payload_preferences_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_users_id_idx\` ON \`payload_preferences_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_migrations\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`batch\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_migrations_updated_at_idx\` ON \`payload_migrations\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_migrations_created_at_idx\` ON \`payload_migrations\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`site_settings_social_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`platform\` text NOT NULL,
  	\`url\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_settings\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_settings_social_links_order_idx\` ON \`site_settings_social_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_settings_social_links_parent_id_idx\` ON \`site_settings_social_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`site_settings_company_facts\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text NOT NULL,
  	\`value\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_settings\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_settings_company_facts_order_idx\` ON \`site_settings_company_facts\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_settings_company_facts_parent_id_idx\` ON \`site_settings_company_facts\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`site_settings\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`brand_name\` text NOT NULL,
  	\`logo_id\` integer,
  	\`page_title\` text,
  	\`meta_description\` text,
  	\`share_image_id\` integer,
  	\`head_office_address\` text,
  	\`head_office_phone\` text,
  	\`head_office_email\` text,
  	\`division_name\` text,
  	\`division_address\` text,
  	\`division_phone\` text,
  	\`division_email\` text,
  	\`announcement_enabled\` integer,
  	\`announcement_text\` text,
  	\`announcement_link\` text,
  	\`updated_at\` text,
  	\`created_at\` text,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`share_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`site_settings_logo_idx\` ON \`site_settings\` (\`logo_id\`);`)
  await db.run(sql`CREATE INDEX \`site_settings_share_image_idx\` ON \`site_settings\` (\`share_image_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`pages_blocks_hero_slides\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_hero\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_product_categories\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_about_paragraphs\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_about_pillars\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_about\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_sustainability_features\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_sustainability\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_essentials_categories_items\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_essentials_categories\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_essentials\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_services_services\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_services\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_leadership_members\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_leadership\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_contact\`;`)
  await db.run(sql`DROP TABLE \`pages_faqs\`;`)
  await db.run(sql`DROP TABLE \`pages_key_facts\`;`)
  await db.run(sql`DROP TABLE \`pages_how_to_order\`;`)
  await db.run(sql`DROP TABLE \`pages\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_hero_slides\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_hero\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_product_categories\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_about_paragraphs\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_about_pillars\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_about\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_sustainability_features\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_sustainability\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_essentials_categories_items\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_essentials_categories\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_essentials\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_services_services\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_services\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_leadership_members\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_leadership\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_contact\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_version_faqs\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_version_key_facts\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_version_how_to_order\`;`)
  await db.run(sql`DROP TABLE \`_pages_v\`;`)
  await db.run(sql`DROP TABLE \`product_categories_faqs\`;`)
  await db.run(sql`DROP TABLE \`product_categories_key_facts\`;`)
  await db.run(sql`DROP TABLE \`product_categories_how_to_order\`;`)
  await db.run(sql`DROP TABLE \`product_categories\`;`)
  await db.run(sql`DROP TABLE \`_product_categories_v_version_faqs\`;`)
  await db.run(sql`DROP TABLE \`_product_categories_v_version_key_facts\`;`)
  await db.run(sql`DROP TABLE \`_product_categories_v_version_how_to_order\`;`)
  await db.run(sql`DROP TABLE \`_product_categories_v\`;`)
  await db.run(sql`DROP TABLE \`products_videos\`;`)
  await db.run(sql`DROP TABLE \`products_faqs\`;`)
  await db.run(sql`DROP TABLE \`products_key_facts\`;`)
  await db.run(sql`DROP TABLE \`products_how_to_order\`;`)
  await db.run(sql`DROP TABLE \`products\`;`)
  await db.run(sql`DROP TABLE \`products_rels\`;`)
  await db.run(sql`DROP TABLE \`_products_v_version_videos\`;`)
  await db.run(sql`DROP TABLE \`_products_v_version_faqs\`;`)
  await db.run(sql`DROP TABLE \`_products_v_version_key_facts\`;`)
  await db.run(sql`DROP TABLE \`_products_v_version_how_to_order\`;`)
  await db.run(sql`DROP TABLE \`_products_v\`;`)
  await db.run(sql`DROP TABLE \`_products_v_rels\`;`)
  await db.run(sql`DROP TABLE \`tour_hotspots\`;`)
  await db.run(sql`DROP TABLE \`_tour_hotspots_v\`;`)
  await db.run(sql`DROP TABLE \`faqs\`;`)
  await db.run(sql`DROP TABLE \`_faqs_v\`;`)
  await db.run(sql`DROP TABLE \`certificates\`;`)
  await db.run(sql`DROP TABLE \`_certificates_v\`;`)
  await db.run(sql`DROP TABLE \`client_logos\`;`)
  await db.run(sql`DROP TABLE \`_client_logos_v\`;`)
  await db.run(sql`DROP TABLE \`testimonials\`;`)
  await db.run(sql`DROP TABLE \`_testimonials_v\`;`)
  await db.run(sql`DROP TABLE \`media\`;`)
  await db.run(sql`DROP TABLE \`enquiries\`;`)
  await db.run(sql`DROP TABLE \`users_sessions\`;`)
  await db.run(sql`DROP TABLE \`users\`;`)
  await db.run(sql`DROP TABLE \`payload_kv\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_migrations\`;`)
  await db.run(sql`DROP TABLE \`site_settings_social_links\`;`)
  await db.run(sql`DROP TABLE \`site_settings_company_facts\`;`)
  await db.run(sql`DROP TABLE \`site_settings\`;`)
}
