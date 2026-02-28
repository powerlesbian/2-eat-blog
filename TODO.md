# 2-eat Blog — TODO & Setup Notes

## ✅ Done
- Astro site deployed on Cloudflare Worker at https://2-eat.com
- 3 posts live in English, Traditional Chinese, Simplified Chinese, Arabic
- Hero images generated for all posts
- About page with 6 contributor profiles
- Home page with editorial hero + latest posts
- Medium publication created at https://medium.com/2-eat
- Medium import script + daily GitHub Action ready to go

---

## 🔑 ACTION REQUIRED — Add API Key to GitHub

The daily Medium → 2-eat auto-import pipeline needs the Anthropic API key
to run translations. Without it, posts will be imported in English only.

**Steps:**
1. Go to https://github.com/powerlesbian/2-eat-blog/settings/secrets/actions
2. Click **New repository secret**
3. Name: `ANTHROPIC_API_KEY`
4. Value: your Anthropic API key (find it at https://console.anthropic.com)
5. Click **Add secret**

That's it. The GitHub Action runs daily at 17:00 HKT automatically.
You can also trigger it manually:
→ https://github.com/powerlesbian/2-eat-blog/actions/workflows/import-medium.yml
→ Click **Run workflow**

---

## ✍️ Publishing Workflow (once API key is set)

1. Write your post on https://medium.com/2-eat
2. Publish it on Medium
3. Wait for 17:00 HKT — the Action runs automatically
4. Post appears on https://2-eat.com in EN, 繁, 简, عر

Or trigger manually any time via the GitHub Actions UI above.

---

## 👥 Contributors — When They're Ready

Each contributor needs to:
1. Join the Medium publication at https://medium.com/2-eat (invite them as Writer)
2. Add `author: Their Alias` to their post frontmatter, OR
   the import script will read their Medium display name automatically

Current contributor aliases:
- FlyingGG (admin)
- IndianaJen the Foodie
- Meatlover
- The Decanted Diva
- The Global Reservation
- Root & Reel

---

## 🖼️ About Page — Photos Still Needed

Each contributor card on /about shows a placeholder avatar.
When photos are ready:
1. Drop the image into `src/assets/` (square, min 200×200px)
2. In `src/pages/about.astro`, replace the `img src` for that contributor
3. Commit and push

---

## 🗺️ Roadmap Ideas (priority order)

1. Better blog theme / food-focused design
2. Cloudinary for image hosting
3. Social links in header/footer (Instagram, Facebook, Rednote, Twitter/X)
4. Instagram API integration (Meta developer app created, stopped at access token step)
5. Decap CMS for contributors who prefer not to use Medium
6. Spending chart / analytics page
7. Newsletter signup
