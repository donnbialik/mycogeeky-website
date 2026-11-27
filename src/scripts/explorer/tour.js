// A short guided tour of an Explorer page: one step at a time, each pointing at a part of the page.
// It starts by itself the first time a person opens the page in this browser and can be replayed with "Take the tour".
// Keyboard: Esc closes, arrow keys or Enter move on, Tab stays inside the tour box. Steps whose target is missing or
// hidden are skipped. Remembering that the tour was seen is a convenience only (browser storage may be unavailable).
const SEEN = name => `xp-tour-${name}-v1`;
const seen = name => { try { return localStorage.getItem(SEEN(name)) === '1'; } catch { return false; } };
const markSeen = name => { try { localStorage.setItem(SEEN(name), '1'); } catch { /* private mode: the tour may show again */ } };

export function startTour(name, steps) {
  const live = steps.filter(s => !s.target || visible(document.querySelector(s.target)));
  if (!live.length) return;
  let i = 0, ring = null, box = null, last = document.activeElement;
  const shade = el('div', 'xp-tour-shade');
  box = el('div', 'xp-tour-box'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'xp-tour-title');
  ring = el('div', 'xp-tour-ring');
  document.body.append(shade, ring, box);
  const close = () => { markSeen(name); shade.remove(); ring.remove(); box.remove(); document.removeEventListener('keydown', key, true); window.removeEventListener('resize', place); window.removeEventListener('scroll', place); if (last && last.focus) last.focus(); };
  const key = e => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowRight' || (e.key === 'Enter' && e.target === box)) { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (e.key === 'Tab') { const f = [...box.querySelectorAll('button')]; const a = f.indexOf(document.activeElement);
      e.preventDefault(); f[(a + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus(); }
  };
  const go = d => { const n = i + d; if (n < 0) return; if (n >= live.length) return close(); i = n; show(); };
  function place() {
    const s = live[i], t = s.target && document.querySelector(s.target);
    if (!t) { ring.style.display = 'none'; box.style.top = '50%'; box.style.left = '50%'; box.style.transform = 'translate(-50%,-50%)'; return; }
    const r = t.getBoundingClientRect(), pad = 6;
    Object.assign(ring.style, { display: 'block', top: `${r.top + scrollY - pad}px`, left: `${r.left + scrollX - pad}px`, width: `${r.width + 2 * pad}px`, height: `${r.height + 2 * pad}px` });
    const bw = Math.min(380, innerWidth - 24), below = r.bottom + 12 + 220 < innerHeight;
    box.style.transform = 'none';
    box.style.left = `${Math.max(12, Math.min(r.left + scrollX, scrollX + innerWidth - bw - 12))}px`;
    box.style.top = below ? `${r.bottom + scrollY + 12}px` : `${Math.max(scrollY + 12, r.top + scrollY - box.offsetHeight - 12)}px`;
  }
  function show() {
    const s = live[i];
    box.innerHTML = `<p class="xp-tour-step">${i + 1} of ${live.length}</p><h2 id="xp-tour-title">${s.title}</h2><p>${s.text}</p>
      <div class="xp-tour-btns"><button type="button" class="secondary" data-a="skip">${i === live.length - 1 ? 'Close' : 'Skip the tour'}</button>
      <span>${i ? '<button type="button" class="secondary" data-a="back">Back</button>' : ''}<button type="button" data-a="next">${i === live.length - 1 ? 'Done' : 'Next'}</button></span></div>`;
    const t = s.target && document.querySelector(s.target);
    // 'instant' overrides the site's smooth scrolling, so the ring is measured where the target ends up.
    if (t) t.scrollIntoView({ block: 'center', behavior: 'instant' });
    requestAnimationFrame(place);
    box.querySelector('[data-a=next]').focus();
  }
  box.addEventListener('click', e => { const a = e.target.closest('button') && e.target.closest('button').dataset.a; if (a === 'next') go(1); else if (a === 'back') go(-1); else if (a === 'skip') close(); });
  shade.addEventListener('click', close);
  document.addEventListener('keydown', key, true); window.addEventListener('resize', place); window.addEventListener('scroll', place, { passive: true });
  show();
}

// Wire a "Take the tour" button and start the tour once, the first time this page is opened in this browser.
export function offerTour(name, steps, button) {
  if (button) button.addEventListener('click', () => startTour(name, steps()));
  if (!seen(name)) setTimeout(() => startTour(name, steps()), 400);
}

function el(tag, cls) { const e = document.createElement(tag); e.className = cls; return e; }
function visible(e) { return !!e && !e.closest('[hidden]') && e.getClientRects().length > 0; }
