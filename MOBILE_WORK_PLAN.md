# Mobile Layout Work Plan

The game UI was desktop-only: a horizontal flex with a canvas and a fixed 288px sidebar. On phones, tiles were too small to tap and the sidebar overflowed. This plan tracks the work to make the game playable on mobile.

## Design

Single breakpoint at `md:` (768px). Below that threshold the layout becomes a vertical stack:

```
Selecting phase                     Reveal phase
┌─────────────────────────┐         ┌─────────────────────────┐
│ PhaseBar (compact)      │         │ PhaseBar + Next Round   │
├─────────────────────────┤         ├─────────────────────────┤
│ Player strip (horiz)    │         │                         │
├─────────────────────────┤         │  GameCanvas (~55%)      │
│                         │         │                         │
│  GameCanvas (flex-1)    │         ├─────────────────────────┤
│                         │         │  RoundResult + Players  │
├─────────────────────────┤         │  (scrollable ~45%)      │
│ Word input + pills      │         └─────────────────────────┘
│ [___word___] [Send]     │
│ [Inspiration] opens     │
│   bottom sheet overlay  │
└─────────────────────────┘
```

Desktop layout is unchanged. Above `md:` everything renders exactly as before.

---

## What's done

All code is on the working tree (uncommitted). Run `git diff --stat` and `git ls-files --others --exclude-standard` to see.

### Modified files

| File | What changed |
|------|-------------|
| `apps/web/src/components/GameCanvas.tsx` | Mouse events replaced with pointer events (`onPointerMove`, `onPointerDown`, `onPointerUp`, `onPointerLeave`). `touch-action: none` on canvas. Canvas coordinate helper extracted. ResizeObserver added so the canvas re-renders on resize/orientation change. |
| `apps/web/src/components/PhaseBar.tsx` | `SelectingDescription` hidden on mobile (`hidden md:inline`). Container padding tightened on mobile (`p-2 md:p-3`, `gap-2 md:gap-3`). |
| `apps/web/src/components/WordSelector.tsx` | Accepts `mobile?: boolean` prop. Input/button sizes increase on mobile (`py-2.5 text-base` vs `py-1.5 text-sm`). `autoFocus` disabled on mobile (prevents keyboard from popping immediately). Inspiration panel: inline on desktop, fixed-position bottom sheet overlay on mobile with backdrop dismiss and Escape key dismiss. |
| `apps/web/src/index.css` | Ink theme border widths reduced on mobile (`--border-width: 6px` at `max-width: 767px`). |
| `apps/web/src/pages/game.tsx` | Layout restructured: sidebar hidden on mobile (`hidden md:flex`), `MobilePlayerStrip` shown between PhaseBar and canvas, `WordSelector` rendered at bottom of screen on mobile (outside PhaseBar), reveal-phase results shown below canvas in scrollable area, three-dot overflow menu for share link on mobile. Uses `useIsMobile` hook. |

### New files

| File | Purpose |
|------|---------|
| `apps/web/src/lib/useIsMobile.ts` | `matchMedia("(max-width: 767px)")` hook. Returns `boolean`. |
| `apps/web/src/components/MobilePlayerStrip.tsx` | Compact horizontal bar of player badges. Each badge: truncated name, colored status dot (gray/blue/green/red), word count. Scrolls horizontally if many players. |
| `apps/web/e2e/mobile-layout.spec.ts` | 15 Playwright tests at 390x844 viewport. Covers: sidebar hidden, canvas full-width, word input at bottom, tile tap, word submission, PhaseBar instructions hidden, Lock In visible, player strip shows self/others, inspiration bottom sheet open/close/backdrop-dismiss/select, overflow menu, reveal phase results. |

### Test status

All 79 Playwright tests pass (64 existing desktop + 15 new mobile). All unit tests pass across all packages.

---

## What's left

### Must do

1. **Visual QA in a browser.** Start the dev server (`cd apps/web && pnpm dev`) and the game server, open Chrome DevTools with a 390x844 viewport, and play through a full game cycle (join, select tile, pick words, lock in, see reveal, next round). Check:
   - Tiles are large enough to tap comfortably
   - Word input doesn't obscure the canvas excessively
   - Inspiration bottom sheet scrolls if the word list is long
   - Player strip doesn't clip with 4+ players
   - Ink theme borders look reasonable at 6px
   - Overflow menu positions correctly (should pop upward from bottom-right)
   - Reveal phase: results area is scrollable, canvas still visible above
   - No layout jumps when virtual keyboard appears (word input focus)

