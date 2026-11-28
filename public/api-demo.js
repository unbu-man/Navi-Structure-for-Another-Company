const form = document.querySelector('#test-request');
const status = document.querySelector('#api-status');
const output = document.querySelector('#api-response');
const send = form.querySelector('button');
let previous;

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const body = { message: data.get('message'), language: data.get('language') };
  if (data.has('followup') && previous) body.previous = previous;
  send.disabled = true;
  status.textContent = 'Sending request…';
  output.textContent = '';
  try {
    const response = await fetch('/api/bots/clickhr/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (response.ok) previous = { intent: result.intent, topics: result.topics, knowledgeIds: result.knowledgeIds, platform: result.platform };
    status.textContent = `HTTP ${response.status}`;
    output.textContent = JSON.stringify(result, null, 2);
  } catch {
    status.textContent = 'Could not reach the Navi API. Try again.';
  } finally {
    send.disabled = false;
  }
});
