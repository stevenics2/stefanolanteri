'use strict';
// If the operator published a contact email (CONTACT_EMAIL in Cloudflare), show it next to the contact form link.
fetch('/api/contact').then((r) => r.json()).then(({ email }) => {
  if (!email) return;
  document.querySelectorAll('[data-contact-email]').forEach((el) => {
    const a = document.createElement('a'); a.href = 'mailto:' + email; a.textContent = email;
    el.append(' · Email: ', a);
  });
}).catch(() => {});
