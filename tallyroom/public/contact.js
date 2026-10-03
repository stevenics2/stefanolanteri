'use strict';
const $ = (id) => document.getElementById(id);
$('cmsg').addEventListener('input', () => { $('ccount').textContent = $('cmsg').value.length; });
$('cf').addEventListener('submit', async (e) => {
  e.preventDefault();
  const st = $('cstatus'), btn = $('csend');
  const show = (t, bad) => { st.innerHTML = ''; const d = document.createElement('div'); d.className = 'msg' + (bad ? ' err' : ''); d.textContent = t; st.append(d); };
  if ($('cmsg').value.trim().length < 10) return show('Please write a little more (at least 10 characters).', true);
  btn.disabled = true; btn.textContent = 'Sending…';
  try {
    const r = await fetch('/api/contact', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ topic: $('topic').value, name: $('cname').value, email: $('cmail').value, message: $('cmsg').value, website: $('website').value }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Something went wrong. Please try again.');
    $('cf').innerHTML = '<h1 class="t">Message sent</h1><div class="msg">Thank you. We have received your message.</div><a class="btn block" href="/">Back to Tally Rooms</a>';
  } catch (er) { show(er.message, true); btn.disabled = false; btn.textContent = 'Send message'; }
});
