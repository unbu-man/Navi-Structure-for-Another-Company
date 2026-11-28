const $ = (selector, root = document) => root.querySelector(selector);
const main = $('#main');
const sidebar = $('#sidebar');
const picker = $('#bot-picker');
const dialog = $('#meeting-dialog');
const page = location.pathname.match(/^\/(chat|embed)\/([a-z0-9-]+)$/u);
const state = { bots: [], slug: '', view: 'playground', passwordRequired: false, aiEnabled: false, modelProvider: 'faq' };
let renderVersion = 0;

function element(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value != null) node.textContent = value;
  return node;
}

function button(label, className = 'button', action) {
  const node = element('button', className, label);
  node.type = 'button';
  if (action) node.addEventListener('click', action);
  return node;
}

function link(label, url, className = 'button') {
  const node = element('a', className, label);
  node.href = url;
  node.target = '_blank';
  node.rel = 'noopener noreferrer';
  return node;
}

async function api(path, method = 'GET', body) {
  const response = await fetch(path, {
    method,
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The request failed.');
  return data;
}

function requestUuid() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}

function initials(name) {
  return name.split(/\s+/u).slice(0, 2).map((part) => Array.from(part)[0] || '').join('').toUpperCase();
}

const currentBot = () => state.bots.find((bot) => bot.slug === state.slug);
const botUrl = (bot) => '/chat/' + encodeURIComponent(bot.slug);
const embedUrl = (bot) => '/embed/' + encodeURIComponent(bot.slug);
const botApi = (bot) => '/api/bots/' + encodeURIComponent(bot.slug);
const adminApi = (bot) => '/api/admin/bots/' + encodeURIComponent(bot.slug);

function topBar(bot) {
  const header = element('header', 'topbar');
  const crumb = element('div', 'breadcrumb');
  crumb.append(element('span', '', 'Workspace'), element('span', 'separator', '/'), element('strong', '', bot.name));
  header.append(crumb, link('Open visitor chat', botUrl(bot), 'button secondary'));
  return header;
}

function sectionHeading(title, description) {
  const head = element('div', 'section-heading');
  head.append(element('h1', '', title));
  if (description) head.append(element('p', '', description));
  return head;
}

function workspaceFrame(bot) {
  const content = element('div', 'content');
  main.replaceChildren(topBar(bot), content);
  return content;
}

function activate(view) {
  state.view = view;
  render();
}

const englishTests = [
  ['What does Click HR do?', 'What does Click HR do?'],
  ['Payroll & NSSF', 'Does Click HR support payroll and NSSF?'],
  ['Attendance', 'Can staff clock in on their phones? How does attendance work?'],
  ['Pricing', 'How much does Click HR cost for 50 employees?'],
];

const khmerTests = [
  ['មុខងារ Click HR', 'តើ Click HR មានមុខងារអ្វីខ្លះ?'],
  ['បញ្ជីប្រាក់ខែ', 'តើ Click HR គាំទ្របញ្ជីប្រាក់ខែទេ?'],
  ['វត្តមាន', 'តើបុគ្គលិកអាចកត់ត្រាវត្តមានតាមទូរស័ព្ទបានទេ?'],
  ['តម្លៃ', 'តើ Click HR មានតម្លៃប៉ុន្មានសម្រាប់បុគ្គលិក ៥០ នាក់?'],
];

function suggestions(bot, language = 'en') {
  if (bot.slug === 'clickhr') return language === 'km' ? khmerTests : englishTests;
  const entries = bot.topics ?? bot.faqs.map(({ id, title }) => ({ id, title }));
  const topics = entries.slice(0, 3).map(({ title }) => [title, language === 'km' ? ('សូមប្រាប់ខ្ញុំអំពី ' + title) : 'Tell me about ' + title]);
  if (bot.pricingPolicy === 'meeting') topics.push(language === 'km' ? ['តម្លៃ', 'តើតម្លៃប៉ុន្មាន?'] : ['Pricing', 'How much does it cost?']);
  return topics;
}

function buildChat(bot) {
  const chat = $('#chat-template').content.firstElementChild.cloneNode(true);
  const messages = $('.messages', chat);
  const form = $('.composer', chat);
  const input = $('#chat-input', chat);
  const send = $('.send', chat);
  const language = $('.language', chat);
  const prompts = $('.chat-suggestions', chat);
  let previous = null;
  let activeRequest = 0;
  let pending = false;
  let hasConversation = false;

  $('.chat-title', chat).textContent = bot.name;
  $('.chat-avatar', chat).textContent = initials(bot.name);
  $('.chat-footnote', chat).textContent = state.aiEnabled && state.modelProvider === 'openai'
    ? 'Some messages may be sent to OpenAI. Keep private information out of chat.'
    : 'Keep passwords and private records out of chat.';

  function append(role, text, actions = [], lang = '') {
    const row = element('div', 'message ' + role);
    if (role === 'assistant') row.append(element('span', 'avatar message-avatar', initials(bot.name)));
    const bubble = element('div', 'bubble');
    if (lang) bubble.lang = lang;
    bubble.append(element('p', 'message-text', text));
    if (actions.length) {
      const group = element('div', 'actions');
      for (const action of actions) {
        if (action.type === 'meeting') group.append(button(action.label, 'button action-button accent', () => showMeeting(bot, lang)));
        if (action.type === 'link') group.append(link(action.label, action.url, 'button action-button'));
      }
      bubble.append(group);
    }
    row.append(bubble);
    messages.append(row);
    messages.scrollTop = messages.scrollHeight;
    return row;
  }

  function updatePrompts() {
    const km = language.value === 'km';
    input.placeholder = km ? 'សរសេរសំណួររបស់អ្នក…' : 'Write a message…';
    send.textContent = km ? 'ផ្ញើ' : 'Send';
    prompts.replaceChildren(...suggestions(bot, km ? 'km' : 'en').slice(bot.slug === 'clickhr' ? 1 : 0).map(([label, message]) =>
      button(label, 'chip', () => submit(message))));
  }

  function reset() {
    activeRequest++;
    previous = null;
    pending = false;
    hasConversation = false;
    send.disabled = false;
    input.value = '';
    messages.replaceChildren();
    const km = language.value === 'km' && bot.welcomeKm;
    append('assistant', km ? bot.welcomeKm : bot.welcomeEn, [], km ? 'km' : 'en');
    updatePrompts();
  }

  async function submit(text) {
    const message = text.trim();
    if (!message || pending) return;
    const request = ++activeRequest;
    pending = true;
    hasConversation = true;
    send.disabled = true;
    input.value = '';
    append('visitor', message, [], /\p{Script=Khmer}/u.test(message) ? 'km' : 'en');
    const wait = append('assistant', language.value === 'km' ? 'កំពុងឆ្លើយ…' : 'Finding an answer…');
    try {
      const answer = await api(botApi(bot) + '/chat', 'POST', { message, language: language.value, previous });
      if (request !== activeRequest || !chat.isConnected) return;
      wait.remove();
      append('assistant', answer.text, answer.actions, answer.language);
      previous = { intent: answer.intent, topics: answer.topics, knowledgeIds: answer.knowledgeIds, platform: answer.platform };
    } catch (error) {
      if (request !== activeRequest || !chat.isConnected) return;
      wait.remove();
      append('assistant', error.message);
      if (!input.value) input.value = message;
    } finally {
      if (request === activeRequest) {
        pending = false;
        send.disabled = false;
      }
    }
  }

  $('.reset', chat).addEventListener('click', reset);
  language.addEventListener('change', () => {
    if (hasConversation) updatePrompts();
    else reset();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submit(input.value);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing || send.disabled) return;
    event.preventDefault();
    form.requestSubmit();
  });
  reset();
  return { chat, submit };
}

