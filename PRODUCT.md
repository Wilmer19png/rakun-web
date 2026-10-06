# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static site: semantic HTML + CSS custom properties + vanilla JavaScript (ES modules). GSAP + ScrollTrigger for scroll/timeline animation, Lenis for smooth scroll (both from CDN). No framework, no build step. Files: `index.html`, `styles.css`, `main.js`, `eye.js`. Deploy target not yet decided.

## Users

People who live from their image and need to be seen: influencers / content creators, medical doctors in private practice, and mentors / coaches / course creators. Mostly in Colombia (Bogotá) and Latin America, Spanish-speaking, often arriving on mobile from social media. Their job on the site: understand that RAKÜN is the studio for *their* profile, then go to the landing built for them and see plans.

## Product Purpose

RAKÜN Visual Design is a visual design studio (Bogotá) that builds identities, content and digital experiences. The site is a hub: a home that presents the studio and routes visitors into one landing per client type (`/influencers`, `/medicos`, `/mentores`), each with its own copy, services, examples and plans. Success = a visitor self-identifies and enters their landing / starts a project.

## Positioning

Not "make you look good" but "make it impossible not to look at you". The studio's mark is literally an eye; attention is the product. Specialized by client type rather than a generic agency menu.

## Capabilities and Constraints

- Home is built now; the three landings come later and must reuse the same token system via `data-theme="home|influencers|medicos|mentores"` on `<body>`, which changes only `--accent` and minor details.
- Pink `#FF2C68` is always the protagonist across every landing. Accents: influencers yellow `#FFF02B`, médicos blue `#2BCDFF`, mentores yellow + blue on more dark background.
- Eye animation must be JavaScript (`RakunEye` class: open, close, blink, lookAt, followCursor, explore), not CSS keyframes. Intro plays once per session, skippable, and is bypassed under `prefers-reduced-motion`.
- "Ver planes" leads to a profile selector (Influencer / Médico / Mentor) → landing.

## Brand Commitments

- Name: RAKÜN Visual Design (Ü in pink). Voice: direct, bold, visual, punk attitude but professional. Spanish.
- Palette tokens: pink `#FF2C68`, yellow `#FFF02B`, blue `#2BCDFF`, navy `#1B1A35`, white `#FFFFFF`, cream `#F3F0EA`.
- Type: Knuckle Down (display, local woff2 at `/fonts/`), Futura light uppercase tracked (labels/body), mono for metadata.
- Marks: punk raccoon isotype in profile (navy/white, pink spike crest, blue + white rings); the eye (almond/diagonal shape: navy lid → blue sclera → yellow ring → pink ring → thin white ring → navy pupil, diagonal straight lower cut with pink line); badge logo (white frame, pink bar "VISUAL" white / "DESIGN" navy); horizontal logo (isotype + RAKÜN / VISUAL).
- Art direction references explicitly chosen by the user: editorial-brutalist studio sites ("FORM/SHIFT", "BRUTAL").

## Evidence on Hand

- Brand assets: only raster references supplied in chat. Official SVGs and `KnuckleDown.woff2` pending; the user approved redrawing the eye, isotype and badge as inline SVG until the files arrive.
- Contact: email `rakundesigns@gmail.com`. WhatsApp number and social handles: not provided (placeholders).
- No real stats, projects, client names or testimonials yet. Any of these on the site are placeholders marked `TODO` in code and must not be presented as fact.
- No real photography yet; editorial placeholder imagery until supplied.

## Product Principles

1. Attention is the product: every surface should earn a look, not just look nice.
2. Route by identity: the visitor should find "their" landing within seconds.
3. Pink leads, accent follows: one brand, three dialects.
4. Punk but professional: attitude in form and voice, never at the cost of clarity or trust (especially for médicos).

## Accessibility & Inclusion

WCAG AA contrast (no small pink text on cream), alt text, visible focus, decorative elements `aria-hidden`, full `prefers-reduced-motion` support, mobile-first responsiveness.
