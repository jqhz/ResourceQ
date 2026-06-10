import { pgTable, pgEnum, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const categoryEnum = pgEnum('category', [
  'tutorials', 'tech', 'documents', 'downloads',
  'apps-tools', 'discords', 'youtube', 'fanart',
]);

export const submissionStatus = pgEnum('submission_status', [
  'pending', 'approved', 'rejected',
]);

export const playlists = pgTable('playlists', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: categoryEnum('category').notNull(),
  title: text('title').notNull(),
  image: text('image').notNull(),
  description: text('description'),
});

export const resources = pgTable('resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: categoryEnum('category').notNull(),
  playlistId: uuid('playlist_id').references(() => playlists.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  image: text('image'),
  date: text('date'),                          // keep as text to match CardItem.date?: string
  recommended: boolean('recommended').default(false),
  searchable: boolean('searchable').default(true),
  url: text('url').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Public-writable. Mirrors resources but carries submission metadata.
export const queue = pgTable('queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: categoryEnum('category').notNull(),
  playlistId: uuid('playlist_id'),
  title: text('title').notNull(),
  description: text('description'),
  image: text('image'),
  date: text('date'),
  url: text('url').notNull(),
  submittedBy: text('submitted_by'),
  status: submissionStatus('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});