function playground(bot) {
  const content = workspaceFrame(bot);
  const hero = sectionHeading('Playground', 'Try the answers visitors will see in your company chat.');
  hero.classList.add('playground-hero');
  content.append(hero);
  const layout = element('div', 'playground-grid');
  const { chat, submit } = buildChat(bot);
  const panel = element('aside', 'playground-side');
  const tests = element('section', 'card quick-tests');
  tests.append(element('h2', '', 'Try a question'), element('p', 'muted', 'Pick a prompt to send it to the assistant.'));
  const options = suggestions(bot);
  options.forEach(([label, message]) => {
    const target = button('', 'test-option', () => submit(message));
    target.append(element('span', 'test-label', label), element('span', 'test-message', message));
    tests.append(target);
  });
  if (bot.slug === 'clickhr') {
    const [label, message] = khmerTests[3];
    const target = button('', 'test-option', () => submit(message));
    const title = element('span', 'test-label', label);
    title.lang = 'km';
    const phrase = element('span', 'test-message', message);
    phrase.lang = 'km';
    target.append(title, phrase);
    tests.append(target);
  }
  if (!options.length) tests.append(button('Add your first FAQ', 'button secondary', () => activate('setup')));
  const policy = element('section', 'card policy-card');
  policy.append(element('h2', '', 'Pricing policy'), element('p', '',
    bot.pricingPolicy === 'meeting' ? 'Pricing inquiries start with a kickoff. The company reviews requirements before sharing a quote.' : 'The assistant uses the company’s approved FAQs to answer pricing questions.'));
  policy.append(button('Manage bot', 'text-button', () => activate('setup')));
  panel.append(tests, policy);
  layout.append(chat, panel);
  content.append(layout);
}

