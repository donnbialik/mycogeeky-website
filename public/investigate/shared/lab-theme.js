/* Shares the lab day/night choice between the site (mv.labTheme = "day" | "night") and a Toolbox tool's own
   Theme button (which switches <html data-theme="light" | "dark">). Load in <head> after the tool's own theme script. */
(function () {
  var r = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem('mv.labTheme'); } catch (e) { /* storage unavailable */ }
  r.dataset.theme = saved === 'night' ? 'dark' : 'light';
  function label() {
    var b = document.querySelector('#themeBtn, #wbThemeBtn');
    if (b) { var night = r.dataset.theme === 'dark'; b.textContent = night ? 'Day mode' : 'Night mode'; b.setAttribute('aria-pressed', String(night)); }
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('#themeBtn, #wbThemeBtn')) return;
    setTimeout(function () {
      try { localStorage.setItem('mv.labTheme', r.dataset.theme === 'dark' ? 'night' : 'day'); } catch (err) { /* ignore */ }
      label();
    }, 0);
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', label); else label();
})();
