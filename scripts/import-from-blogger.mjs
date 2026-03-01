#!/usr/bin/env node
// Import food-tagged posts published in the last hour from Blogger.
// Usage: node scripts/import-from-blogger.mjs
// Env:   ANTHROPIC_API_KEY

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import RSSParser from 'rss-parser';
import TurndownService from 'turndown';

// ── Config ────────────────────────────────────────────────────────────────────

const BLOGGER_FEED_URL = 'https://www.drgichao.com/feeds/posts/default/-/food?alt=rss';
const LOOKBACK_HOURS   = 1;

// Map Blogger display names to 2-eat aliases
const AUTHOR_MAP = {
  'Gi for 🍊': 'FlyingGG',
  'Eat for Life': 'FlyingGG',
};

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

function extractHeroImageUrl(html) {
  // Blogger puts images inside <div class="separator"> — grab the full-size src
  const match = html.match(/<img[^>]+src="([^"]+blogger\.googleusercontent\.com[^"]+)"/i)
    || html.match(/<img[^>]+src="([^"]+)"/i);
  return match ? match[1] : null;
}

function cleanBloggerHtml(html) {
  return html
    // Blogger image wrappers
    .replace(/<div[^>]*class="separator"[^>]*>[\s\S]*?<\/div>/gi, '')
    // Leftover anchors wrapping images
    .replace(/<a[^>]*><img[^>]*><\/a>/gi, '')
    // Non-breaking spaces
    .replace(/&nbsp;/g, ' ');
}

function cleanMarkdown(md) {
  return md
    // First image (already hero)
    .replace(/^!\[.*?\]\(.*?\)\n*/m, '')
    .trim();
}

function extractDescription(html) {
  const stripped = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return stripped.slice(0, 200).trim();
}

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
  let result = msg.content[0].text.trim();
  if (result.startsWith('```')) result = result.replace(/^```(?:markdown)?\n?/, '');
  if (result.endsWith('```')) result = result.replace(/\n?```$/, '');
  return result.trim();
}

// ── Main ──────────────────────────────────────────────────────────────────────

const parser = new RSSParser();
const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });

console.log(`Fetching Blogger feed (food label, last ${LOOKBACK_HOURS}h)...`);
const feed = await parser.parseURL(BLOGGER_FEED_URL);

const cutoff = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);
const recentItems = feed.items.filter(item => new Date(item.pubDate || item.isoDate) > cutoff);

if (recentItems.length === 0) {
  console.log(`No food posts published in the last ${LOOKBACK_HOURS} hour(s). Nothing to import.`);
  process.exit(0);
}

console.log(`Found ${recentItems.length} recent post(s).`);
let imported = 0;

for (const item of recentItems) {
  const slug = slugify(item.title);
  const destFile = path.join(BLOG_DIR, `${slug}.md`);

  const enExists = fs.existsSync(destFile);
  const translationsExist =
    fs.existsSync(path.join(HANT_DIR, `${slug}.md`)) &&
    fs.existsSync(path.join(HANS_DIR, `${slug}.md`)) &&
    fs.existsSync(path.join(AR_DIR,   `${slug}.md`));

  if (enExists && translationsExist) {
    console.log(`Skip (exists): ${slug}`);
    continue;
  }

  console.log(`\nImporting: ${item.title}`);

  const pubDate  = new Date(item.pubDate || item.isoDate).toISOString().split('T')[0];
  const rawAuthor = item.creator || item['dc:creator'] || '';
  const author   = AUTHOR_MAP[rawAuthor] || rawAuthor || 'FlyingGG';
  const rawHtml  = item['content:encoded'] || item.content || '';
  const description = extractDescription(rawHtml);

  // Hero image
  let heroFrontmatter = '';
  const heroUrl = extractHeroImageUrl(rawHtml);
  if (heroUrl) {
    const ext = heroUrl.split('.').pop().split('?')[0].replace(/[^a-z]/gi, '') || 'jpg';
    const heroFilename = `${slug}-hero.${ext}`;
    const heroPath = path.join(ASSETS_DIR, heroFilename);
    console.log(`  Downloading hero image...`);
    const downloaded = await downloadImage(heroUrl, heroPath);
    if (downloaded) heroFrontmatter = `heroImage: '../../assets/${heroFilename}'`;
  }

  // Convert HTML → Markdown
  const cleanHtml = cleanBloggerHtml(rawHtml);
  const body = cleanMarkdown(td.turndown(cleanHtml));

  const frontmatter = [
    '---',
    `title: '${item.title.replace(/'/g, "\\'")}'`,
    `description: '${description.replace(/'/g, "\\'")}'`,
    `pubDate: '${pubDate}'`,
    heroFrontmatter,
    `author: ${author}`,
    '---',
  ].filter(Boolean).join('\n');

  const markdown = enExists
    ? fs.readFileSync(destFile, 'utf-8')
    : `${frontmatter}\n\n${body}\n`;

  if (!enExists) {
    fs.mkdirSync(BLOG_DIR, { recursive: true });
    fs.writeFileSync(destFile, markdown);
    console.log(`  Written: src/content/blog/${slug}.md`);
  } else {
    console.log(`  EN exists, adding missing translations only.`);
  }

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

    if (!fs.existsSync(path.join(HANT_DIR, `${slug}.md`)))
      fs.writeFileSync(path.join(HANT_DIR, `${slug}.md`), hant);
    if (!fs.existsSync(path.join(HANS_DIR, `${slug}.md`)))
      fs.writeFileSync(path.join(HANS_DIR, `${slug}.md`), hans);
    if (!fs.existsSync(path.join(AR_DIR, `${slug}.md`)))
      fs.writeFileSync(path.join(AR_DIR,   `${slug}.md`), ar);

    console.log(`  Translations written.`);
  }

  imported++;
}

if (imported === 0) {
  console.log('\nNo new posts to import.');
} else {
  console.log(`\n${imported} post(s) imported.`);
}