function formField(label, name, value, options = {}) {
  const wrap = element('label', 'field');
  wrap.append(element('span', 'field-label', label));
  const control = element(options.multiline ? 'textarea' : 'input');
  if (!options.multiline) control.type = options.type || 'text';
  control.name = name;
  control.required = Boolean(options.required);
  if (options.max) control.maxLength = options.max;
  if (options.multiline) control.rows = options.rows || 3;
  if (options.placeholder) control.placeholder = options.placeholder;
  if (options.readOnly) control.readOnly = true;
  if (options.autocomplete) control.autocomplete = options.autocomplete;
  if (options.lang) control.lang = options.lang;
  control.value = value || '';
  wrap.append(control);
  return wrap;
}

function companySlug(name) {
  return name.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '').slice(0, 48).replace(/-$/u, '');
}

function setup(bot, creating) {
  const content = workspaceFrame(bot);
  content.append(sectionHeading(creating ? 'New company bot' : 'Bot setup',
    creating ? 'Add a company and give its assistant approved answers.' : 'Edit the company profile, approved answers, and how visitors reach your team.'));
  const config = creating ? {
    name: '', slug: '', summary: '', website: '', contactUrl: '', meetingUrl: '',
    meetingEnabled: false, pricingPolicy: 'faq', welcomeEn: '', welcomeKm: '', faqs: [],
  } : bot;

  const form = element('form', 'setup-form');
  const company = element('section', 'card editing-card');
  company.append(element('h2', '', 'Company profile'));
  const companyFields = element('div', 'field-grid');
  companyFields.append(
    formField('Company name', 'name', config.name, { required: true, max: 80 }),
    formField('Bot link slug', 'slug', config.slug, { required: true, max: 48, readOnly: !creating, placeholder: 'company-name' }),
    formField('Website', 'website', config.website, { type: 'url', max: 400, placeholder: 'https://example.com' }),
    formField('Description', 'summary', config.summary, { max: 180 }),
    formField('English greeting', 'welcomeEn', config.welcomeEn, { multiline: true, required: true, max: 400 }),
    formField('Khmer greeting', 'welcomeKm', config.welcomeKm, { multiline: true, max: 400, lang: 'km' }),
  );
  company.append(companyFields);
  form.append(company);
  const slug = $('[name=slug]', form);
  slug.pattern = '[a-z0-9]+(?:-[a-z0-9]+)*';
  if (creating) {
    let customSlug = false;
    let customGreeting = false;
    slug.addEventListener('input', () => { customSlug = Boolean(slug.value); });
    const greeting = $('[name=welcomeEn]', form);
    greeting.addEventListener('input', () => { customGreeting = Boolean(greeting.value); });
    $('[name=name]', form).addEventListener('input', (event) => {
      const name = event.target.value.trim();
      if (!customSlug) slug.value = companySlug(name);
      if (!customGreeting) greeting.value = name ? `Hi! I’m the ${name} assistant. How can I help?` : '';
    });
  }

  const handoff = element('section', 'card editing-card');
  handoff.append(element('h2', '', 'Pricing and handoff'));
  const handoffFields = element('div', 'field-grid');
  const policyWrap = element('label', 'field');
  policyWrap.append(element('span', 'field-label', 'Pricing policy'));
  const policy = element('select');
  policy.name = 'pricingPolicy';
  policy.append(new Option('Answer from approved FAQs', 'faq'), new Option('Quote after kickoff', 'meeting'));
  policy.value = config.pricingPolicy;
  policyWrap.append(policy);
  handoffFields.append(policyWrap,
    formField('Official booking link', 'meetingUrl', config.meetingUrl, { type: 'url', max: 400 }),
    formField('Company contact link', 'contactUrl', config.contactUrl, { type: 'url', max: 400 }));
  const meetingToggle = element('label', 'check-label');
  const meetingEnabled = element('input');
  meetingEnabled.type = 'checkbox';
  meetingEnabled.checked = config.meetingEnabled;
  meetingToggle.append(meetingEnabled, element('span', '', 'Accept kickoff requests in the Navi inbox'));
  handoff.append(handoffFields, meetingToggle);
  form.append(handoff);

  const knowledge = element('section', 'card editing-card');
  const knowledgeHeader = element('div', 'section-row');
  const knowledgeTitle = element('div');
  knowledgeTitle.append(element('h2', '', 'Approved answers'), element('p', 'muted', 'Add matching words or phrases in English and Khmer.'));
  const entries = element('div', 'faq-list');
  const addButton = button('Add FAQ', 'button secondary', () => createFaq());
  knowledgeHeader.append(knowledgeTitle, addButton);
  const empty = element('p', 'empty-faq', 'Add an FAQ to give your assistant its first answer.');
  knowledge.append(knowledgeHeader, empty, entries);
  form.append(knowledge);

  function updateFaqState() {
    empty.hidden = Boolean(entries.children.length);
    addButton.disabled = entries.children.length >= 30;
  }

  function createFaq(entry = null) {
    const box = element('details', 'faq-editor');
    box.dataset.id = entry?.id ?? 'faq-' + requestUuid().slice(0, 12);
    box.open = !entry;
    const title = element('summary', '', entry?.title || 'New FAQ');
    const fields = element('div', 'field-grid');
    fields.append(
      formField('FAQ title', 'title', entry?.title, { required: true, max: 100 }),
      formField('Matching phrases', 'tags', entry?.tags.join(', '), { max: 3000, placeholder: 'shipping, delivery, ដឹកជញ្ជូន' }),
      formField('English answer', 'en', entry?.en, { multiline: true, required: true, max: 1000 }),
      formField('Khmer answer', 'km', entry?.km, { multiline: true, max: 1000, lang: 'km' }),
      formField('Source link', 'url', entry?.url, { type: 'url', max: 400 }),
    );
    $('[name=title]', fields).addEventListener('input', (event) => { title.textContent = event.target.value || 'New FAQ'; });
    const remove = button('Remove FAQ', 'text-button danger', () => {
      box.remove();
      updateFaqState();
    });
    box.append(title, fields, remove);
    entries.append(box);
    updateFaqState();
  }

  config.faqs.forEach(createFaq);
  updateFaqState();
  form.addEventListener('invalid', (event) => {
    const collapsed = event.target.closest('details');
    if (collapsed) collapsed.open = true;
  }, true);

  const footer = element('div', 'form-footer');
  const save = element('button', 'button primary', creating ? 'Create company bot' : 'Save changes');
  save.type = 'submit';
  const feedback = element('p', 'form-feedback');
  feedback.setAttribute('role', 'status');
  footer.append(save, feedback);
  if (creating) footer.append(button('Cancel', 'button secondary', () => activate('playground')));
  form.append(footer);
  content.append(form);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    save.disabled = true;
    feedback.textContent = 'Saving…';
    feedback.classList.remove('error');
    const payload = Object.fromEntries(new FormData(form));
    payload.meetingEnabled = meetingEnabled.checked;
    payload.faqs = [...entries.children].map((node) => ({
      id: node.dataset.id,
      title: $('[name=title]', node).value,
      tags: $('[name=tags]', node).value.split(',').map((item) => item.trim()).filter(Boolean),
      en: $('[name=en]', node).value,
      km: $('[name=km]', node).value,
      url: $('[name=url]', node).value,
    }));
    for (const key of ['title', 'tags', 'en', 'km', 'url']) delete payload[key];
    try {
      const { bot: saved } = await api(creating ? '/api/admin/bots' : adminApi(bot), creating ? 'POST' : 'PUT', payload);
      if (creating) state.bots.push(saved);
      else state.bots = state.bots.map((item) => item.slug === saved.slug ? saved : item);
      if (!form.isConnected) return;
      state.slug = saved.slug;
      if (creating) activate('playground');
      else {
        refreshSidebar();
        $('.breadcrumb strong', main).textContent = saved.name;
        feedback.textContent = 'Changes saved.';
      }
    } catch (error) {
      feedback.textContent = error.message;
      feedback.classList.add('error');
    } finally {
      save.disabled = false;
    }
  });
}

