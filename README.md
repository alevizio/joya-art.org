# joya-art.org

The website of Joya, as plain static files. It replaces the site the hosted page builder
(Squarespace) used to serve: the design, text, pictures, video and behaviour are kept as they
were, and the pages are published by GitHub Pages from the root of this repository.

There is no build step, no framework and no dependency: what is in the repository is what is
served. Edit the HTML, commit, done.

## File map

```
index.html                         home
home.html                          byte-identical copy of index.html (the old address /home keeps working)
ethos.html  music.html  contact.html
events.html                        the events grid
events/<slug>.html                 one page per event, e.g. events/burning-man-2022.html
404.html                           "page not found": shows the home page, as the original did (see below)
assets/css/site.css                the one stylesheet (fonts, tokens, header, sections, grids, blocks)
assets/js/site.js                  the one script (header, menu, highlights, galleries, video, marquee)
assets/fonts/                      Archivo Black and Albert Sans, with their OFL licences
assets/img/logo.png                header logo (89 x 70)
assets/img/og/<slug>.jpg           share pictures of the event pages (1500 wide)
assets/img/<page>/                 the pictures of each page, e.g. assets/img/burning-man-2022/07-1500w.webp
assets/video/joya-crystallized.mp4 the film on the Joya Crystallized page (1080 x 1920, H.264/AAC)
favicon.ico  robots.txt  sitemap.xml
.nojekyll                          tells GitHub Pages to serve the files as they are
```

Addresses have no extension: `/ethos` is served from `ethos.html`, `/events/mendoza-2021` from
`events/mendoza-2021.html`, and `/events` from `events.html` (GitHub Pages prefers the file over
the folder of the same name). Every link and picture path in the HTML is root-absolute
(`/events`, `/assets/img/...`).

## Editing a page

Open the `.html` file and edit the text directly. Rules that keep the site consistent:

- `home.html` must stay byte-identical to `index.html`, and `404.html` shows the same content.
  After editing the home page, copy `index.html` over `home.html` and check with
  `cmp index.html home.html` (prints nothing when equal); repeat the edit in `404.html` (its
  `<head>` is different on purpose, keep it).
- Text styles are classes, not inline styles: `h1` to `h4` for headings, `p` for body text,
  `p.t-large` / `p.t-small` for the larger and smaller body sizes, `.t-center` to centre.
  Sizes, colours and spacing are custom properties at the top of `assets/css/site.css`.
- The only inline `style` attributes are content data: where a block sits in its section's grid,
  picture focal points, aspect ratios, colours of highlights. Do not add others.
- Highlights (the yellow marker, the pink underline, the circles and the scribble) are
  `<span class="hl" data-shape="marker|underlineCurve|circle|scribble">`, with `--hl-color` and
  `--hl-width` (stroke width in em). The script draws the shape behind the words on load.
