# Design System Strategy: Kinetic Brutalism

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"Kinetic Brutalism."** 

Unlike generic fitness apps that rely on soft rounds and friendly gradients, this system embraces the raw, unyielding grit of the boxing gym. It is an editorial-heavy approach that prioritizes high-impact typography, razor-sharp edges, and a "black-out" aesthetic. We are moving away from the "app-like" feel and toward a "digital arena" experience. 

The design breaks the standard grid through intentional asymmetry—think oversized, "bleeding" display type that pushes against the margins, and overlapping imagery that creates a sense of forward motion. We don't just display data; we weaponize it to drive performance.

## 2. Colors
Our palette is rooted in a high-contrast industrial spectrum, utilizing a charcoal foundation to allow our primary "Boxing Glove Red" to scream for attention.

- **Primary (`#ff8f74`, `#dd3200`):** Used exclusively for high-velocity actions and vital progress metrics. It represents heat and effort.
- **Surface & Background (`#0e0e0e`):** The "Charcoal Black." This is the canvas. It is deep, immersive, and eliminates distractions.
- **On-Surface/Tertiary (`#ffffff`):** The "Crisp White." Used for high-readability text and sharp iconography.

### The "No-Line" Rule
To maintain a premium, editorial feel, **1px solid borders are strictly prohibited for sectioning.** Boundaries must be defined through background color shifts. For example, a `surface-container-low` (`#131313`) section should sit against a `surface` (`#0e0e0e`) background to create a sophisticated, borderless transition.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the surface-container tiers to create nested depth:
1.  **Base:** `surface` (#0e0e0e)
2.  **Sectioning:** `surface-container-low` (#131313)
3.  **Interactive Cards:** `surface-container-highest` (#262626)
This stacking creates a "nested" feel that guides the eye without the clutter of lines.

### Signature Textures & Gradients
Flat is the enemy of energy. Use subtle noise textures (mimicking concrete or heavy-duty gym mats) at low opacities (2-4%) over `surface` layers. For main CTAs or "In-Flow" states, use a linear gradient transitioning from `primary` (`#ff8f74`) to `primary_dim` (`#dd3200`) at a 135-degree angle to provide a sense of three-dimensional "soul."

## 3. Typography
The typography is the engine of the brand. We use a "Scale of Power" to convey intensity.

- **Display & Headlines (Space Grotesk):** These are our "Power Hooks." Use `display-lg` (3.5rem) and `headline-lg` (2rem) for motivational cues and session titles. The sharp, technical nature of Space Grotesk should feel like it was stenciled onto a gym wall.
- **Body & Labels (Inter):** Our "Footwork." Inter provides the functional, legible counterpoint to the aggressive headings. Use `body-lg` for coaching cues and `label-md` for technical stats.

The hierarchy is intentionally extreme. We want massive contrast between a `display-lg` headline and `body-sm` metadata to create an editorial, high-fashion sports aesthetic.

## 4. Elevation & Depth
In this system, elevation is not about light sources; it’s about **Tonal Layering**.

- **The Layering Principle:** Depth is achieved by stacking. Place a `surface-container-lowest` (#000000) card on a `surface-container-low` (#131313) section to create a "recessed" look, or vice versa for "lift."
- **Ambient Shadows:** Shadows should be rare. When a floating element (like a modal) is required, use an extra-diffused shadow: `blur: 40px`, `opacity: 8%`, using a tinted version of `on_surface`.
- **The "Ghost Border" Fallback:** If a container requires a boundary for accessibility on complex imagery, use the `outline-variant` token at **15% opacity**. This "Ghost Border" provides a hint of structure without breaking the Brutalist flow.
- **Glassmorphism:** For overlays during active workouts, use `surface_variant` (#262626) with a 60% opacity and a `20px` backdrop blur. This allows the high-energy imagery of the gym to bleed through while keeping data legible.

## 5. Components
All components follow a **0px border-radius** mandate. Sharp corners only.

- **Buttons:** 
    - **Primary:** Gradient-filled (`primary` to `primary_dim`), all-caps `label-md` text, 0px radius.
    - **Secondary:** `surface-container-highest` background with a `primary` ghost border (15% opacity).
- **Cards:** No dividers. Separate content using `title-md` for headers and `surface-container-low` for the card body. Use vertical whitespace (32px+) to separate distinct data groups.
- **Input Fields:** Use `surface-container-high` (#20201f) backgrounds. The "active" state is a 2px bottom-only border in `primary`.
- **Progress Indicators:** Linear only. Use `primary` for the fill and `surface-container-highest` for the track. No rounded caps; the bar should look like a solid block of energy.
- **Specialty Component: The "Punch Counter":** High-impact `display-lg` numbers in `primary` with a 10% opacity `primary` glow (using backdrop-filter) to simulate a digital scoreboard.

## 6. Do’s and Don’ts

### Do:
- Use **asymmetrical margins**. Let text bleed off the side of the screen or sit tight against the left edge.
- Use **high-grain gym textures** in the background of hero sections.
- Use **all-caps** for headlines to evoke the "stenciled" gym look.
- Use `primary_dim` for "destructive" or "high-stress" alerts—it doubles as our error signal.

### Don’t:
- **Never use border-radius.** Every corner must be a 90-degree angle.
- **Avoid divider lines.** If you need to separate two pieces of content, use a 40px gap or a background color shift.
- **Don’t use soft colors.** If it’s not Charcoal, White, or Orange/Red, it doesn’t belong in the ring.
- **Avoid standard drop shadows.** They feel "web-standard" and cheap. Lean on tonal shifts for depth.

---
*Note: This system is designed to be felt as much as it is seen. Every pixel should contribute to the user's adrenaline.*