const meetingText = {
  en: {
    title: 'Request a kickoff',
    help: 'Your details go to the company’s Navi inbox. The team can follow up to arrange a time.',
    name: 'Your name',
    email: 'Work email',
    company: 'Company',
    needs: 'What would you like to discuss?',
    placeholder: 'Team size, modules, or setup questions',
    consent: 'I agree to share this information with the company for follow-up.',
    cancel: 'Cancel',
    send: 'Send request',
    sending: 'Sending…',
    sent: 'Request saved',
    confirmation: 'Your request is in the Navi inbox. A meeting time still needs to be confirmed.',
    close: 'Done',
    official: 'Open official booking page',
  },
  km: {
    title: 'ស្នើសុំកិច្ចប្រជុំដំបូង',
    help: 'ព័ត៌មានរបស់អ្នកនឹងរក្សាទុកក្នុង Navi សម្រាប់ក្រុមហ៊ុនទាក់ទងមកអ្នក ដើម្បីកំណត់ពេលវេលា។',
    name: 'ឈ្មោះរបស់អ្នក',
    email: 'អ៊ីមែលការងារ',
    company: 'ក្រុមហ៊ុន',
    needs: 'តើអ្នកចង់ពិភាក្សាអំពីអ្វី?',
    placeholder: 'ចំនួនបុគ្គលិក ម៉ូឌុល ឬការដំឡើង',
    consent: 'ខ្ញុំយល់ព្រមចែករំលែកព័ត៌មាននេះជាមួយក្រុមហ៊ុន ដើម្បីទាក់ទងមកខ្ញុំ។',
    cancel: 'បោះបង់',
    send: 'ផ្ញើសំណើ',
    sending: 'កំពុងផ្ញើ…',
    sent: 'បានរក្សាទុកសំណើ',
    confirmation: 'សំណើរបស់អ្នកត្រូវបានរក្សាទុកក្នុង Navi។ ពេលវេលាប្រជុំនឹងត្រូវបញ្ជាក់ពេលក្រោយ។',
    close: 'រួចរាល់',
    official: 'បើកទំព័រកក់ផ្លូវការ',
  },
};

