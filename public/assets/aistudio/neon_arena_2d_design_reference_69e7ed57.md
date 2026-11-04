# NEON ARENA — 2D Website & Game Visual Reference

This is a text-based design reference for the NEON ARENA website. It is intended for text-only coding models such as OpenAI gpt-oss.

## Overall direction

Create a sophisticated, minimalist, 2D arcade website. The visual language should be calm, precise, and premium rather than flashy or heavily cyberpunk.

- Use a deep charcoal / near-black background.
- Use warm off-white text and muted grey secondary text.
- Use electric blue only for Player 1 and muted red/coral only for Player 2.
- Keep colour accents restrained: thin outlines, small status dots, paddle colours, and selected states.
- Avoid strong neon glows, 3D mockups, photorealistic objects, perspective-heavy scenes, and excessive gradients.
- Use flat 2D shapes, crisp lines, subtle shadows, clean spacing, and clear typography.
- Use a refined sans-serif font with generous spacing for headings.

Suggested palette:
- Main background: #0B0E0D
- Secondary surface: #121715
- Raised panel: #171D1A
- Main text: #EAE7DE
- Muted text: #A6AAA2
- Subtle border: #303833
- Player 1 blue: #168BFF
- Player 2 red: #E65361
- Ready / success: #65B987
- Warm button surface: #D9CCB2
- Warm button text: #171916

## 1. Landing page

Layout:
- Minimal top navigation with NEON ARENA wordmark on the left.
- Navigation links: Home, Play, How to Play, Settings.
- Fullscreen control on the right.
- Large left-aligned title: “NEON ARENA”.
- Subtitle: “THE ARCADE. REIMAGINED.”
- Supporting line: “Two players. One camera. Unlimited competition.”
- Two buttons: “PLAY NOW” (warm off-white filled button) and “HOW TO PLAY” (outlined button).
- On the right, use a restrained abstract 2D composition: overlapping circles, a soft arc, and subtle tonal gradients. Do not use a large photograph or 3D illustration.
- Add a small “SCROLL TO EXPLORE” cue.

## 2. Game selection screen

- Centered heading: “SELECT GAME MODE”.
- Short subheading: “Choose your arena”.
- Show exactly two large side-by-side cards.
- Card one: AIR HOCKEY.
- Card two: ARCADE TABLE TENNIS.
- Each card contains a simple flat 2D top-down illustration of its arena, a short description, and a Play button.
- Use a thin blue border/accent for Air Hockey and a thin red accent for Table Tennis.
- Keep the cards dark, clean, and mostly flat. Avoid glowing borders.

## 3. Calibration screen

- Centered heading: “CALIBRATION”.
- Instruction: “Place both hands in front of the camera”.
- Main area: a webcam preview in the centre.
- Left status card: “PLAYER 1 · BLUE”, detected state, confidence percentage, and a small blue hand-landmark illustration.
- Right status card: “PLAYER 2 · RED”, detected state, confidence percentage, and a small red hand-landmark illustration.
- Below the camera: a compact green confirmation pill reading “Both Players Ready!”.
- Large warm off-white “START MATCH” button.
- The webcam image and confidence values must be real runtime data, not hard-coded sample values. Use placeholders only in static mockups.

## 4. Active gameplay — 2D Air Hockey arena

This is the most important visual requirement: the arena must be a genuinely flat, top-down 2D game field.

- Use a wide horizontal rounded rectangle as the table.
- Draw a thin centre line and a simple centre circle.
- Draw a goal opening centred on each short end.
- Use a flat blue circular paddle for Player 1 and a flat red circular paddle for Player 2.
- Use a small off-white circular puck.
- Use restrained table markings and subtle surface contrast.
- No perspective, isometric view, 3D table model, realistic hardware, metallic bevels, or dramatic lighting.
- The table should occupy most of the gameplay viewport.

HUD:
- Player 1 score at top-left with a blue dot.
- Match timer and game mode centred at the top.
- Player 2 score at top-right with a red dot.
- Pause, settings, restart, and fullscreen controls along the bottom edge.

Live hand tracking panel:
- Small floating panel near the top-right, outside the main play area where possible.
- Show a live webcam thumbnail with blue and red landmark overlays.
- Show Player 1 and Player 2 detection states separately.
- Show hands detected count (0/2, 1/2, 2/2), camera status, and tracking FPS.
- Use actual MediaPipe results. Never fake detection status or confidence.

## 5. Arcade Table Tennis arena

- Also use a flat, top-down 2D layout.
- Draw a simple horizontal rectangular table.
- Use a thin centre divider.
- Use a blue paddle on one side and a red paddle on the other.
- Use a small off-white ball.
- Keep the same typography, HUD placement, and colour rules as Air Hockey.

## Interaction and motion

- Use subtle transitions and small hover states.
- Prefer quick fades, gentle slides, and restrained scale changes.
- Avoid large particle explosions, intense screen shake, constant pulsing, or excessive motion.
- Respect reduced-motion preferences.
- Make all buttons and navigation functional.

## Important implementation rules

1. Build the full website and playable games, not just a static mockup.
2. There must be exactly two game modes: Air Hockey and Arcade Table Tennis.
3. Use one webcam stream and one MediaPipe tracking pipeline for both gameplay and the preview.
4. Player 1 is always blue (#168BFF); Player 2 is always red (#E65361).
5. Both hands must be tracked simultaneously with stable player assignment.
6. Use real 2D Canvas rendering and delta-time-based physics.
7. The hand-tracking preview must show actual detection results.
8. Make the layout responsive, but prioritise desktop gameplay.
9. Keep the code modular and test the complete experience.
10. Do not replace working project functionality when modifying an existing repository.

## Visual summary

Think: a premium, editorial dark interface combined with a clean 2D arcade table. The website should feel sophisticated and understated. The game arena itself should look like a crisp 2D board game viewed directly from above, not a 3D arcade machine.
