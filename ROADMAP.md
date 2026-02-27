# Eat for Life — Site Roadmap

## Done ✅
- Site scaffolded (Astro + Cloudflare Worker)
- Domain live (2-eat.com)
- GitHub repo connected, auto-deploy on push
- EN → Traditional + Simplified Chinese translation script
- First two posts live (welcome + stomach memory)
- Post template saved (template.md, gitignored)

---

## In Progress 🔄

### Meta / Instagram API Setup
- [x] Created Facebook Developer account
- [x] Created app on developers.facebook.com
- [x] Added Instagram Graph API product
- [ ] Connect Instagram Professional account to the app
- [ ] Generate long-lived access token
- [ ] Build `npm run from-instagram` — pulls post by URL, creates .md, auto-translates, pushes

---

## Up Next

### Design & Images
- [ ] Replace default Astro theme with a better food-focused blog template
- [ ] Set up proper image hosting (Cloudinary free tier — 25GB storage, no repo bloat)
- [ ] Improve hero image design — consistent style/aspect ratio across posts
- [ ] Document image workflow: resize → upload to Cloudinary → reference URL in post

### Social Links
- [ ] Add Instagram, Facebook, Rednote (小红书), Twitter/X links to header and footer
- [ ] Make social links configurable from consts.ts (one place to update)

### Content Priorities
- [ ] Write 10–15 more posts to build content base before pushing social traffic
- [ ] Update About page with your story and empowerment eating philosophy
- [ ] Establish a consistent post format/voice guide for contributors

---

## Medium Term

### Contributors
- [ ] Set up Decap CMS — web-based editor on top of GitHub for trusted contributors
- [ ] Add `author` field to post frontmatter
- [ ] Author profile pages
- [ ] Add Chinese → English reverse translation to the translate script
- [ ] Contributor guide document

### Instagram Integration (full automation)
- [ ] Auto-import new Instagram posts to blog via API
- [ ] Strip hashtags, reformat caption as blog post
- [ ] Auto-translate and push

---

## Later / Nice to Have

- [ ] Tag and category pages
- [ ] Related posts at bottom of each article
- [ ] Search
- [ ] Newsletter / RSS email digest
- [ ] Facebook and Rednote cross-posting when new post goes live
- [ ] Spending/traffic analytics (Cloudflare Web Analytics — free, privacy-friendly)

---

## Notes
- No monetisation planned for now — focus on content volume and quality
- Primary goal: drive traffic between 2-eat.com and social accounts (Instagram first)
- Bilingual (EN + 繁 + 简) is a core feature, not an afterthought
- Keep the publishing workflow as simple as possible — ideally one command per post
