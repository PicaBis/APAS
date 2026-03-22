# Testing APAS Simulator

## Overview
APAS is a physics projectile simulator with 2D/3D modes, advanced physics features, and multi-language support (Arabic, English, French).

## Getting Started

### Running Locally
```bash
npx vite --host 0.0.0.0 --port 5173
```
Note: Port may auto-increment if in use (e.g., 5174).

### Initial Navigation
1. App loads with a login page — click "Continue as Guest" to bypass auth
2. Landing page appears — click the green "Start Simulation" button
3. Splash/loading screen at 100% — click "Enter System"
4. Welcome dialog appears — dismiss it
5. Simulator is now ready with 2D canvas and sidebar panels

## Key Features & Navigation

### Sidebar Panels (Right Side)
- **Physical Parameters** — angle, velocity, mass settings
- **Display Options** — grid, dark mode, etc.
- **Advanced Physics** — contains sub-sections including Relativity
- **Comparison** — side-by-side scenarios
- **Export** — export data

### Relativity & Reference Frames
- Located inside **Advanced Physics** panel (not standalone)
- Expand Advanced Physics → expand "Relativity & Reference Frames" section
- Toggle "Enable Relativity" switch to activate
- Mode selector: Galilean (classical) vs Lorentz (special relativity)
- Observer buttons: S (Ground Observer) and S' (Moving Observer)
- Preset buttons: Train, Missile, Spaceship scenarios
- Lorentz mode shows metadata: gamma factor, time dilation, length contraction, beta

### 3D Mode
- Toggle via keyboard shortcut `3` (press while canvas is focused)
- Or click the cube icon in the toolbar
- Relativity features are 2D-only and should NOT appear in 3D mode

### Language Switching
- Access via Settings panel (gear icon in top toolbar)
- Default language may be Arabic (RTL layout)
- Supports: Arabic (ar), English (en), French (fr)

## Testing Considerations

### Arabic RTL Testing
- App defaults to Arabic in guest mode, which is convenient for RTL testing
- Buttons and text are mirrored — observer buttons and preset buttons appear in RTL order
- Verify text doesn't truncate or overlap, especially preset buttons with longer Arabic text

### Observer Switching
- Observer buttons may be difficult to click precisely in automated testing environments
- Workaround: Use browser console to programmatically click:
  ```js
  document.querySelectorAll('button').forEach((b,i) => {
    if(b.textContent.includes('متحرك')) { b.click(); }
  });
  ```
- When switching observers, verify: trajectory color changes, projectile dot repositions, button highlight changes (S=blue, S'=orange)

### Console Errors to Watch For
- `ReferenceError: TreePine is not defined` — icon import issue in RelativityPanel
- React Router warnings are pre-existing and can be ignored
- `401` for `manifest.json` is a Vercel auth issue, not a code bug

### Simulation Controls
- Green play button starts/resumes animation
- Timeline scrubber at bottom controls playback position
- Speed controls: 0.25x, 0.5x, 1x, 2x, 4x

## Devin Secrets Needed
None required — app works in guest mode for testing.
