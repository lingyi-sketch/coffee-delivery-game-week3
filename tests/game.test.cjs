const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
// Load the game's exported rules without mounting a browser canvas.
const core = script.slice(0, script.indexOf('const game=Daldongne.mount'));
const context = {module: {exports: {}}};
vm.runInNewContext(core, context);
const g = context.module.exports;

test('ready state does not move or deliver; start and pause control time', () => {
  const s = g.newGame();
  const initial = JSON.stringify(s.n);
  g.step(s, .02, {x: 1});
  assert.equal(JSON.stringify(s.n), initial);
  assert.equal(g.interact(s), false);
  g.start(s);g.step(s,.02);
  assert.equal(s.time,.02);
  g.pause(s);g.step(s,.02);
  assert.equal(s.time,.02);
  g.pause(s);assert.equal(s.status,'playing');
});
test('coffee is required and distant interaction cannot deliver', () => {
  const s = g.newGame();g.start(s);
  s.n = g.ORDERS[0].door;
  assert.equal(g.interact(s),false);
  assert.equal(s.done.length,0);
  assert.equal(s.target,'cafe');
  s.n = g.math.at(0,-1.4);
  assert.equal(g.interact(s),false);
});
test('level 1 is one round of deliveries (4 unlocked houses = 4 cups); duplicates are rejected', () => {
  const s = g.newGame();g.start(s);s.n=g.CAFE.door;
  assert.equal(s.levelGoal,4);
  assert.equal(g.interact(s),true);assert.equal(s.carrying,4);
  assert.equal(g.interact(s),false);assert.equal(s.carrying,4);
  for (const [i,id] of s.route.entries()) {
    const site=g.SITES.find(x=>x.id===id);
    s.n=site.door;assert.equal(g.interact(s),true);
    assert.equal(s.deliveries,i+1);assert.equal(s.carrying,3-i);
    assert.equal(g.interact(s),false);assert.equal(s.deliveries,i+1);
  }
  assert.equal(s.deliveries,4);assert.equal(s.status,'won');
  const fresh=g.newGame();assert.equal(fresh.status,'ready');
  assert.equal(fresh.deliveries,0);assert.equal(fresh.carrying,0);assert.equal(fresh.level,1);
});
test('deliveries must follow the shortest-route order from the cafe; out-of-order delivery is rejected', () => {
  const s = g.newGame();g.start(s);s.n=g.CAFE.door;
  g.interact(s);
  const route=g.deliveryRoute(s).map(x=>x.id);
  assert.equal(JSON.stringify(s.route),JSON.stringify(route));
  assert.equal(s.target,route[0]);
  const wrong=g.SITES.find(x=>x.id===route[1]);
  s.n=wrong.door;
  assert.equal(g.interact(s),false);
  assert.equal(s.carrying,4);
  assert.equal(s.target,route[0]);
  const correct=g.SITES.find(x=>x.id===route[0]);
  assert.ok(s.message.includes(correct.name));
  s.n=correct.door;
  assert.equal(g.interact(s),true);
  assert.equal(s.target,route[1]);
});
test('tray capacity is frozen at pickup and unaffected by deliveries, until the next pickup', () => {
  const s = g.newGame();g.start(s);s.n=g.CAFE.door;
  assert.equal(s.trayCapacity,0);
  g.interact(s);
  assert.equal(s.trayCapacity,4);assert.equal(s.carrying,4);
  const first=g.SITES.find(x=>x.id===s.route[0]);
  s.n=first.door;g.interact(s);
  assert.equal(s.trayCapacity,4);assert.equal(s.carrying,3);
  s.economy.coins=1000;g.buyUpgrade(s,'houses');
  const second=g.SITES.find(x=>x.id===s.route[1]);
  s.n=second.door;g.interact(s);
  assert.equal(s.trayCapacity,4);assert.equal(s.carrying,2);
  const fresh=g.newGame();assert.equal(fresh.trayCapacity,0);
});
test('reset restarts the delivery order from the first stop of the route', () => {
  const s = g.newGame();g.start(s);s.n=g.CAFE.door;g.interact(s);
  const firstRoute=s.route.slice();
  const fresh=g.newGame();
  assert.equal(fresh.route.length,0);
  assert.equal(fresh.target,'cafe');
  g.start(fresh);fresh.n=g.CAFE.door;g.interact(fresh);
  assert.equal(JSON.stringify(fresh.route),JSON.stringify(firstRoute));
});
test('buildings, trees and small cafe decorations block movement', () => {
  const s = g.newGame(); g.start(s);
  // Buildings: walking straight at a site center is stopped well before reaching it.
  s.n = g.math.add(g.CAFE.n, [0, 0, 2]);
  for (let i = 0; i < 60; i++) g.step(s, .05, {x: 0, y: -1});
  const distToCafe = g.math.angle(s.n, g.CAFE.n) * g.R;
  assert.ok(distToCafe > g.CAFE.w / 2, 'player should not pass through the cafe building');

  // Trees: at least one generated tree obstacle should block a point directly on it.
  const scene = g.getScene(s);
  const tree = scene.obstacles.find(o => o.type === 'circle' && o.r >= .28 && o.r <= .45);
  assert.ok(tree, 'expected at least one tree obstacle to exist');
  assert.ok(g.blockedAt(tree.x, tree.z, s), 'standing on a tree trunk should be blocked');

  // Cafe decorations (quality>=1 awning plants, quality>=2 tables) should also block.
  s.economy.quality = 4;
  const scene2 = g.getScene(s);
  const rects = scene2.obstacles.filter(o => o.type === 'rect');
  const circlesNearCafe = scene2.obstacles.filter(o => o.type === 'circle' && Math.hypot(o.x - g.CAFE.n[0], o.z - g.CAFE.n[2]) < 2);
  assert.ok(circlesNearCafe.length >= 3, 'expected pot/table obstacle circles near the cafe at quality 4');
  const deco = circlesNearCafe[0];
  assert.ok(g.blockedAt(deco.x, deco.z, s), 'standing on a cafe decoration should be blocked');
});
test('beauty 4+ gives each non-cafe building a matching doorside prop (none at beauty 3), still reachable, and reset clears it', () => {
  const nonCafeIds = g.SITES.filter(b => b.id !== 'cafe').map(b => b.id);
  const s3 = g.newGame(); s3.economy.beauty = 3; s3.economy.houses = 5;
  const scene3 = g.getScene(s3);
  for (const b of g.SITES.filter(x => x.id !== 'cafe')) {
    const near = scene3.obstacles.some(o => {
      const cx = o.type === 'circle' ? o.x : (o.x0 + o.x1) / 2, cz = o.type === 'circle' ? o.z : (o.z0 + o.z1) / 2;
      return Math.hypot(cx - b.n[0], cz - b.n[2]) < 1.2;
    });
    assert.ok(!near, b.id + ' should have no doorside prop at beauty 3');
  }
  const s4 = g.newGame(); s4.economy.beauty = 4; s4.economy.houses = 5;
  const scene4 = g.getScene(s4);
  for (const b of g.SITES.filter(x => x.id !== 'cafe')) {
    const near = scene4.obstacles.some(o => {
      const cx = o.type === 'circle' ? o.x : (o.x0 + o.x1) / 2, cz = o.type === 'circle' ? o.z : (o.z0 + o.z1) / 2;
      return Math.hypot(cx - b.n[0], cz - b.n[2]) < 1.2;
    });
    assert.ok(near, b.id + ' should have a doorside prop at beauty 4');
    assert.ok(!g.blockedAt(b.door[0], b.door[2], s4), b.id + ' door point must remain open at beauty 4');
  }
  const cafeOnly4 = scene4.obstacles.filter(o => {
    const cx = o.type === 'circle' ? o.x : (o.x0 + o.x1) / 2, cz = o.type === 'circle' ? o.z : (o.z0 + o.z1) / 2;
    return Math.hypot(cx - g.CAFE.n[0], cz - g.CAFE.n[2]) < 1.2;
  }).length;
  assert.equal(cafeOnly4, 1, 'the cafe should be unaffected by this feature (only its original barrel prop)');
});
test('every building blocks movement all the way to its visual corner, not just a loose circle', () => {
  const s = g.newGame(); g.start(s);
  for (const b of g.SITES) {
    const cornerX = b.n[0] + b.w / 2, cornerZ = b.n[2] + b.d / 2;
    assert.ok(g.blockedAt(cornerX, cornerZ, s), b.id + ' corner should be blocked');
  }
});
test('garden wall, bench and gate posts block movement', () => {
  const s = g.newGame(); g.start(s);
  const flat = (lon, lat) => [lon * g.R, 0, -lat * g.R];
  const wall = flat(-.65, .14), bench = flat(.48, .75), gate = flat(.92, .53);
  assert.ok(g.blockedAt(wall[0], wall[2], s), 'garden wall should block');
  assert.ok(g.blockedAt(bench[0], bench[2], s), 'bench should block');
  assert.ok(g.blockedAt(gate[0] + .4, gate[2], s), 'gate post should block');
});
test('the cafe annex (quality 7+) blocks movement without sealing off the door', () => {
  const s = g.newGame(); g.start(s);
  s.economy.quality = 7;
  const scene = g.getScene(s);
  const annex = scene.obstacles.find(o => o.type === 'rect' && o.x1 < g.CAFE.n[0]);
  assert.ok(annex, 'expected an annex rect west of the cafe at quality 7');
  const cx = (annex.x0 + annex.x1) / 2, cz = (annex.z0 + annex.z1) / 2;
  assert.ok(g.blockedAt(cx, cz, s), 'the annex interior should be blocked');
  // The door itself must remain unblocked and reachable (ring probe around it).
  assert.ok(!g.blockedAt(g.CAFE.door[0], g.CAFE.door[2], s), 'the cafe door point itself must stay open');
  let openArcs = 0;
  const ringDist = .205 * g.R * .85;
  for (let k = 0; k < 36; k++) {
    const a = k / 36 * Math.PI * 2;
    const px = g.CAFE.door[0] + Math.cos(a) * ringDist, pz = g.CAFE.door[2] + Math.sin(a) * ringDist;
    if (!g.blockedAt(px, pz, s)) openArcs++;
  }
  assert.ok(openArcs >= 18, 'at least half of the approach angles to the cafe door should remain open, got ' + openArcs + '/36');
});
test('diagonal movement into a wall slides along it instead of fully stopping', () => {
  const s = g.newGame(); g.start(s);
  s.n = [g.CAFE.n[0] - .2, 0, g.CAFE.n[2] - 1.2];
  const startX = s.n[0];
  for (let i = 0; i < 60; i++) g.step(s, .03, {x: .3, y: 1});
  assert.ok(s.n[0] - startX > .5, 'lateral component should keep advancing while blocked ahead (sliding)');
});
test('level goal is one round (=neighbor count) for levels 1-4, and two rounds from level 5 on, with no cap', () => {
  const s = g.newGame();
  assert.equal(g.computeGoalForLevel(s,1),4);
  assert.equal(g.computeGoalForLevel(s,4),4);
  assert.equal(g.computeGoalForLevel(s,5),8);
  assert.equal(g.computeGoalForLevel(s,9),8);
  assert.equal(g.computeGoalForLevel(s,50),8);
});
test('buying a new neighbor mid-level keeps the current goal fixed; it only counts from the next level', () => {
  const s = g.newGame();
  s.level=2;g.start(s);
  assert.equal(s.levelGoal,4);
  s.economy.coins=1000;
  assert.ok(g.buyUpgrade(s,'houses'));
  assert.equal(g.activeOrders(s).length,5);
  assert.equal(s.levelGoal,4);
  s.status='ready';s.level=3;g.start(s);
  assert.equal(s.levelGoal,5);
});
test('sprinting moves the player faster than walking', () => {
  const s = g.newGame();g.start(s);
  const startPos = s.n.slice();
  g.step(s,.1,{y:-1});
  const walkDist = Math.hypot(s.n[0]-startPos[0], s.n[2]-startPos[2]);
  assert.equal(s.sprinting,false);
  const s2 = g.newGame();g.start(s2);
  g.step(s2,.1,{y:-1,sprint:true});
  const sprintDist = Math.hypot(s2.n[0]-startPos[0], s2.n[2]-startPos[2]);
  assert.equal(s2.sprinting,true);
  assert.ok(sprintDist > walkDist);
  g.step(s2,.1,{sprint:true});
  assert.equal(s2.sprinting,false);
});
test('menu slots open at level 5 and then every 3 levels, with a countdown hint; menu items raise the coffee price', () => {
  const s = g.newGame();
  s.economy.coins = 10000;
  s.level = 1;assert.equal(g.menuSlots(s),0);assert.equal(g.nextMenuHint(s),4);
  assert.equal(g.buyMenu(s,'cookie'),false);
  s.level = 4;assert.equal(g.menuSlots(s),0);assert.equal(g.nextMenuHint(s),1);
  s.level = 5;assert.equal(g.menuSlots(s),1);assert.equal(g.nextMenuHint(s),3);
  const before = g.priceLevel(s);
  assert.ok(g.buyMenu(s,'cookie'));
  assert.ok(g.priceLevel(s) > before);
  assert.equal(g.menuSlots(s),0);
  assert.equal(g.buyMenu(s,'cake'),false);
  s.level = 7;assert.equal(g.menuSlots(s),0);
  s.level = 8;assert.equal(g.menuSlots(s),1);assert.equal(g.nextMenuHint(s),3);
  assert.equal(g.buyMenu(s,'cookie'),false);
  assert.ok(g.buyMenu(s,'greentea'));
  assert.equal(s.economy.menu.length,2);
  s.level = 20;assert.equal(g.menuSlots(s),4);assert.equal(g.nextMenuHint(s),null);
});
test('buying the houses upgrade unlocks an extra neighbor for delivery', () => {
  const s = g.newGame();
  assert.equal(g.activeOrders(s).length,4);
  const before = s.economy.coins;
  s.economy.coins = 1000;
  const result = g.buyUpgrade(s,'houses');
  assert.ok(result);
  assert.equal(s.economy.houses,1);
  assert.equal(g.activeOrders(s).length,5);
  assert.equal(g.activeOrders(s)[4].id, g.EXTRA[0].id);
});
test('with no menu unlocked, every neighbor wants coffee and the player uses the tray', () => {
  const s = g.newGame();
  for (const site of g.ORDERS.concat(g.EXTRA)) assert.equal(g.wantOf(s, site.id), 'coffee');
  g.start(s); s.n = g.CAFE.door; g.interact(s);
  const items = s.route.slice(s.done.length, s.done.length + s.carrying).map(id => g.itemInfo(g.wantOf(s, id)));
  assert.ok(items.every(it => it.id === 'coffee'), 'all carried items should be coffee with no menu unlocked');
});
test('unlocking a new menu item reassigns neighbor wants from coffee+unlocked items, and stays fixed until the next unlock', () => {
  const s = g.newGame();
  s.economy.coins = 10000; s.level = 5;
  assert.ok(g.buyMenu(s, 'cookie'));
  const pool = ['coffee', 'cookie'];
  for (const site of g.ORDERS.concat(g.EXTRA)) assert.ok(pool.includes(g.wantOf(s, site.id)));
  const snapshot = {...s.economy.wants};
  // Normal gameplay (starting, walking, delivering) must not reshuffle wants.
  g.start(s); s.n = g.CAFE.door; g.interact(s);
  const site = g.SITES.find(x => x.id === s.route[0]);
  s.n = site.door; g.interact(s);
  assert.deepEqual({...s.economy.wants}, snapshot, 'wants must stay fixed through ordinary play, not just at purchase time');
  // Unlocking another item is the only thing allowed to reshuffle it.
  s.level = 8;
  assert.ok(g.buyMenu(s, 'greentea'));
  const pool2 = ['coffee', 'cookie', 'greentea'];
  for (const site2 of g.ORDERS.concat(g.EXTRA)) assert.ok(pool2.includes(g.wantOf(s, site2.id)));
});
test('cafe pickup carries exactly what each neighbor on this trip wants, and tray/cart switches accordingly', () => {
  const s = g.newGame();
  s.economy.coins = 10000; s.level = 5;
  g.buyMenu(s, 'cookie'); g.buyMenu(s, 'greentea');
  // Force a known want assignment for a deterministic check.
  for (const site of g.ORDERS.concat(g.EXTRA)) s.economy.wants[site.id] = 'cookie';
  s.economy.wants[g.ORDERS[0].id] = 'coffee';
  g.start(s); s.n = g.CAFE.door; g.interact(s);
  const items = s.route.slice(s.done.length, s.done.length + s.carrying).map(id => g.itemInfo(g.wantOf(s, id)));
  const expected = s.route.map(id => g.wantOf(s, id));
  assert.deepEqual(items.map(it => it.id), expected.slice(0, s.carrying));
  // Deliver the first stop and confirm the carried-items window shifts correctly.
  const firstSite = g.SITES.find(x => x.id === s.route[0]);
  s.n = firstSite.door;
  const before = s.deliveries;
  g.interact(s);
  assert.equal(s.deliveries, before + 1);
  const remaining = s.route.slice(s.done.length, s.done.length + s.carrying).map(id => g.itemInfo(g.wantOf(s, id)));
  assert.deepEqual(remaining.map(it => it.id), s.route.slice(1, 1 + s.carrying).map(id => g.wantOf(s, id)));
});
test('coin payout for a delivery equals priceLevel(s) regardless of what item was delivered', () => {
  const s = g.newGame();
  s.economy.coins = 10000; s.level = 5; g.buyMenu(s, 'cookie');
  for (const site of g.ORDERS.concat(g.EXTRA)) s.economy.wants[site.id] = 'cookie';
  g.start(s); s.n = g.CAFE.door; g.interact(s);
  const site = g.SITES.find(x => x.id === s.route[0]);
  assert.equal(g.itemInfo(g.wantOf(s, site.id)).id, 'cookie', 'sanity check: this delivery is a cookie, not coffee');
  const priceBefore = g.priceLevel(s);
  s.n = site.door;
  const coinsBefore = s.economy.coins;
  g.interact(s);
  assert.equal(s.economy.coins - coinsBefore, priceBefore);
});
test('reset clears every neighbor back to wanting coffee', () => {
  const s = g.newGame();
  s.economy.coins = 10000; s.level = 5; g.buyMenu(s, 'cookie');
  g.resetWantsToCoffee(s);
  for (const site of g.ORDERS.concat(g.EXTRA)) assert.equal(g.wantOf(s, site.id), 'coffee');
});
