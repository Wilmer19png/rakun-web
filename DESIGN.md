---
name: RAKÜN Visual Design
description: Editorial-brutalist studio system where the page literally looks back; pink leads, one accent dialect per landing.
colors:
  pink: "#FF2C68"
  yellow: "#FFF02B"
  blue: "#2BCDFF"
  navy: "#1B1A35"
  navy-deep: "#14132B"
  white: "#FFFFFF"
  cream: "#F3F0EA"
  ink-soft: "#3C3A5C"
  mist: "#C3C0DD"
  line-dark: "rgba(255, 255, 255, .17)"
  line-light: "rgba(27, 26, 53, .22)"
  line-pink: "rgba(27, 26, 53, .3)"
typography:
  mega:
    fontFamily: "Knuckle Down, Rubik, Arial Rounded MT Bold, system-ui, sans-serif"
    fontSize: "clamp(3.1rem, 8.4vw, 9.8rem)"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: "-0.02em"
  display:
    fontFamily: "Knuckle Down, Rubik, Arial Rounded MT Bold, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 5.8vw, 6.4rem)"
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Knuckle Down, Rubik, Arial Rounded MT Bold, system-ui, sans-serif"
    fontSize: "clamp(2.2rem, 4.6vw, 4.9rem)"
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Knuckle Down, Rubik, Arial Rounded MT Bold, system-ui, sans-serif"
    fontSize: "clamp(1.6rem, 2.8vw, 3.3rem)"
    fontWeight: 900
    lineHeight: 0.92
  lead:
    fontFamily: "Futura, Futura PT, Jost, Century Gothic, sans-serif"
    fontSize: "clamp(1.12rem, 1.35vw, 1.38rem)"
    fontWeight: 300
    lineHeight: 1.45
  body:
    fontFamily: "Futura, Futura PT, Jost, Century Gothic, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 300
    lineHeight: 1.55
  label:
    fontFamily: "Futura, Futura PT, Jost, Century Gothic, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    letterSpacing: "0.2em"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.72rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.06em"
rounded:
  none: "0px"
  round: "50%"
spacing:
  gutter: "clamp(16px, 3vw, 44px)"
  rail: "64px"
  header: "68px"
  section: "clamp(72px, 10vw, 152px)"
  block: "clamp(96px, 12vw, 180px)"
  card: "clamp(18px, 2vw, 28px)"
  works-gap: "clamp(10px, 1.2vw, 16px)"
components:
  button-pink:
    backgroundColor: "{colors.pink}"
    textColor: "{colors.navy}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "44px"
  mega-button:
    backgroundColor: "{colors.pink}"
    textColor: "{colors.navy}"
    typography: "{typography.display}"
    rounded: "{rounded.none}"
    padding: ".32em .5em .3em .55em"
  link-underline:
    textColor: "{colors.white}"
    typography: "{typography.label}"
    padding: "0 0 4px"
  round-button:
    textColor: "{colors.navy}"
    rounded: "{rounded.round}"
    size: "52px"
  round-button-hover:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.cream}"
  profile-card:
    textColor: "{colors.navy}"
    rounded: "{rounded.none}"
    padding: "{spacing.card}"
  work-tile:
    backgroundColor: "{colors.pink}"
    textColor: "{colors.navy}"
    rounded: "{rounded.none}"
    padding: "{spacing.card}"
  pick-yellow:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.navy}"
    typography: "{typography.headline}"
    rounded: "{rounded.none}"
  pick-blue:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.navy}"
    typography: "{typography.headline}"
    rounded: "{rounded.none}"
  pick-mix:
    backgroundColor: "{colors.navy-deep}"
    textColor: "{colors.yellow}"
    typography: "{typography.headline}"
    rounded: "{rounded.none}"
  header:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.white}"
    height: "{spacing.header}"
    padding: "0 clamp(16px, 3vw, 44px)"
---

# Design System: RAKÜN Visual Design

## Overview

**Creative North Star: "The Eye That Looks Back"**

RAKÜN sells attention, so the system is built to stare. A living eye (navy lid, blue sclera, yellow, pink and white iris rings, navy pupil, a straight diagonal lower cut) opens the site, then keeps watching from the header, hero collage, manifesto and CTA. Around it sits an editorial-brutalist print sheet: navy night fields alternate with cream paper, every section hangs off a 1px hairline grid, a left margin rail carries three-digit indices (001 to 007), and mono coordinates, "+" registration crosses and a live Bogotá clock read like a proof sheet's trim marks.