function showMeeting(bot, lang) {
  const text = meetingText[lang] ?? meetingText.en;
  const title = element('h2', '', text.title);
  title.id = 'meeting-title';
  const form = element('form', 'meeting-form');
  form.append(
    formField(text.name, 'name', '', { required: true, max: 100, autocomplete: 'name' }),
    formField(text.email, 'email', '', { type: 'email', required: true, max: 180, autocomplete: 'email' }),
    formField(text.company, 'company', '', { required: true, max: 120, autocomplete: 'organization' }),
    formField(text.needs, 'needs', '', { multiline: true, placeholder: text.placeholder, max: 850 }),
  );
  const consent = element('label', 'check-label');
  const checkbox = element('input');
  checkbox.name = 'consent';
  checkbox.type = 'checkbox';
  checkbox.required = true;
  consent.append(checkbox, element('span', '', text.consent));
  const controls = element('div', 'dialog-actions');
  const send = element('button', 'button primary', text.send);
  send.type = 'submit';
  const error = element('p', 'form-feedback error');
  error.setAttribute('role', 'alert');
  controls.append(button(text.cancel, 'button secondary', () => dialog.close()), send);
  form.append(consent, error, controls);
  dialog.lang = lang === 'km' ? 'km' : 'en';
  dialog.replaceChildren(title, element('p', 'muted', text.help), form);
  dialog.showModal();

  let requestId;
  let lastPayload;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    send.disabled = true;
    send.textContent = text.sending;
    error.textContent = '';
    const payload = Object.fromEntries(new FormData(form));
    payload.consent = checkbox.checked;
    const serialized = JSON.stringify(payload);
    if (serialized !== lastPayload) requestId = requestUuid();
    lastPayload = serialized;
    try {
      await api(botApi(bot) + '/leads', 'POST', { ...payload, requestId });
      if (!form.isConnected || !dialog.open) return;
      const resultTitle = element('h2', '', text.sent);
      resultTitle.id = 'meeting-title';
      const actions = element('div', 'dialog-actions');
      if (bot.meetingUrl) actions.append(link(text.official, bot.meetingUrl, 'button secondary'));
      actions.append(button(text.close, 'button primary', () => dialog.close()));
      dialog.replaceChildren(resultTitle, element('p', 'muted', text.confirmation), actions);
      actions.lastElementChild.focus();
    } catch (failure) {
      error.textContent = failure.message;
    } finally {
      send.textContent = text.send;
      send.disabled = false;
    }
  });
}

