#!/usr/bin/env node
// Usage: node scripts/translate.mjs <post-slug>
// Example: node scripts/translate.mjs welcome

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = path.join(__dirname, '../src/content/blog');
const HANT_DIR = path.join(__dirname, '../src/content/blog-zh-hant');
const HANS_DIR = path.join(__dirname, '../src/content/blog-zh-hans');
const AR_DIR = path.join(__dirname, '../src/content/blog-ar');

const slug = process.argv[2];
if (!slug) {
  console.error('Usage: node scripts/translate.mjs <post-slug>');
  process.exit(1);
}

const srcFile = path.join(BLOG_DIR, `${slug}.md`);
if (!fs.existsSync(srcFile)) {
  console.error(`Post not found: ${srcFile}`);
  process.exit(1);
}

const source = fs.readFileSync(srcFile, 'utf-8');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function translate(text, targetLang, targetLabel) {
  console.log(`Translating to ${targetLabel}...`);
  const msg = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a translator for a food blog called "Eat for Life" about empowerment eating.

Translate the following Markdown blog post to ${targetLang}.

Rules:
- Translate the frontmatter fields: title, description
- Do NOT translate or change: pubDate, updatedDate, heroImage
- Translate all body content naturally and warmly — this is personal food writing, not formal text
- Keep all Markdown formatting (##, **, *, etc.) intact
- Return ONLY the translated Markdown, no explanation

${text}`,
      },
    ],
  });
  // Strip any accidental markdown code fences the model might wrap output in
  return msg.content[0].text.replace(/^```(?:markdown)?\n/, '').replace(/\n```$/, '');
}

const hant = await translate(source, 'Traditional Chinese (Hong Kong style, 繁體中文)', 'Traditional Chinese');
const hans = await translate(source, 'Simplified Chinese (Mainland China style, 简体中文)', 'Simplified Chinese');
const ar = await translate(
  source,
  'Modern Standard Arabic (فصحى) with full harakat (diacritics). The blog is personal and warm — write in a gentle literary MSA voice, not formal or stiff.',
  'Arabic'
);

fs.mkdirSync(HANT_DIR, { recursive: true });
fs.mkdirSync(HANS_DIR, { recursive: true });
fs.mkdirSync(AR_DIR, { recursive: true });

fs.writeFileSync(path.join(HANT_DIR, `${slug}.md`), hant);
fs.writeFileSync(path.join(HANS_DIR, `${slug}.md`), hans);
fs.writeFileSync(path.join(AR_DIR, `${slug}.md`), ar);

console.log(`Done!`);
console.log(`  → src/content/blog-zh-hant/${slug}.md`);
console.log(`  → src/content/blog-zh-hans/${slug}.md`);
console.log(`  → src/content/blog-ar/${slug}.md`);
