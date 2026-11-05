import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import * as m from './.build/logic.mjs';

let passed = 0;
const check = (label, fn) => { fn(); passed += 1; console.log('ok -', label); };
const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const exists = (path) => existsSync(new URL(`../${path}`, import.meta.url));
const tsxFiles = (dir = 'src') =>
  readdirSync(new URL(`../${dir}`, import.meta.url)).flatMap((name) => {
    const path = `${dir}/${name}`;
    if (statSync(new URL(`../${path}`, import.meta.url)).isDirectory()) return tsxFiles(path);
    return path.endsWith('.tsx') ? [path] : [];
  });

// A phone: 393 × 852, top bar to 64px, bottom navigation from 760px.
const area = { width: 393, height: 852, top: 64, bottom: 760 };
const size = { width: 240, height: 100 };
const at = (top, left = 40, width = 60, height = 20) => ({ top, bottom: top + height, left, right: left + width });

// --- Placement ----------------------------------------------------------------
check('a bubble goes above its trigger when it fits under the top bar', () => {
  const spot = m.placeBubble(at(400), size, area);
  assert.equal(spot.side, 'above');
  assert.equal(spot.top, 400 - m.BUBBLE_GAP - 100);
});

check('near the top bar it goes below the trigger instead of under the bar', () => {
  const spot = m.placeBubble(at(120), size, area);
  assert.equal(spot.side, 'below');
  assert.equal(spot.top, 140 + m.BUBBLE_GAP);
  assert.ok(spot.top >= area.top);
});

check('the bubble keeps clear of the bottom navigation when it goes below', () => {
  // Room above is too small (under the bar) and room below too: the side with more room wins, on screen.
  const tall = { width: 240, height: 400 };
  const low = m.placeBubble(at(500), tall, area);
  assert.equal(low.side, 'above');
  assert.ok(low.top >= m.BUBBLE_MARGIN);
  const high = m.placeBubble(at(200), tall, area);
  assert.equal(high.side, 'below');
  assert.ok(high.top + tall.height <= area.height - m.BUBBLE_MARGIN, 'still on screen');
});

check('a visible trigger\'s bubble is never off screen, even when the trigger is partly under a bar', () => {
  for (const top of [0, 30, 70, 300, 700, 760, 830]) {
    for (const align of ['left', 'center', 'right']) {
      for (const left of [0, 150, 380]) {
        const spot = m.placeBubble(at(top, left, 40), size, area, align);
        assert.ok(spot.top >= m.BUBBLE_MARGIN && spot.top + size.height <= area.height - m.BUBBLE_MARGIN, `top ${top}`);
        assert.ok(spot.left >= m.BUBBLE_MARGIN && spot.left + size.width <= area.width - m.BUBBLE_MARGIN, `left ${left} ${align}`);
      }
    }
  }
});

check('a trigger scrolled off screen takes its bubble with it', () => {
  const spot = m.placeBubble(at(-60), size, area);
  assert.equal(spot.top, -40 + m.BUBBLE_GAP);
});

check('bubbles line up with the trigger\'s left edge, right edge or centre, inside the screen', () => {
  assert.equal(m.placeBubble(at(400, 40), size, area, 'left').left, 40);
  assert.equal(m.placeBubble(at(400, 300, 60), size, area, 'right').left, 360 - 240);
  assert.equal(m.placeBubble(at(400, 150, 60), size, area, 'center').left, 180 - 120);
  // A trigger near the right edge, aligned left, is pushed back inside.
  assert.equal(m.placeBubble(at(400, 330), size, area, 'left').left, 393 - m.BUBBLE_MARGIN - 240);
});

// --- Drawn above everything --------------------------------------------------
check('every bubble is drawn at the top level of the page, above every other layer', () => {
  const bubble = source('src/components/ui/FloatingBubble.tsx');
  assert.match(bubble, /createPortal\(/);
  assert.match(bubble, /document\.body/);
  const z = Number(bubble.match(/\bz-\[(\d+)\]/)?.[1]);
  for (const file of tsxFiles()) {
    if (file.endsWith('FloatingBubble.tsx')) continue;
    for (const [, value] of source(file).matchAll(/\bz-\[?(\d+)\]?/g)) assert.ok(Number(value) < z, `${file}: z-${value} is above tooltips`);
  }
});

check('no bubble is positioned inside its card any more', () => {
  for (const file of tsxFiles()) {
    if (file.endsWith('FloatingBubble.tsx')) continue;
    const text = source(file);
    assert.doesNotMatch(text, /px-tooltip/, `${file} draws its own bubble`);
    if (/role="tooltip"/.test(text)) assert.match(text, /<FloatingBubble/, `${file} draws its own bubble`);
  }
  assert.match(source('src/components/ui/Tooltip.tsx'), /<FloatingBubble/);
  assert.match(source('src/components/ui/IconButton.tsx'), /<FloatingBubble/);
  assert.match(source('src/components/dashboard/SkillChip.tsx'), /<Tooltip/);
  assert.equal(exists('src/hooks/useViewportClamp.ts'), false);
  assert.doesNotMatch(source('src/index.css'), /tooltip-host/);
});

check('bubbles keep clear of the top bar and the phone navigation', () => {
  assert.match(source('src/App.tsx'), /<header data-app-bar /);
  assert.match(source('src/components/auth/Navigation.tsx'), /<nav data-app-bar /);
  assert.match(source('src/components/ui/FloatingBubble.tsx'), /\[data-app-bar\]/);
});

check('a tap opens a tooltip in one go: only a mouse hovers, only the keyboard focuses', () => {
  for (const file of ['src/components/ui/Tooltip.tsx', 'src/components/ui/IconButton.tsx']) {
    const text = source(file);
    assert.doesNotMatch(text, /onMouseEnter|onMouseLeave/, file);
    assert.match(text, /pointerType === 'mouse'/, file);
    assert.match(text, /focusedByKeyboard\(event\.currentTarget\)/, file);
  }
  assert.match(source('src/components/ui/Tooltip.tsx'), /:focus-visible/);
});

check('a tap inside an open bubble doesn\'t close it', () => {
  assert.match(source('src/components/ui/Tooltip.tsx'), /!bubble\.current\?\.contains\(target\)/);
});

// --- Roadmap and release --------------------------------------------------------
check('the roadmap keeps future ideas, with a suggested next version', () => {
  const roadmap = source('ROADMAP.md');
  assert.match(roadmap, /^# ChoreQuest Roadmap/);
  assert.match(roadmap, /## ⭐ Suggested next/);
  assert.match(source('README.md'), /\[ROADMAP\.md\]\(ROADMAP\.md\)/);
});

check('What\'s New and the changelog have 1.7.2', () => {
  const { notes } = m.PATCH_NOTES.find((entry) => entry.version === '1.7.2');
  for (const section of Object.values(notes)) assert.equal(section.en.length, section.vi.length);
  assert.match(source('CHANGELOG.md'), /## \[1\.7\.2\] - \d{4}-\d{2}-\d{2}\r?\n\r?\nSpec: \[UPDATE_v1\.7\.2\.md\]/);
  assert.ok(exists('UPDATE_v1.7.2.md'));
});

console.log(`\n${passed} checks passed`);
