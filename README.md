# NicheExplained

Daily explainer articles on niche topics. Static site: a ~150-line Node build script (`build.js`, using `marked` + `gray-matter`) turns Markdown in `content/` into plain HTML in `docs/`, which GitHub Pages serves directly.

## Setup
```bash
npm install
npm run build      # writes docs/
```
Local preview (the site lives under a sub-path, so mirror it):
```bash
mkdir -p /tmp/srv && rm -rf /tmp/srv/nicheexplained && cp -r docs /tmp/srv/nicheexplained
cd /tmp/srv && python3 -m http.server 8080   # open http://localhost:8080/nicheexplained/
```
(If `baseUrl` is a root domain, just `npm run serve`.)

## Add an article
Create `content/articles/YYYY-MM-DD-your-seo-slug.md`:
```markdown
---
title: "Clear, Searchable Title: What People Actually Google"
description: "150-160 character summary used for meta description, social cards and RSS."
date: 2026-10-14
tags: [topic, another]
# optional: slug, updated, author, image (/images/x.png in static/), draft: true
---
Article body in Markdown...
```
The URL is the filename minus the date: `/your-seo-slug/`. Run `npm run build`, commit `docs/` too, push. The homepage, sitemap.xml and feed.xml update automatically.

## Configuration — `site.config.json`
- `baseUrl` — **TODO**: `https://USERNAME.github.io/nicheexplained` (project site), `https://USERNAME.github.io` (user site repo `USERNAME.github.io`), or your custom domain. Used for canonical URLs, OG tags, sitemap, RSS and internal links. Rebuild after changing.
- `newsletter` — **TODO**: `provider` `buttondown` (set `buttondownUsername`) or `substack` (set `substackUrl`); `enabled: false` hides it.
- `sponsor` — fill `name`/`url`/`text` to show a sponsor; otherwise a "Sponsor this site" placeholder shows.
- `adsenseClientId` — e.g. `ca-pub-XXXX`; when set, the AdSense script is added to every page. Also add `ads.txt` to `static/`.
- `twitterHandle`, `author`, `description`, `defaultOgImage` (`static/og-default.png`, 1200×630).
- About/Privacy text: `content/pages/` (add your contact email — marked TODO).

## Deploy to GitHub Pages
1. Create a public repo (e.g. `nicheexplained`), set `baseUrl`, run `npm run build`.
2. `git init && git add . && git commit -m "Initial site" && git branch -M main && git remote add origin https://github.com/USERNAME/nicheexplained.git && git push -u origin main`
3. Repo → Settings → Pages → Source: *Deploy from a branch*, Branch `main`, folder `/docs`.
4. After it's live, submit `BASE_URL/sitemap.xml` in Google Search Console.
Custom domain: put a `CNAME` file in `static/`, set `baseUrl` to the domain, rebuild.

## Structure
```
site.config.json        site settings (base URL, newsletter, sponsor, AdSense)
build.js                the generator
content/articles/*.md   one file per article
content/pages/*.md      about, privacy (-> /about/, /privacy/)
static/                 css, favicon, OG image — copied as-is into docs/
docs/                   GENERATED output served by GitHub Pages (commit it)
```
SEO output per page: title, meta description, canonical, Open Graph + Twitter card, JSON-LD (Article on posts, WebSite on home), plus sitemap.xml, robots.txt, feed.xml (RSS), 404.html, .nojekyll.