function meetingInbox(bot, version) {
  const content = workspaceFrame(bot);
  content.append(sectionHeading('Meeting requests', 'Review inquiries submitted through this company’s assistant.'));
  const card = element('section', 'card editing-card inbox');
  const live = element('p', 'muted', 'Loading requests…');
  live.setAttribute('role', 'status');
  const list = element('div', 'request-list');
  card.append(live, list);
  content.append(card);

  async function loadRequests() {
    try {
      const { leads } = await api(adminApi(bot) + '/leads');
      if (version !== renderVersion) return;
      live.textContent = leads.length ? `${leads.length} most recent ${leads.length === 1 ? 'request' : 'requests'}` : 'New kickoff requests will appear here.';
      list.replaceChildren();
      for (const lead of leads) {
        const row = element('article', 'request');
        const head = element('div', 'section-row');
        const identity = element('div');
        const email = element('a', 'email-link', lead.email);
        email.href = 'mailto:' + encodeURIComponent(lead.email);
        identity.append(element('h2', '', lead.company), element('p', '', lead.name), email);
        const status = element('span', 'request-status ' + lead.status, lead.status === 'new' ? 'New' : 'Reviewed');
        head.append(identity, status);
        row.append(head);
        if (lead.needs) row.append(element('p', 'request-needs', lead.needs));
        const footer = element('div', 'section-row request-footer');
        const date = element('time', 'muted', new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lead.created_at)));
        date.dateTime = lead.created_at;
        const update = button(lead.status === 'new' ? 'Mark reviewed' : 'Mark as new', 'button secondary', async () => {
          update.disabled = true;
          try {
            await api(adminApi(bot) + '/leads/' + lead.id, 'PATCH', { status: lead.status === 'new' ? 'reviewed' : 'new' });
            await loadRequests();
          } catch (error) {
            live.textContent = error.message;
          } finally {
            update.disabled = false;
          }
        });
        footer.append(date, update);
        row.append(footer);
        list.append(row);
      }
    } catch (error) {
      if (version === renderVersion) live.textContent = error.message;
    }
  }
  loadRequests();
}

function shareBot(bot) {
  const content = workspaceFrame(bot);
  content.append(sectionHeading('Share bot', 'Send visitors to a chat page or embed the assistant on a company website.'));
  const chatUrl = new URL(botUrl(bot), location.origin).href;
  const embedded = new URL(embedUrl(bot), location.origin).href;
  const iframe = `<iframe src="${embedded}" title="Company assistant" width="420" height="620" style="border:0;max-width:100%" loading="lazy"></iframe>`;
  const card = element('section', 'card editing-card share-card');
  const feedback = element('p', 'form-feedback');
  feedback.setAttribute('role', 'status');
  for (const [label, name, value, multiline] of [
    ['Visitor chat link', 'chat-url', chatUrl, false],
    ['Website embed code', 'embed-code', iframe, true],
  ]) {
    const row = element('div', 'share-row');
    const field = formField(label, name, value, { readOnly: true, multiline, rows: 3 });
    const copy = button('Copy', 'button secondary', async () => {
      try {
        await navigator.clipboard.writeText(value);
        feedback.textContent = 'Copied.';
      } catch {
        const control = $('input, textarea', field);
        control.focus();
        control.select();
        feedback.textContent = 'Selected. Copy it with your keyboard.';
      }
    });
    row.append(field, copy);
    card.append(row);
  }
  if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
    card.append(element('p', 'muted', 'This address works on your computer. Use a hosted Navi address for customer access.'));
  }
  card.append(feedback);
  content.append(card);
}