Density is high on type and low on ornament. Headlines are uppercase Knuckle Down set tight and huge; everything else is Futura light, tracked uppercase for labels and quiet for reading. Color is flat and saturated: pink is always the protagonist, yellow and blue are accents that each landing re-dialects. Photography is always grayscale, high contrast, and cut on a diagonal. There are no soft shadows, no radii on containers, no gradients beyond hard 50/50 color splits.

Motion is part of the material: GSAP expo-out reveals that rise from clipped lines, scroll-scrubbed manifesto words, spring physics on the eye, and pink spike bursts that pop on hover. Every piece of it collapses under `prefers-reduced-motion`.

**Key Characteristics:**
- A JavaScript-driven eye (`RakunEye`) as the reusable signature; it follows the cursor, fixates on CTAs, blinks every 3-6s, and explores when idle.
- Navy / cream / pink section fields separated by 1px hairlines, never by space alone.
- A 64px margin rail with sticky mono index and vertical label on every section.
- Uppercase Knuckle Down display at 0.86-0.92 line-height; Futura light body; mono metadata.
- Diagonal clip-path cuts on photos and the intro wipe; pink spike bursts as the punctuation mark.
- Zero radius on every rectangle; only the round carousel button and cursor are circles.
- One accent dialect per landing via `body[data-theme]`; pink never changes.

## Colors

Flat, saturated brand primaries on a navy-and-cream paper stock; pink owns every screen, yellow and blue rotate by audience.

### Primary
- **Protagonist Pink** (`pink`): The brand's voice. The pink line of every headline (`em`, `.line--pink`), the Ü in the logotype, spike bursts, the primary and mega buttons, the manifesto field, focus rings, the cursor dot, selection, scrollbar thumb, link underline on nav hover. Never used as small text on cream.

### Secondary
- **Signal Yellow** (`yellow`): The default `--accent`. Collage block, marquee accent word, the influencers card and picker row, the navy work tile's title, the skip link. Text on it is always navy.
- **Clinic Blue** (`blue`): The default `--accent-2`. Collage block, eye sclera, the médicos card and picker row, the first iris process ring. Text on it is always navy.

### Neutral
- **Night Navy** (`navy`): The dark surface (`--surface-dark`), the header, the eye lid and pupil, and the ink on every pink, yellow or blue field.
- **Deep Navy** (`navy-deep`): The darker night: header and CTA eye lid, the mixed "mentor" picker row, the scrollbar track, and the mentores theme's replacement for cream.
- **Proof Cream** (`cream`): The light editorial sheet (`--surface-light`) for Enfoque and Estudio sections.
- **White** (`white`): Text on navy, the badge frame and word, the cursor ring.
- **Soft Ink** (`ink-soft`): Secondary text on cream (asides, step copy, tags, footer meta); chosen for AA.
- **Mist** (`mist`): Secondary text on navy (hero meta, clock, collage tags, CTA hint); chosen for AA.
- **Hairlines** (`line-dark`, `line-light`, `line-pink`): The 1px grid. Each section sets `--line` to the one matching its field.

### Named Rules
**The Pink Leads Rule.** Pink appears on every screen and every landing, and no theme may override `--pink`. Accents follow; they never replace it.

**The Navy Ink Rule.** Text on pink, yellow or blue is navy, never white. White text lives only on navy.

**The No Small Pink Rule.** Pink as text on cream is reserved for display-size headline words; small pink text belongs on navy only.

## Typography

**Display Font:** Knuckle Down (with Rubik 800/900, Arial Rounded MT Bold, system-ui)
**Body Font:** Futura (with Futura PT, Jost, Century Gothic)
**Label/Mono Font:** JetBrains Mono (with ui-monospace, SFMono-Regular, Menlo)

**Character:** A heavy, rounded, punk display face shouting in uppercase against a thin geometric sans that whispers in tracked capitals; mono coordinates add the proof-sheet register.

