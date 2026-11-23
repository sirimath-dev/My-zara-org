const $ = id => document.getElementById(id);
const phone = $('phone'), button = $('generate'), result = $('result'), notice = $('notice');
button.addEventListener('click', generate);
phone.addEventListener('keydown', e => { if (e.key === 'Enter') generate(); });
async function generate() {
  const number = phone.value.replace(/\D/g, '');
  notice.textContent = ''; result.classList.add('hidden');
  if (!/^[1-9]\d{7,14}$/.test(number)) {
    notice.textContent = 'Enter a valid international number (8–15 digits), including country code.';
    return;
  }
  button.disabled = true; button.classList.add('loading');
  try {
    const response = await fetch(`/code?number=${encodeURIComponent(number)}`);
    const data = await response.json();
    if (!response.ok || !data.status || !data.code) throw new Error(data.error || 'Unable to generate pairing code.');
    $('code').textContent = data.code;
    result.classList.remove('hidden');
    notice.textContent = 'Enter this code in WhatsApp → Linked devices → Link a device → Link with phone number.';
  } catch (err) { notice.textContent = err.message || 'Connection error. Please try again later.'; }
  finally { button.disabled = false; button.classList.remove('loading'); }
}
$('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('code').textContent); $('copy').textContent = 'Copied!'; }
  catch { notice.textContent = 'Copy unavailable. Select the code and copy it manually.'; }
  setTimeout(() => $('copy').textContent = 'Copy Code', 1600);
});
async function refreshStatus() {
  try {
    const r = await fetch('/api/status'); const s = await r.json();
    $('statusText').textContent = s.connected ? 'WhatsApp account connected' : 'Pairing server online · WhatsApp not connected';
  } catch { $('statusText').textContent = 'Server status unavailable'; }
}
refreshStatus(); setInterval(refreshStatus, 10000);
