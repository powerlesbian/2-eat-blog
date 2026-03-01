#!/usr/bin/env node
// Import new posts from a Medium publication or profile into 2-eat-blog.
// Usage: node scripts/import-from-medium.mjs
// Env:   ANTHROPIC_API_KEY  (for translations)
//        MEDIUM_FEED_URL    (optional override, defaults to const below)

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import RSSParser from 'rss-parser';
import TurndownService from 'turndown';

// ── Config ────────────────────────────────────────────────────────────────────

// Change this to your Medium publication feed once created, e.g.:
//   https://medium.com/feed/eat-for-life
// Or keep using a personal profile:
//   https://medium.com/feed/@ggchao
const MEDIUM_FEED_URL = process.env.MEDIUM_FEED_URL || 'https://medium.com/feed/2-eat';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOG_DIR   = path.join(__dirname, '../src/content/blog');
const HANT_DIR   = path.join(__dirname, '../src/content/blog-zh-hant');
const HANS_DIR   = path.join(__dirname, '../src/content/blog-zh-hans');
const AR_DIR     = path.join(__dirname, '../src/content/blog-ar');
const ASSETS_DIR = path.join(__dirname, '../src/assets');

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

async function downloadImage(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) return null;
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  return destPath;
}

// Extract the first <img> src from Medium HTML content
function extractHeroImageUrl(html) {
  const match = html.match(/<img[^>]+src="([^"]+)"/i);
  return match ? match[1] : null;
}

// Strip Medium's figure/caption tags and tracking artifacts before converting
function cleanMediumHtml(html) {
  return html
    .replace(/<figcaption[^>]*>[\s\S]*?<\/figcaption>/gi, '')
    .replace(/<figure[^>]*>/gi, '')
    .replace(/<\/figure>/gi, '')
    .replace(/<picture[^>]*>/gi, '')
    .replace(/<\/picture>/gi, '')
    .replace(/<source[^>]*>/gi, '');
}

// Strip Medium boilerplate from converted Markdown
function cleanMediumMarkdown(md) {
  return md
    // Tracking pixel
    .replace(/!\[\]\(https:\/\/medium\.com\/_\/stat[^\)]*\)/g, '')
    // "Originally published in..." footer (last paragraph)
    .replace(/\[.*?\]\(https:\/\/medium\.com\/2-eat\/.*?\) was originally published.*$/ms, '')
    .trim();
}

// Extract a real description from the first paragraph of plain text
function extractDescription(html) {
  const stripped = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return stripped.slice(0, 200).trim();
}

const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });

// ── Translation ───────────────────────────────────────────────────────────────

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function translate(text, targetLang, targetLabel) {
  console.log(`  Translating to ${targetLabel}...`);
  const msg = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `You are a translator for a food blog called "Eat for Life" about empowerment eating.

Translate the following Markdown blog post to ${targetLang}.

Rules:
- Translate the frontmatter fields: title, description
- Do NOT translate or change: pubDate, updatedDate, heroImage, author
- Translate all body content naturally and warmly — this is personal food writing, not formal text
- Keep all Markdown formatting (##, **, *, etc.) intact
- Return ONLY the translated Markdown, no explanation

${text}`,
    }],
  });
  let text = msg.content[0].text.trim();
  if (text.startsWith('```')) text = text.replace(/^```(?:markdown)?\n?/, '');
  if (text.endsWith('```')) text = text.replace(/\n?```$/, '');
  return text.trim();
}

// ── Main ──────────────────────────────────────────────────────────────────────

const parser = new RSSParser();
console.log(`Fetching ${MEDIUM_FEED_URL}...`);
const feed = await parser.parseURL(MEDIUM_FEED_URL);

let imported = 0;

for (const item of feed.items) {
  const slug = slugify(item.title);
  const destFile = path.join(BLOG_DIR, `${slug}.md`);

  if (fs.existsSync(destFile)) {
    console.log(`Skip (exists): ${slug}`);
    continue;
  }

  console.log(`\nImporting: ${item.title}`);

  // Dates
  const pubDate = new Date(item.pubDate || item.isoDate).toISOString().split('T')[0];

  // Author — fall back to FlyingGG if Medium returns the publication name
  const rawAuthor = item.creator || item['dc:creator'] || '';
  const author = (rawAuthor && rawAuthor !== 'Eat for Life') ? rawAuthor : 'FlyingGG';

  // Description — extract from content HTML, fall back to title
  const description = item.contentSnippet && item.contentSnippet !== item.title
    ? item.contentSnippet.replace(/\n/g, ' ').slice(0, 200).trim()
    : extractDescription(rawHtml);

  // Hero image
  const rawHtml = item['content:encoded'] || item.content || '';
  const heroUrl = extractHeroImageUrl(rawHtml);
  let heroFrontmatter = '';
  if (heroUrl) {
    const ext = heroUrl.split('.').pop().split('?')[0] || 'jpg';
    const heroFilename = `${slug}-hero.${ext}`;
    const heroPath = path.join(ASSETS_DIR, heroFilename);
    console.log(`  Downloading hero image...`);
    const downloaded = await downloadImage(heroUrl, heroPath);
    if (downloaded) {
      heroFrontmatter = `heroImage: '../../assets/${heroFilename}'`;
    }
  }

  // Convert HTML → Markdown
  const cleanHtml = cleanMediumHtml(rawHtml);
  const body = cleanMediumMarkdown(td.turndown(cleanHtml));

  // Build frontmatter
  const frontmatter = [
    '---',
    `title: '${item.title.replace(/'/g, "\\'")}'`,
    `description: '${description.replace(/'/g, "\\'")}'`,
    `pubDate: '${pubDate}'`,
    heroFrontmatter,
    `author: ${author}`,
    '---',
  ].filter(Boolean).join('\n');

  const markdown = `${frontmatter}\n\n${body}\n`;

  // Write EN post
  fs.mkdirSync(BLOG_DIR, { recursive: true });
  fs.writeFileSync(destFile, markdown);
  console.log(`  Written: src/content/blog/${slug}.md`);

  // Translate
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('  No ANTHROPIC_API_KEY — skipping translations.');
  } else {
    const hant = await translate(markdown, 'Traditional Chinese (Hong Kong style, 繁體中文)', 'Traditional Chinese');
    const hans = await translate(markdown, 'Simplified Chinese (Mainland China style, 简体中文)', 'Simplified Chinese');
    const ar   = await translate(markdown,
      'Modern Standard Arabic (فصحى) with full harakat (diacritics). Warm literary voice, not formal.',
      'Arabic');

    fs.mkdirSync(HANT_DIR, { recursive: true });
    fs.mkdirSync(HANS_DIR, { recursive: true });
    fs.mkdirSync(AR_DIR,   { recursive: true });

    fs.writeFileSync(path.join(HANT_DIR, `${slug}.md`), hant);
    fs.writeFileSync(path.join(HANS_DIR, `${slug}.md`), hans);
    fs.writeFileSync(path.join(AR_DIR,   `${slug}.md`), ar);

    console.log(`  Translations written.`);
  }

  imported++;
}

if (imported === 0) {
  console.log('\nNo new posts found.');
  process.exit(0);
}

console.log(`\n${imported} post(s) imported.`);