### Hierarchy
- **Mega** (900, `--fs-mega`, 0.86): Hero headline only, three stacked clipped lines, last line pink. CTA title and footer giant wordmark use the same tight register at their own clamps.
- **Display** (900, `--fs-display`, 0.9): Section headlines (`.display`), uppercase, `text-wrap: balance`, one word wrapped in pink `em`.
- **Headline** (900, `--fs-display-md`, 0.9): Sub-block headlines inside a section (process, works, why, quotes); picker row names.
- **Title** (900, 1.6-3.3rem clamps, 0.9-0.95): Card, step and work-tile titles, uppercase.
- **Lead** (300, `--fs-lead`, 1.45): Hero lede and section asides, max about 26-30rem.
- **Body** (300, 17px, 1.55): Running text; quote text runs larger (1.55-2.9rem, 300, 1.16, max 26ch).
- **Label** (400-500, 0.8-0.95rem, 0.14-0.2em tracking, uppercase): Nav, links, buttons, service list.
- **Mono** (400, 0.72rem, 0.06em, uppercase): Rail indices, coordinates, figure captions, tags, clock, counters.

### Named Rules
**The Shout and Whisper Rule.** Display is always uppercase Knuckle Down at weight 900 with line-height under 1; reading text is always Futura at weight 300. Nothing sits between them.

**The Single Weight Rule.** Knuckle Down ships one weight; never request synthetic bold or italic from it.

## Layout

Every section is a two-column grid: a 64px rail (`--rail`) carrying a sticky mono index ("001") and a vertical, rotated uppercase label, then a body padded by `--sec-pad` vertically and `--gutter` horizontally. Sections abut with a 1px top hairline in their own `--line` color. The header is fixed at 68px (60px under 600px), hides on scroll down, and carries badge, live mini-eye, nav, a hairline-separated Bogotá clock and the pink CTA.

Inside the body, layouts use 12-column grids: the hero copy spans 7 columns over a collage on columns 7-12; Enfoque uses 8fr/4fr head over three bordered cards; the works grid is a 12-column mosaic (pink tile 7 columns by 2 rows, blue and yellow 5 columns stacked, navy full-width split 5fr/7fr); process and stats run in four hairline-divided columns. Blocks inside a section are spaced by `block` spacing and headed by a hairline-bottom row.

Responsive: at 1180px the clock drops. At 960px the rail collapses to 0 and becomes a horizontal strip above the body, nav becomes a full-height navy sheet with display-size links, and all grids fall to one column (process and stats to two). At 600px the header shrinks and the hero headline re-clamps to about 14vw.

## Elevation & Depth

The system is flat. Depth comes from layering flat color planes, not from light: offset color plates behind photographs, collage blocks overlapping portraits and the raccoon, and difference-blended text and cursor ring over imagery. There is no `box-shadow` used as a shadow anywhere; the one `inset 0 0 0 1px` on the mixed picker row is a border.

### Shadow Vocabulary
- **Offset Plate** (pseudo-element filled with an accent, `translate(10px, 10px)` on cards, `translate(-14px, 14px)` on quote portraits, `translate(-12%, 8%)` with a diagonal clip in the collage): a flat print-registration plate, not a shadow. On card hover the photo slides `-12px, -12px` away from its plate.

### Named Rules
**The Flat Plate Rule.** Depth is a second flat color sheet slightly out of register. Never blur, never fade, never use a soft drop shadow.

## Shapes

Hard rectangles everywhere: radius 0 on buttons, cards, tiles, picker rows, header and badge. The only circles are the round carousel button (52px), the cursor dot and ring, and the eye's iris rings. Photos are clipped on a single diagonal edge (for example a bottom edge dropping 12-16%), echoing the eye's straight lower cut; the intro exits with a diagonal polygon wipe in navy followed by pink. Spike bursts (`#rk-burst`) are the recurring silhouette, and "+" crosses mark grid corners. Arrows are inline SVG and rotate (45 or -45 degrees) rather than slide on hover.

## Components

### Buttons
- **Shape:** Square-cornered (0px), 44px tall.
- **Primary (pink):** Pink field, navy label, Futura 500 at 0.8rem, 0.16em tracking, uppercase, 20px side padding, trailing arrow.
- **Hover / Focus:** Arrow nudges `translate(3px, -3px)` over 0.35s `--ease-out`. Focus is a 3px outline offset 3px: pink by default, navy on pink fields, yellow on navy and header.
- **Mega button:** The CTA "Ver planes". Pink, navy text in Knuckle Down 900 at 2.2-5.4rem. On hover three spike bursts scale in from 0 with a back-overshoot curve, staggered 50ms (two pink, one yellow), and the arrow rotates 45 degrees; when the picker is open (`aria-expanded`) the bursts stay and the arrow rotates 135 degrees.
- **Round button:** 52px circle, 1px currentColor border; hover fills navy with cream icon.

