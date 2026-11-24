import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const picker = readFileSync(new URL('../public/investigate/survey-report/project-picker.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../public/investigate/survey-report/index.html', import.meta.url), 'utf8');
class Element {
  constructor(id = '') { this.id = id; this.attrs = {}; this.handlers = {}; this.children = []; this.dataset = {}; this.value = ''; this.textContent = ''; this.classes = new Set(['hidden']); this.classList = { add: x => this.classes.add(x), toggle: (x, on) => on ? this.classes.add(x) : this.classes.delete(x), remove: x => this.classes.delete(x) }; }
  setAttribute(k,v) { this.attrs[k] = v; }
  getAttribute(k) { return this.attrs[k] ?? null; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(k,fn) { (this.handlers[k] ||= []).push(fn); }
  emit(type, extra = {}) { const e = { target:this, prevented:false, preventDefault() { this.prevented = true; }, ...extra }; for (const fn of this.handlers[type] || []) fn(e); return e; }
  replaceChildren(...children) { this.children = children; }
  scrollIntoView() {}
  contains(el) { return this.children.includes(el); }
  closest() { return this.attrs.role === 'option' ? this : null; }
  focus() { this.focused = true; }
}
function setup(search = async () => [{ id:1, title:'First' }, { id:2, title:'Second' }]) {
  const input = new Element('proj'), list = new Element('projList'), status = new Element();
  const timers = new Map(); let clock = 0, selected = null;
  const context = { window:{}, document:{createElement:() => new Element()}, setTimeout: fn => { timers.set(++clock,fn); return clock; }, clearTimeout: id => timers.delete(id) };
  vm.runInNewContext(picker, context);
  context.window.initSurveyProjectPicker({input,list,status,search,onPick:p => selected=p,onEdit:() => selected=null});
  return {input,list,status,get selected(){return selected;},async query(q='fo'){input.value=q;input.emit('input');const jobs=[...timers.values()];timers.clear();await Promise.all(jobs.map(fn=>fn()));}};
}
test('keyboard accepts a non-first project without submitting, editing clears selection', async () => {
  const p=setup();await p.query();
  assert.equal(p.input.getAttribute('aria-expanded'),'true');
  p.input.emit('keydown',{key:'ArrowDown'});p.input.emit('keydown',{key:'ArrowDown'});
  assert.equal(p.input.getAttribute('aria-activedescendant'),'projList-option-1');
  assert.equal(p.list.children[1].getAttribute('aria-selected'),'true');
  assert.equal(p.input.emit('keydown',{key:'Enter'}).prevented,true);
  assert.equal(p.selected.id,2);assert.equal(p.input.value,'Second');
  assert.equal(p.input.getAttribute('aria-expanded'),'false');
  assert.equal(p.input.getAttribute('aria-activedescendant'),null);
  await p.query('other');assert.equal(p.selected,null);
});
test('Escape and Tab dismiss without selecting; Up reopens at last result', async () => {
  const p=setup();await p.query();p.input.emit('keydown',{key:'ArrowUp'});p.input.emit('keydown',{key:'Escape'});
  assert.equal(p.selected,null);assert.equal(p.input.getAttribute('aria-expanded'),'false');
  p.input.emit('keydown',{key:'ArrowUp'});assert.equal(p.input.getAttribute('aria-activedescendant'),'projList-option-1');
  assert.equal(p.input.emit('keydown',{key:'Tab'}).prevented,false);
  assert.equal(p.input.getAttribute('aria-activedescendant'),null);
});
test('pointer activation selects and returns focus to input', async () => {
  const p=setup();await p.query();p.list.emit('click',{target:p.list.children[1]});
  assert.equal(p.selected.id,2);assert.equal(p.input.focused,true);
});
test('late search cannot reopen after Escape or replace a newer query', async () => {
  const pending=[];const p=setup(q=>new Promise(resolve=>pending.push({q,resolve})));
  const first=p.query('old');const second=p.query('new');
  pending[1].resolve([{id:2,title:'New'}]);await second;
  pending[0].resolve([{id:1,title:'Old'}]);await first;
  assert.equal(p.list.children[0].textContent,'New');
  const third=p.query('later');p.input.emit('keydown',{key:'Escape'});
  pending[2].resolve([{id:3,title:'Late'}]);await third;
  assert.equal(p.input.getAttribute('aria-expanded'),'false');assert.equal(p.list.children.length,0);
});
test('empty results and failure give feedback; short input clears options', async () => {
  const empty=setup(async()=>[]);await empty.query();assert.match(empty.status.textContent,/No matching/);
  const failed=setup(async()=>{throw Error('offline');});await failed.query();assert.match(failed.status.textContent,/could not finish/);
  assert.equal(failed.input.getAttribute('aria-expanded'),'false');
  const p=setup();await p.query();await p.query('a');assert.equal(p.list.children.length,0);
});
test('form errors associate and focus their field; clearing preserves original help', () => {
  const els = { '#formMsg':new Element(), '#proj':new Element() };
  els['#proj'].setAttribute('aria-describedby','projHelp');
  const source=html.slice(html.indexOf('function clearFormError'),html.indexOf("for (const id of ['users'"));
  const ctx={ $:id=>els[id], document:{querySelectorAll:()=>[els['#proj']]} };
  vm.createContext(ctx);vm.runInContext(source,ctx);
  ctx.formError('Choose a project','#proj');
  assert.equal(els['#proj'].getAttribute('aria-invalid'),'true');
  assert.equal(els['#proj'].getAttribute('aria-describedby'),'projHelp formMsg');
  assert.equal(els['#proj'].focused,true);
  ctx.clearFormError();assert.equal(els['#proj'].getAttribute('aria-describedby'),'projHelp');
  assert.equal(els['#formMsg'].textContent,'');
});
