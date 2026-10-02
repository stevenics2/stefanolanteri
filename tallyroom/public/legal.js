'use strict';
// Fills in the operator's contact email (set as CONTACT_EMAIL in Cloudflare) without writing it in the page source.
fetch('/api/contact').then((r) => r.json()).then(({ email }) => {
  const targets = document.querySelectorAll('[data-contact]');
  if (!email) {
    targets.forEach((el) => { el.textContent = el.closest('#contact-line') ? 'not published yet' : 'the contact details at the bottom of this page'; });
    return;
  }
  targets.forEach((el) => {
    const a = document.createElement('a'); a.href = 'mailto:' + email; a.textContent = email; el.replaceChildren(a);
  });
}).catch(() => {});