### Links
- **Underline link:** Tracked uppercase label with a 1px currentColor underline drawn as a background; on hover the underline retracts to the right over 0.5s and the arrow nudges.
- **Nav link:** Label type at 0.8125rem, 0.2em tracking; a 2px underline scales in from the left on hover. Each route link's underline wears its audience swatch (`data-swatch`: yellow, blue, or a hard 50/50 yellow/blue split for mentores).

### Cards / Containers
- **Profile card:** One of three in a single bordered row, divided by hairlines. Holds a giant display number, a rotating arrow, a grayscale diagonal-cut photo on an accent offset plate, an uppercase title, a short description and a mono tag row.
- **Card color contract:** Each card sets `--c` (its audience color) and `--c-ink` (text on it). On hover or focus-within the card floods with `--c` from the bottom (`scaleY` 0.6s), text turns `--c-ink`, a pink spike burst spins in, the photo lifts off its plate, and the arrow turns -45 degrees.
- **Corner Style / Border:** 0px; 1px `--line` hairlines only. **Internal Padding:** `card` spacing.

### Works Grid
Flat color tiles (`--c` background, `--ink` text) in the 12-column mosaic. Photos are grayscale, multiplied into the tile color, parallax-scrolled inside an overflow mask; on hover a pink plate (navy, screen-blended, on the pink tile) rises 30% into the image and the corner arrow rotates 45 degrees.

### Profile Picker
Revealed by the mega button. Full-width rows: mono index, Knuckle Down name at 2-4.4rem, arrow. Yellow row (influencers), blue row (médicos), deep-navy row with yellow text and a 1px blue inset border (mentores). Rows stagger up on reveal; hover slides the row 14px right and rotates the arrow 45 degrees.

### Navigation
Fixed navy header with hairline bottom; slides away on scroll down. Under 960px, a two-bar menu toggle opens a full-height navy sheet with display-size links (4px underline) and a pink CTA.

### Badge (signature)
The logotype: a white-framed block with "RAKÜN" in Knuckle Down 900 (Ü in pink with a pink spike burst on its corner) over a pink bar reading "VISUAL" in white and "DESIGN" in navy. Scales entirely from one custom property (`--bs`: 40px default, 22px small, up to 92px in the intro).

### RakunEye (signature)
An inline SVG (viewBox 212 by 140) built and animated by JavaScript, never CSS keyframes. Openness, iris position and pupil dilation each run on a damped spring (open 260/18, iris 170/14, dilation 200/18) on one shared `requestAnimationFrame` ticker that pauses offscreen. API: `open`, `close`, `blink`, `look`, `lookAt`, `dilate`, `followCursor`, `watch`, `explore`. Behavior: follows the pointer; fixates and dilates (1.38) on any `data-eye-target` under the cursor; watches an assigned element (1.15); explores random points every 0.65-1.5s after 4s of pointer idleness; on touch it reads gyroscope or scroll direction; blinks every 3-6s. The lid color is set per placement with `--eye-lid`. Reduced motion removes blinking and exploring and stiffens the springs.

### Section Rail
The 64px margin column on every section: sticky mono index and rotated uppercase label, right hairline. Collapses to a horizontal strip on mobile; hidden in the hero on mobile.

### Motion grammar
- **Easing:** `--ease-out` cubic-bezier(.16, 1, .3, 1) for all CSS state transitions (0.35-0.6s); `--ease-io` cubic-bezier(.76, 0, .24, 1) for wipes; GSAP `expo.out` for reveals, `back.out` for bursts and rings, `expo.inOut` for the intro exit.
- **Reveals:** Headlines rise from clipped lines (`yPercent` 115, 1.15s, 90ms stagger); blocks rise 50-80px with fade at 1.1s, 100-120ms stagger.
- **Scrub:** Manifesto words light from 16% opacity as the pinned section scrolls; process rings draw blue, yellow, pink in sequence; work images parallax.
- **Intro:** Once per session, skippable, failsafe-hidden at 9s: the eye opens, glances, blinks, shrinks into the raccoon, the badge letters drop in (Ü with a bounce), then navy and pink panels wipe out diagonally.
- **Smoothing:** Lenis at lerp 0.1; custom cursor (pink dot plus difference-blended ring that scales 1.9 on links) on fine pointers only.