function refreshSidebar() {
  const bot = currentBot();
  picker.replaceChildren(...state.bots.map((item) => new Option(item.name, item.slug)));
  picker.value = state.slug;
  $('#company-initials').textContent = initials(bot.name);
  const mode = $('#mode');
  mode.textContent = state.aiEnabled ? (state.modelProvider === 'ollama' ? 'Local model routing enabled' : 'OpenAI routing enabled') : 'FAQ mode';
  $('#sign-out').hidden = !state.passwordRequired;
  for (const item of $('#navigation').querySelectorAll('button')) {
    if (item.dataset.view === state.view) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  }
}

function render() {
  const version = ++renderVersion;
  const bot = currentBot();
  sidebar.hidden = false;
  refreshSidebar();
  if (state.view === 'setup' || state.view === 'new') setup(bot, state.view === 'new');
  else if (state.view === 'leads') meetingInbox(bot, version);
  else if (state.view === 'share') shareBot(bot);
  else playground(bot);
  window.scrollTo(0, 0);
}

function statusPage(title, message) {
  main.className = 'main centered';
  const card = element('div', 'card access-card');
  card.append(element('h1', '', title), element('p', 'muted', message));
  main.replaceChildren(card);
  return card;
}

function login() {
  sidebar.hidden = true;
  const card = statusPage('Sign in to Navi', 'Enter the workspace password to manage company assistants.');
  const form = element('form', 'meeting-form');
  const feedback = element('p', 'form-feedback error');
  feedback.setAttribute('role', 'alert');
  const submit = element('button', 'button primary', 'Sign in');
  submit.type = 'submit';
  form.append(formField('Password', 'password', '', { required: true, type: 'password', autocomplete: 'current-password' }), submit, feedback);
  card.append(form);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    feedback.textContent = '';
    try {
      await api('/api/admin/session', 'POST', Object.fromEntries(new FormData(form)));
      await loadWorkspace();
    } catch (error) {
      feedback.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });
}

async function loadWorkspace() {
  const session = await api('/api/admin/session');
  state.passwordRequired = session.passwordRequired;
  if (!session.authenticated) return login();
  const { bots, aiEnabled, modelProvider } = await api('/api/admin/bots');
  state.bots = bots;
  state.aiEnabled = aiEnabled;
  state.modelProvider = modelProvider;
  state.slug = currentBot()?.slug || 'clickhr';
  main.className = 'main';
  render();
}

picker.addEventListener('change', () => {
  state.slug = picker.value;
  activate('playground');
});
$('#navigation').addEventListener('click', (event) => {
  const target = event.target.closest('button[data-view]');
  if (target) activate(target.dataset.view);
});
$('#create-bot').addEventListener('click', () => activate('new'));
$('#sign-out').addEventListener('click', async () => {
  try {
    await api('/api/admin/session', 'POST', { action: 'logout' });
    state.bots = [];
    state.view = 'playground';
    if (dialog.open) dialog.close();
    login();
  } catch (error) {
    $('#mode').textContent = error.message;
  }
});

async function start() {
  try {
    if (!page) return await loadWorkspace();
    const [, kind, slug] = page;
    const { bot, aiEnabled, modelProvider } = await api('/api/bots/' + slug);
    state.aiEnabled = aiEnabled;
    state.modelProvider = modelProvider;
    document.title = bot.name + ' · Company assistant';
    main.classList.add('public-page', kind === 'embed' ? 'embed' : 'visitor-page');
    const { chat } = buildChat(bot);
    if (kind === 'embed') main.replaceChildren(chat);
    else {
      const header = sectionHeading(bot.name, bot.summary);
      header.classList.add('public-header');
      if (bot.website) header.append(link('Company website', bot.website, 'text-button'));
      main.replaceChildren(header, chat);
    }
  } catch (error) {
    statusPage(page ? 'Chat unavailable' : 'Workspace unavailable', error.message);
  }
}

start();
