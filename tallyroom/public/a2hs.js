'use strict';
// "Save to your phone" prompt, shown once per user on phones only.
//  - Android (Chrome): one tap installs the site to the home screen.
//  - iPhone / iPad: iOS does not allow this from code, so we show the steps.
(() => {
  const KEY = 'tr_save_prompt_seen';
  const store = {
    get() { try { return localStorage.getItem(KEY); } catch { return null; } },
    set() { try { localStorage.setItem(KEY, '1'); } catch { /* private mode: may show again */ } },
  };

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});

  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (!(isIOS || isAndroid) || standalone || store.get()) return;

  let deferred = null;
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; });
  addEventListener('appinstalled', () => { store.set(); close(); });

  const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const SHARE = svg('<path d="M12 3v12M8 7l4-4 4 4M5 11v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9"/>');
  const PLUS = svg('<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/>');
  const DOTS = svg('<circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/>');

  let root = null;
  function close() { if (root) { root.remove(); root = null; } }

  function steps() {
    if (isIOS) {
      const chrome = /CriOS/.test(ua);
      return `<ol class="a2-steps">
        <li><span class="a2-ic">${SHARE}</span><span>Tap the <b>Share</b> button ${chrome ? 'in the address bar at the top right' : 'in the bar at the bottom of Safari'}.</span></li>
        <li><span class="a2-ic">${PLUS}</span><span>Scroll down and tap <b>Add to Home Screen</b>.</span></li>
        <li><span class="a2-ic">${svg('<path d="M20 6 9 17l-5-5"/>')}</span><span>Tap <b>Add</b>. Tally Rooms now opens from your home screen in one tap.</span></li>
      </ol>`;
    }
    if (deferred) return '<p class="a2-p">Add it to your home screen to open it in one tap, like an app. It takes a few seconds and uses almost no space.</p>';
    return `<ol class="a2-steps">
      <li><span class="a2-ic">${DOTS}</span><span>Open your browser <b>menu</b> (the three dots).</span></li>
      <li><span class="a2-ic">${PLUS}</span><span>Tap <b>Add to Home screen</b> or <b>Install app</b>.</span></li>
    </ol>`;
  }

  function show() {
    if (root || store.get()) return;
    store.set();                                   // first use only: never shown again
    root = document.createElement('div');
    root.className = 'a2-overlay';
    root.innerHTML = `
      <div class="a2-sheet" role="dialog" aria-modal="true" aria-labelledby="a2t">
        <div class="a2-head">
          <img src="/icon-192.png" alt="" width="52" height="52">
          <div><h2 id="a2t">Save Tally Rooms on your phone</h2><p>Keep it one tap away, like an app.</p></div>
        </div>
        ${steps()}
        <div class="a2-actions">
          ${!isIOS && deferred ? '<button class="btn block" id="a2-install" type="button">Add to home screen</button>' : ''}
          <button class="a2-later ${!isIOS && deferred ? '' : 'primary'}" id="a2-close" type="button">${!isIOS && deferred ? 'Not now' : 'Got it'}</button>
        </div>
      </div>`;
    document.body.append(root);
    root.addEventListener('click', (e) => { if (e.target === root) close(); });
    root.querySelector('#a2-close').addEventListener('click', close);
    const inst = root.querySelector('#a2-install');
    if (inst) inst.addEventListener('click', async () => {
      try { deferred.prompt(); await deferred.userChoice; } catch { /* ignore */ }
      deferred = null; close();
    });
  }

  // Wait a little so the install event (Android) has time to arrive, then show once.
  addEventListener('load', () => setTimeout(show, isAndroid ? 3500 : 2500));
})();