### Theming contract (landings)
`<body data-theme="home|influencers|medicos|mentores">` is the only switch. Themes may change `--accent`, `--accent-2` and, for depth, the light-surface tokens; they may not change `--pink`, type, spacing or components.
- **home:** accent yellow, accent-2 blue.
- **influencers:** accent and accent-2 both yellow.
- **medicos:** accent and accent-2 both blue.
- **mentores:** yellow plus blue, and the "light" sections become deep navy (`--surface-light: navy-deep`, `--on-light: white`, `--ink-soft: mist`, `--line-light: white at .17`) for authority.
Components that should re-dialect read `--accent`/`--accent-2` (collage blocks, marquee accent word); components that name an audience (profile cards, picker rows, nav swatches) keep their fixed audience color on every theme.

## Do's and Don'ts

### Do:
- **Do** keep pink (#FF2C68) visible on every screen and every landing; re-dialect only through `--accent` and `--accent-2`.
- **Do** put navy text on pink, yellow and blue fields, and white or mist on navy.
- **Do** separate sections and columns with 1px `--line` hairlines and hang each section off the 64px rail with a three-digit mono index.
- **Do** set headlines in uppercase Knuckle Down 900, line-height 0.86-0.92, with one pink word or line.
- **Do** render photography grayscale with raised contrast and a single diagonal clip edge, on a flat offset color plate.
- **Do** drive the eye through `RakunEye` springs and give every primary CTA `data-eye-target` so the eye looks at it.
- **Do** honor `prefers-reduced-motion`: skip the intro, drop reveals and scrub, stop blinking and exploring.

### Don't:
- **Don't** override `--pink` in any theme or replace it with an accent.
- **Don't** round containers or buttons; the only circles are the round button, the cursor and the iris.
- **Don't** use soft or blurred drop shadows; depth is an offset flat plate.
- **Don't** put small pink text on cream.
- **Don't** animate the eye with CSS keyframes, or let the pupil leave the eye.
- **Don't** request bold or italic synthesis from Knuckle Down, or set body copy in it.

## Revision — 2026-10-05

- **Dark surface is now `--ink-0: #010221`** (`--surface-dark`), the isotype's own background, so the raccoon's fur merges with the page. `--navy #1B1A35` remains the ink colour (text on cream, pupil, lid).
- **Official isotype** is vectorised from the client's artwork as `#rk-iso` (viewBox 0 0 1138 1138; layers fur/blue/white/pink). The art is cropped at its top and right edges, so it is always shown inside a **plate** (`.plate`: `--ink-0` square, 1px hairline frame, `+` crosses at two corners, italic mono caption). The live eye mounts on top at `x=625.4 y=458.7 w=267 h=176.4`.
- **Wave pattern** (`assets/pattern-wave.svg`, class `.wave`): a serpentine ribbon of concentric bands navy · blue · yellow · thin white · pink, period 310×260. Used on: hero collage block, card media, video placeholders, testimonial blocks, and `.wave-strip` dividers that drift with scroll.
- **No portrait photography.** Media slots are colour fields with the wave band; the work grid is now a **video reference grid** (`.reels__grid`, 9:16 tiles, 4 columns staggered, 2 on mobile; `<video data-src>` lazy-loads, plays muted in view).
- **New section: Estrategia digital** (`.strategy`, dark): five pillars as ruled rows (number · title · description · deliverable), pink fill on hover.
- **Intro motion:** a camera that starts inside the eye (eye ≈56% of viewport width on desktop, 72% on mobile) and pulls back to the plate; gaze spring is softer (intro k 38 / c 10; live eyes k 95 / c 15) and each look holds ~0.8 s.

## Revision — 2026-10-05 (b)

- **Isotype = official full-body SVG** (`assets/rakun-isotipo.svg`, viewBox 1080). Sprite `#rk-iso` holds its layers minus the eye; the live eye mounts at `x=515.5 y=499.2 w=211.2 h=133.7 preserveAspectRatio=none`. No plate/crop any more; the hero shows it at ~116% of the collage width.
- **Intro is driven by anime.js 3.2.2** (eye logic stays in `RakunEye`): pink slit draws in the dark → face fades up → eye opens with camera push → calm looks → camera pull-back (easeInOutQuart, 1.5 s) → crest bristles, ring pulses → badge (spring letters, bouncing Ü) → diagonal exit. GSAP remains only for scroll-driven motion.
- **Wave bands** `.wave-strip--xl` (140–270px) close the hero, Estrategia and Estudio sections and drift with scroll.
- **Strategy pillars**: icon tile (navy, 5px colour foot) + title + one-liner + "Ver más" pill; detail panel animates open (anime.js) with description, 4-item list and deliverable.
