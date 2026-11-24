// Offline regression checks for result context. No network or real specimen data.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const survey = read('public/investigate/survey-report/index.html');
const between = (text, start, end) => {
  const a = text.indexOf(start), b = text.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, 'source boundaries exist');
  return text.slice(a, b);
};
const plain = value => JSON.parse(JSON.stringify(value));

test('all modified standalone tool scripts remain syntactically valid', () => {
  for (const name of ['survey-report', 'provisional-finder', 'its-bin-comparator']) {
    const html = read(`public/investigate/${name}/index.html`);
    for (const [, attrs, body] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (!/src=|application\/ld\+json|type="module"/.test(attrs)) new vm.Script(body, { filename: name });
    }
  }
});

function surveyContext() {
  const ctx = vm.createContext({ S: { settings: { src: 'project', proj: { title: 'Synthetic, test project' }, d1: '2025-01-01', d2: '2025-12-31' }, retrievedAt: '2026-11-24T10:00:00Z' }, A: { o: { prov: true, rg: false } }, srcLabel: st => st.proj.title });
  vm.runInContext(between(survey, 'function reportContext()', 'function download('), ctx);
  return ctx;
}
test('CSV retains ordinary columns and exports the selected settings and stable retrieval time', () => {
  const ctx = surveyContext();
  const rows = vm.runInContext('csv([["species", "survey_days"], ["Synthetic unit", 2]])', ctx);
  assert.ok(rows.startsWith('species,survey_days,report_source,'));
  assert.ok(rows.includes('"Synthetic, test project"'));
  assert.ok(rows.includes('""prov"":true'));
  assert.ok(rows.includes('2026-11-24T10:00:00Z'));
  assert.ok(rows.includes('not standardized events'));
  ctx.A.o.prov = false;
  assert.ok(vm.runInContext('csv([["unit"], ["Test"]])', ctx).includes('""prov"":false'));
  assert.equal(vm.runInContext('reportContext().report_retrieved_at', ctx), '2026-11-24T10:00:00Z');
});

test('counting choices still distinguish provisional vs species-rank units', () => {
  const ctx = vm.createContext({ speciesKey: t => t.rank_level === 10 ? t.name : null });
  vm.runInContext(between(survey, 'function unitOf(', 'function analyse('), ctx);
  ctx.record = { prov: 'Synthetic sp. TEST01', taxon: { id: 1, name: 'Synthetic namedunit', rank_level: 10 } };
  assert.equal(vm.runInContext('unitOf(record, {prov:true,provSp:"prov"}).key', ctx), 'p:Synthetic sp. TEST01');
  assert.equal(vm.runInContext('unitOf(record, {prov:false}).key', ctx), 's:Synthetic namedunit');
  assert.equal(vm.runInContext('unitOf(record, {prov:true,provSp:"species"}).key', ctx), 's:Synthetic namedunit');
  ctx.record.taxon.rank_level = 20;
  assert.equal(vm.runInContext('unitOf(record, {prov:false})', ctx), null);
});

test('summary explains estimates and handles insufficient dates without a future-discovery guarantee', () => {
  const elements = new Map();
  const $ = selector => { if (!elements.has(selector)) elements.set(selector, {}); return elements.get(selector); };
  const ctx = vm.createContext({ $, S: {}, A: { units: new Map([['a', {days: new Set(['d1'])}], ['b', {days: new Set(['d1', 'd2'])}]]), days: new Map([['d1', {units: new Set(['a', 'b'])}], ['d2', {units: new Set(['b'])}]]) }, fmt: n => String(Math.round(n)), tile: (v, k) => `${k}: ${v}` });
  vm.runInContext(between(survey, 'function chao2(', '/* ---------- 4. render ---------- */'), ctx);
  vm.runInContext(between(survey, 'function renderCompleteness()', 'function renderGroups()'), ctx);
  vm.runInContext('renderCompleteness()', ctx);
  assert.ok($('#compNote').innerHTML.includes('not a guaranteed minimum'));
  assert.ok($('#compTiles').innerHTML.includes('estimated fraction recorded'));
  assert.equal(ctx.S.chao.est, 2.25);
  ctx.A.days = new Map([['d1', {units: new Set(['a', 'b'])}]]);
  vm.runInContext('renderCompleteness()', ctx);
  assert.equal($('#compNote').innerHTML, 'At least two dates with records are needed for an estimate.');
});

test('Finder saved example, saved file and query modes remain distinct in exported context', () => {
  const source = read('public/investigate/provisional-finder/index.html');
  const ctx = vm.createContext({ state: { dataMode: 'example', searchedAt: Date.parse('2026-11-20T10:00:00Z') } });
  vm.runInContext(between(source, 'function resultContext()', 'function renderAll()'), ctx);
  assert.match(vm.runInContext('resultContext()', ctx), /Saved example snapshot.*not a fresh query/);
  ctx.state.dataMode = 'snapshot';
  assert.match(vm.runInContext('resultContext()', ctx), /Saved results.*2026-11-20/);
  ctx.state.dataMode = 'query';
  assert.match(vm.runInContext('resultContext()', ctx), /cached results.*not rarity in nature/);
});