- When the visible content of a page changes, set that page's `<lastmod>` in `sitemap.xml`
  to the date of the edit (the dates there now are the original site's).

### Where blocks sit: the free-form grid

Most sections are a grid (`<div class="fe" style="--mr:22;--dr:25">`): 8 columns on phones,
24 columns from 768px wide, plus one outer column on each side. Each block carries its own place
as `row-start / column-start / row-end / column-end` lines: `--m` on phones, `--d` from 768px
(`--mz` / `--dz` for which block is on top, `--mj` / `--dj` for vertical placement). `--mr` and
`--dr` are the number of rows. Rows are at least `container width x 0.0215` tall on desktop and
24px on phones, and grow with their content. To move a block, change its line numbers.

The older event pages (2019 to 2022) use 12-column rows instead (`.cl__row` / `.cl__col` with
`--span`), as they did on the original.

## Adding a picture

Every picture is shipped in up to seven sizes (the ones the old image CDN served), named by
their real pixel width: `<name>-100w.webp`, `-300w`, `-500w`, `-750w`, `-1000w`, `-1500w`,
`-2500w`. A size is never larger than the original, so a 2048px wide photo ends at
`-2048w.webp`. Example, slide 27 of `/events/burning-man-2022`:

1. Export the photo as WebP at those widths into `assets/img/burning-man-2022/27-100w.webp` ...
2. In `events/burning-man-2022.html`, inside `<div class="masonry__wrap">`, add after the last item:

   ```html
   <figure class="masonry__item" style="--ar:W/H"><div class="masonry__frame"><img
     src="/assets/img/burning-man-2022/27-1000w.webp"
     srcset="/assets/img/burning-man-2022/27-100w.webp 100w, /assets/img/burning-man-2022/27-300w.webp 300w, /assets/img/burning-man-2022/27-500w.webp 500w, /assets/img/burning-man-2022/27-750w.webp 750w, /assets/img/burning-man-2022/27-1000w.webp 1000w, /assets/img/burning-man-2022/27-1500w.webp 1500w, /assets/img/burning-man-2022/27-2500w.webp 2500w"
     sizes="50vw" width="W" height="H" alt="" loading="lazy" decoding="async"></div></figure>
   ```

   with `W` x `H` the pixel size of the original. The script places it under the shortest column.

Pictures in the other blocks follow the same naming. Their `sizes` attributes are the ones the
original pages used (so the browser picks the same file) and should stay as they are.

## Adding an event

Copy one of `events/*.html` (Burning Man 2023 for the newer layout), change the title, the
`<meta>` tags and canonical address in `<head>`, the text and the pictures. Then add a card to
`events.html` (same markup as the others, picture in `assets/img/events/`), fix the
previous / next links at the bottom of the neighbouring event pages, and add the address to
`sitemap.xml`.

## Fonts

Headings use Archivo Black, the same font files the original served (SIL Open Font License).
Body text was proxima-nova, through the previous host's Adobe Fonts kit, licensed to that host
only. This site ships Albert Sans instead (SIL Open Font License, one variable file), chosen
because its words are the closest in width to proxima-nova's among 25 open candidates measured
on every word of the site, and tuned in its `@font-face` rules (`size-adjust`,
`ascent-override`, `descent-override`) so that words take the same space and baselines land
on the same pixel. Lines still break differently in some paragraphs at some window widths.

For exact proxima-nova: create an Adobe Fonts web project with Proxima Nova Regular (400),
Medium (500) and Bold (700) for the domain joya-art.org, and add the `<link>` Adobe Fonts shows
for that project to the `<head>` of every HTML file, before `site.css`. The font stack already
lists `"proxima-nova"` first, so nothing else changes: with the kit the pages match the original.

## 404 and trailing slashes

GitHub Pages serves `404.html` for any address that matches no file. The original answered
unknown addresses with the home page content (and status 404), so `404.html` is the home page,
marked `noindex`. The original also answered `/ethos/` (trailing slash) like `/ethos`; here a
three-line script at the top of `404.html` sends `/ethos/` to `/ethos` (and `/anything/` to
`/anything`, which then shows the 404 page if it does not exist).

## Changed from the original (30 October 2026)

Four things that looked unintended on the original were fixed after the move:

- `/contact`: the address `joyacamp85@gmail.com` is now a `mailto:` link (it was a relative link
  that opened the not-found page).
- `/events/joya-crystallized`: the large word under the gallery now reads "Crystallized" (it was
  "Crytallized").
- The six YouTube blocks on the 2019, 2020 and Global Eclipse pages now show each video's own
  YouTube still (`assets/img/<page>/poster-*.webp`, 16:9, cropped to the box). They used to show
  photos of a cabin in the mountains that came with the page builder's template.
- The footer says © 2026 (it said © 2024).

## Kept from the original, for the owner to decide

- `/events/burning-man-2023`: the title is "Burning man 2023" (lower-case "man").
- The previous host's `robots.txt` listed a few AI crawlers, but in the same group as every
  other crawler, so they were not blocked; `robots.txt` keeps that.

## Small differences from the original

Measured against the original in Chromium at 12 window widths from 320 to 2560px:

- Highlights: the original computed the highlight shapes before its heading font had loaded, so
  they were sized and placed for a fallback font and stayed slightly off the words. Here they are
  drawn around the words as they render.
- The marquee on `/contact` is moving text, so any two moments differ. The original set it as
  SVG text on a path; here it is plain text at the same size, baseline, spacing and speed.
- Masonry galleries: the original's image loader widened some pictures by one pixel to cover
  their box. The rule that reproduces it gives the same width to 85% of 2,112 pictures measured
  on the original (10 pages, 11 window widths); all but three of the others differ by one pixel
  of width (the boxes and positions are identical).
- The film on `/events/joya-crystallized` was streamed (360p or 1080p as the connection allowed);
  here it is one 1080 x 1920 MP4, loaded only when Play is pressed. Before playing it looks the
  same; once playing, the controls are the browser's own.
- The YouTube players embed `youtube.com` directly (the original went through a third-party
  embed service that wrapped the same player).
- Keyboard and screen-reader improvements: the menu button says whether the menu is open, the
  menu closes with Escape and returns focus, the social links and players have names, links that
  open a new window use `rel="noopener"`, and motion (highlights, fade-ins, marquee) stops when
  the system asks for reduced motion.

## Where the originals are

A full backup of the original site, taken on 2026-10-29 before the move, is kept outside this
repository in `~/Documents/joya-squarespace-backup-2026-10-29/`: the original uploads (the only
full-quality copies of the photos), the film, each page's HTML and data as the old host served
them, and the reference screenshots this rebuild was checked against. Keep that folder: the files
in `assets/img/` are the sized versions the old CDN served, byte for byte, not the originals.
