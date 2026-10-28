import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FOLK, HEROES, ITEM_ICONS, PORTRAITS, SCENES, SPOT_ICONS, VIEWS } from '../shared/src/pictures.js';
import { content } from '../content/index.js';
import folk from '../client/src/art/folk.json';
import painted from '../client/src/art/things.json';
import foes from '../client/src/art/foes.json';
import marks from '../client/src/art/marks.json';
import views from '../client/src/art/views.json';
import heroes from '../client/src/art/heroes.json';
import stations from '../client/src/art/stations.json';
import stationSlots from '../client/src/art/station-slots.json';
import grounds from '../client/src/art/grounds.json';

// Every mark of a thing is painted; a new mark needs its cell in an atlas (scripts/art.ts things).
describe('painted things', () => {
  const cells = painted as unknown as Record<string, [number, number]>;

  it('every mark has a cell, every cell is in an atlas that exists, no two share a cell', () => {
    expect(ITEM_ICONS.filter((k) => !cells[k])).toEqual([]);
    const taken = new Set<string>();
    for (const [k, [n, i]] of Object.entries(cells)) {
      expect(existsSync(new URL(`../client/src/art/things/t${n}.webp`, import.meta.url)), k).toBe(true);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(12);
      expect(taken.has(`${n}:${i}`), k).toBe(false);
      taken.add(`${n}:${i}`);
    }
  });
});

// Every plan of a place is painted; a new scene needs its painting (scripts/art.ts ground).
describe('painted grounds', () => {
  it('every scene has its painting, and nothing else is listed', () => {
    const list = grounds as string[];
    expect(SCENES.filter((s) => !list.includes(s))).toEqual([]);
    expect(list.filter((s) => !(SCENES as readonly string[]).includes(s))).toEqual([]);
    for (const s of list) {
      const i = (SCENES as readonly string[]).indexOf(s) + 1;
      expect(existsSync(new URL(`../client/src/art/grounds/g${i}.webp`, import.meta.url)), s).toBe(true);
    }
  });
});

// Every foe has a painted portrait (scripts/art.ts foes).
describe('painted foes', () => {
  it('every portrait has a cell in an atlas that exists', () => {
    const cells = foes as unknown as Record<string, [number, number]>;
    expect(PORTRAITS.filter((k) => !cells[k])).toEqual([]);
    for (const [k, [n, i]] of Object.entries(cells)) {
      expect(existsSync(new URL(`../client/src/art/foes/f${n}.webp`, import.meta.url)), k).toBe(true);
      expect(i).toBeLessThan(9);
    }
  });
});

// Every spot on a plan and every place on the map has a painted mark (scripts/art.ts marks).
describe('painted marks', () => {
  it('every spot icon and every scene has a cell in an atlas that exists', () => {
    const cells = marks as unknown as Record<string, [number, number]>;
    expect(SPOT_ICONS.filter((k) => !cells[k])).toEqual([]);
    expect(SCENES.filter((k) => !cells[`@${k}`])).toEqual([]);
    for (const [k, [n, i]] of Object.entries(cells)) {
      expect(existsSync(new URL(`../client/src/art/marks/m${n}.webp`, import.meta.url)), k).toBe(true);
      expect(i).toBeLessThan(12);
    }
  });
});

// Every place seen at eye level, and the suppers by the fire (scripts/art.ts view).
describe('painted views', () => {
  it('every view key has its picture', () => {
    const list = views as string[];
    expect(VIEWS.filter((k) => !list.includes(k))).toEqual([]);
    for (const k of list) {
      const i = (VIEWS as readonly string[]).indexOf(k) + 1;
      expect(i, k).toBeGreaterThan(0);
      expect(existsSync(new URL(`../client/src/art/views/w${i}.webp`, import.meta.url)), k).toBe(true);
    }
  });
});

// The players' heroes as they see them: the maker a man, the hunter a woman (scripts/art.ts hero).
describe('painted heroes', () => {
  it("the players' looks are painted, each with a figure and a face", () => {
    const list = heroes as string[];
    expect(list).toEqual(expect.arrayContaining(['maker-m', 'hunter-f']));
    for (const k of list) {
      const i = (HEROES as readonly string[]).indexOf(k) + 1;
      expect(i, k).toBeGreaterThan(0);
      for (const f of [`p${i}`, `q${i}`]) expect(existsSync(new URL(`../client/src/art/heroes/${f}.webp`, import.meta.url)), `${k} ${f}`).toBe(true);
    }
  });
});

// Every spot opens on its workplace painted (scripts/art.ts stations).
describe('painted stations', () => {
  it('every spot icon has its close view', () => {
    const list = stations as string[];
    expect(SPOT_ICONS.filter((k) => !list.includes(k))).toEqual([]);
    for (const k of list) {
      const i = (SPOT_ICONS as readonly string[]).indexOf(k) + 1;
      expect(existsSync(new URL(`../client/src/art/stations/s${i}.webp`, import.meta.url)), k).toBe(true);
    }
  });

  // works stand on the painting: on a phone (a 375 by 250 stage, 48px medals) none may cover another
  it('every close view has places for its works, inside it and apart', () => {
    const slots = stationSlots as unknown as Record<string, Array<[number, number]>>;
    for (const k of stations as string[]) {
      const at = slots[k] ?? [];
      expect(at.length, k).toBeGreaterThanOrEqual(8);
      at.forEach(([x, y], i) => {
        expect(x >= 9 && x <= 91 && y >= 12 && y <= 90, `${k} ${i}`).toBe(true);
        for (const [x2, y2] of at.slice(0, i)) {
          expect(Math.hypot((x - x2) * 3.75, (y - y2) * 2.5), `${k} ${i}`).toBeGreaterThanOrEqual(56);
        }
      });
    }
  });
});

// Every resident has a painted face (scripts/art.ts folk); a new resident needs one.
describe('painted folk', () => {
  it('every resident has a face, and every face its picture', () => {
    expect(content.residents.map((r) => r.id).filter((id) => !(FOLK as readonly string[]).includes(id))).toEqual([]);
    expect([...FOLK].filter((id) => !(folk as string[]).includes(id))).toEqual([]);
    FOLK.forEach((id, i) => expect(existsSync(new URL(`../client/src/art/folk/f${i + 1}.webp`, import.meta.url)), id).toBe(true));
  });
});

// A work's button shows the mark of the thing it gives, or its own (`icon` in content) when it gives none.
describe('marks of works', () => {
  it('every work on a plan has a mark, and a mark that is painted', () => {
    const res = new Map(content.resources.map((r) => [r.id, r]));
    const marked = (id: string) => {
      const r = res.get(id);
      return !!r && !r.hidden && !!r.icon;
    };
    for (const a of content.actions.filter((x) => x.group)) {
      const gives = [
        ...Object.keys(a.yield ?? {}),
        ...(a.effects ?? []).flatMap((e) => ('add' in e ? Object.entries(e.add).filter(([, n]) => n > 0).map(([r]) => r) : [])),
        ...(a.chance ?? []).flatMap((ch) => Object.keys(ch.add ?? {})),
      ];
      expect(!!a.icon || gives.some(marked), a.id).toBe(true);
      if (a.icon) {
        const ok = a.icon.startsWith('spot:') ? (SPOT_ICONS as readonly string[]).includes(a.icon.slice(5)) : (ITEM_ICONS as readonly string[]).includes(a.icon);
        expect(ok, a.id).toBe(true);
      }
    }
  });
});
