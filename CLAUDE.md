# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

A Week 5 "A/B prompt structuring" exercise built around the same single-file coffee-delivery HTML game, modified two different ways:

- **`A/`** — the game modified through unstructured, free-form chat requests (no `CLAUDE.md`, no fixed prompt format).
- **`B/`** — the same starting game modified through structured prompts (five-part `[현재 상황]/[목표]/[구체적인 변경]/[유지할 것]/[완료 기준]` format, plus a `[문제 재현]/[실제 결과]/[기대 결과]/[수정 범위]` format for bug reports), governed by **`B/CLAUDE.md`**, a separate, narrower system prompt that applies only inside `B/`.

`B` was developed as a continuation of `A`'s result, not independently. The two folders are intentionally parallel: same file layout (`index.html`, `tests/game.test.cjs`, `README.md`, `WORKSHEET.md`, `.gitignore`), diverging only in game code and in `WORKSHEET.md` contents.

Supporting files at the repo root document and present the comparison, and are not game code:
- `WEEK5_LOG.md` — the filled-in worksheet (Korean) comparing A vs B, including a dedicated "A/B 프롬프트 비교" section with 8 side-by-side cases.
- `B_PROMPTS.md` — every user-authored prompt sent in the B session, extracted in order from the local Claude Code transcript.
- `presentation.html` + `PRESENTATION_SCRIPT.md` — a 7-slide, keyboard-navigable (arrow keys) presentation deck and matching Korean/Chinese speaker script, built only from facts already in `WEEK5_LOG.md`/`B_PROMPTS.md`.
- `screenshots/` — PNGs referenced by `WORKSHEET.md`/`WEEK5_LOG.md` and `presentation.html` via relative paths; filenames prefixed `A_`/`B_` are paired same-angle comparison shots.

This root folder itself is not a git repository. The published version of this work lives at `coffee-delivery-game-week3` on GitHub, where **B's `index.html`/`tests/` become the repo root**, `WORKSHEET.md` is replaced by the contents of `WEEK5_LOG.md`, and `A/index.html`, `B_PROMPTS.md`, `screenshots/` are added alongside — so B is the "canonical" version when working on the published repo structure, not A.

## Commands

Each of `A/` and `B/` is an independent, self-contained Node-testable project (no build step, no dependencies):

```sh
# from inside A/ or B/
node --test tests/game.test.cjs
```

The game itself needs no install, server, or API key — `index.html` runs by opening it directly in a browser. There is no lint/format tooling configured.

## Architecture (applies to `A/index.html` and `B/index.html` identically in structure)

Each `index.html` is a single file containing a small pseudo-3D town simulation entirely in inline `<style>`/`<script>` — no external libraries, no build. Key functions (same names in both A and B, logic differs):

- `SITES` — static data for the cafe and village buildings (positions, names).
- `newGame()` — builds the initial game state object (position, facing, carried items, level, economy/upgrades, effects, delivery route).
- `interact(s)` — handles picking up items at the cafe and delivering to neighbors.
- `step(s, dt, input)` — per-frame movement, collision, and timers.
- `draw(c, s, opts)` — renders the scene to canvas.
- `mount(canvas, onUpdate)` — wires up keyboard/button input and the render loop.

Because `B/CLAUDE.md` instructs "수정하지 않은 요청과 결과 코드 구조는 바꾸지 않는다" (only touch what's requested, keep `index.html` as one file, no new libraries/CDNs/build steps), B's modifications are additive within this same structure rather than architectural rewrites — new features (delivery order routing, cafe-expansion visuals, collision, building decorations, menu/cart items) are layered into `SITES`/`newGame`/`interact`/`step`/`draw` rather than introduced as new files or modules.

## Working in `A/` vs `B/`

- Treat `A/` as a frozen baseline — it represents the "what unstructured prompting produced" artifact and is referenced by `WEEK5_LOG.md`'s comparison section; don't update it to match B.
- `B/CLAUDE.md` is the authoritative instruction set when editing inside `B/` (single-file constraint, no unrequested changes, report `[변경한 점 / 직접 확인한 것 / 미확인]` after every change, prefer `node --test tests/game.test.cjs` as completion evidence). Read it before modifying `B/index.html`.
- Screenshots referenced from `WORKSHEET.md`/`WEEK5_LOG.md` use paths relative to the file's own location — keep `screenshots/` at the repo root (or inside `A/`/`B/` if a worksheet there references local screenshots) when adding new ones.