2. **Virtual keyboard handling.** When the word input is focused on iOS/Android, the virtual keyboard pushes the viewport. The layout uses `h-dvh` which helps, but test on a real device (or BrowserStack) to confirm the canvas shrinks gracefully and the word input stays visible above the keyboard. If it doesn't, consider using the `visualViewport` API to detect keyboard presence and adjust the layout.

3. ~~**Backdrop click on bottom sheet.**~~ **DONE.** Added `stopPropagation` on the sheet div so clicks inside it don't bubble through to the backdrop. Also added `role="dialog"`, `aria-modal="true"`, and `aria-label` to the sheet, plus `aria-hidden="true"` on the backdrop. New Playwright test (`backdrop tap`) passes.

4. **Test on actual mobile devices.** Playwright tests run in headless Chromium at a small viewport, but that doesn't catch touch-specific issues (300ms tap delay on older browsers, iOS Safari rubber-banding, etc.). Test on at least one iOS Safari and one Android Chrome device.

### Should do

5. **Animate the bottom sheet.** Currently the sheet mounts/unmounts instantly. For polish, keep the sheet in the DOM and animate it with `translate-y-full` -> `translate-y-0` on open (the CSS classes are already in the code from an earlier iteration, but the current implementation uses conditional rendering for Playwright compatibility). One approach: render it always, use `visibility: hidden` + `translate-y-full` when closed, `visibility: visible` + `translate-y-0` when open, with `transition: transform 300ms, visibility 0s 300ms` (delay visibility on close).

6. **Swipe-to-dismiss on bottom sheet.** Track `pointerdown`/`pointermove`/`pointerup` on the sheet. If the user swipes down past a threshold (e.g., 30% of sheet height), dismiss. This is a standard mobile pattern.

7. **Landscape orientation.** The current mobile layout is optimized for portrait. In landscape on a phone (e.g., 844x390), the canvas area becomes very short. Consider either: forcing portrait via the Screen Orientation API, or detecting landscape and switching to a side-by-side layout similar to desktop.

8. **Horizontal scroll indicators on player strip.** If there are 5+ players, the strip scrolls horizontally but there's no visual indicator that more content exists. Consider a subtle fade/gradient on the right edge, or a scroll snap behavior.

9. ~~**Accessibility.**~~ **Partially done.** `role="dialog"`, `aria-modal="true"`, `aria-label`, and `aria-hidden` on backdrop are in place. Focus trapping (preventing Tab from reaching elements behind the sheet) is not yet implemented.

### Nice to have

10. ~~**Pull-to-refresh prevention.**~~ **DONE.** Added `overscroll-behavior: none` on body at `max-width: 767px` in `index.css`.

11. **Haptic feedback.** On supported devices, a subtle vibration on tile tap would improve the feel. Use `navigator.vibrate(10)` in the tile click handler if available.

12. **Mobile-specific word input UX.** The current input uses `onKeyDown` for Enter and Space to submit. On mobile, Space might be used mid-word (e.g., "ice cream" — though the sanitizer strips spaces). Consider removing the Space submit trigger on mobile, or making it configurable.

---

## How to verify

```bash
# Run all tests (unit + e2e)
pnpm test

# Run only mobile e2e tests
cd apps/web && npx playwright test e2e/mobile-layout.spec.ts

# Run only desktop e2e tests (verify no regressions)
cd apps/web && npx playwright test e2e/game-flow.spec.ts

# Start dev server for manual testing
# Terminal 1:
cd apps/server && PORT=3002 pnpm start
# Terminal 2:
cd apps/web && VITE_API_PROXY_TARGET=http://localhost:3002 VITE_WS_PROXY_TARGET=ws://localhost:3002 pnpm dev
# Then open http://localhost:5173 in Chrome with DevTools mobile emulation (390x844)
```

## File map

```
apps/web/src/
  lib/
    useIsMobile.ts           ← NEW: media query hook
  components/
    MobilePlayerStrip.tsx    ← NEW: compact player badges
    GameCanvas.tsx           ← MODIFIED: pointer events, resize observer
    PhaseBar.tsx             ← MODIFIED: responsive instructions
    WordSelector.tsx         ← MODIFIED: mobile prop, bottom sheet
  pages/
    game.tsx                 ← MODIFIED: responsive layout, overflow menu
  index.css                  ← MODIFIED: ink theme mobile borders
apps/web/e2e/
  mobile-layout.spec.ts     ← NEW: 14 mobile viewport tests
```
