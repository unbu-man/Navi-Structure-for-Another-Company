const khmer = /\p{Script=Khmer}/u;
const clickHrAppListing = 'https://apps.apple.com/kh/app/clickhr/id6499134021';
const romanKhmerPrice = ['tamlai', 'tomlai', 'domlai', 'tomlei', 'thlai ponman', 'kit loy'];
const priceTerms = [
  'price', 'pricing', 'cost', 'costs', 'quote', 'quotation', 'rate card', 'rates', 'rate for', 'subscription', 'license fee', 'fees',
  'fee', 'discount', 'budget', 'how much', 'per employee', 'per user', 'per seat', 'monthly plan',
  'annual plan', 'free trial', 'how expensive', 'how affordable', 'is it free', 'is click hr free', 'is clickhr free', 'estimated amount', 'ballpark', 'what do you charge', 'how do you charge', 'what would you charge', 'what will you charge', 'តម្លៃ', 'តំលៃ', 'ថ្លៃ', 'សម្រង់តម្លៃ', 'ប៉ុន្មានក្នុងមួយខែ', 'គិតលុយ',
];
const meetingTerms = [
  'demo', 'kickoff', 'kick off', 'schedule a call', 'book a call', 'talk to sales', 'appointment',
  'consultation', 'meeting', 'product tour', 'schedule a walkthrough', 'book a walkthrough', 'ប្រជុំ', 'ណាត់ជួប', 'បង្ហាញប្រព័ន្ធ', 'ជួបពិភាក្សា',
];
const contactTerms = ['contact', 'support', 'human', 'email', 'phone number', 'talk to someone', 'ទំនាក់ទំនង', 'ជំនួយផ្ទាល់'];
const clickHrQuestionAliases = {
  attendance: ['punch in', 'punch out', 'កាលវិភាគធ្វើការ'],
  leave: ['som chbab chhop', 'som chbab chop somrak'],
  payroll: ['bunhchi prak kha'],
};
const clearOutOfScope = [
  'i go to school', 'i go to schol', 'i am going to school', 'ខ្ញុំទៅសាលា',
  'buy bitcoin', 'sell bitcoin', 'bitcoin price', 'price of bitcoin',
];
const requiresDetails = /^(?:it (?:doesn t|does not|won t) work|not working|help|can you help(?: me)?|how do i do (?:this|it)|it (?:failed|is broken)|(?:(?:my|the) )?(?:screen|page|app) (?:won t load|doesn t load|will not load)|វាមិនដំណើរការ|ជួយខ្ញុំ|សូមជួយ)$/u;


function normalize(text) {
  return text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim();
}

function includesTerm(normalized, term) {
  const target = normalize(term);
  if (!target) return false;
  if (khmer.test(target)) return normalized.replaceAll(' ', '').includes(target.replaceAll(' ', ''));
  return ` ${normalized} `.includes(` ${target} `);
}

function matches(normalized, terms) {
  return terms.some((term) => includesTerm(normalized, term));
}

function findFaqs(message, bot) {
  return bot.faqs.map((faq) => {
    const aliases = bot.slug === 'clickhr' ? clickHrQuestionAliases[faq.id] ?? [] : [];
    const matched = [...new Set([...faq.tags, faq.title, ...aliases])].filter((term) => includesTerm(message, term));
    const strongest = Math.max(0, ...matched.map((term) => (term.includes(' ') || khmer.test(term) ? 3 : 2)));
    const score = strongest + Math.min(Math.max(matched.length - 1, 0), 2);
    return { faq, score };
  }).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score);
}

const replyCopy = {
  en: {
    schedule: 'Request a kickoff',
    booking: 'Open booking page',
    contact: 'Contact the team',
    source: 'View source',
    price: (name) => `${name} prepares a quote after a kickoff meeting. The team will review your requirements first, including the team size, the features you need, and any setup or integrations. Would you like to request a kickoff?`,
    meeting: (name) => `You can request a kickoff or product demo with ${name}. Share your company, a work email, and what you’d like to discuss so the team can follow up.`,
    bookingOnly: (name) => `Use the link below to ask ${name} about arranging a kickoff or product demo.`,
    contactOnly: (name) => `Use the link below to contact ${name} directly.`,
    outOfScope: (name) => `I can help with questions about ${name}. What would you like to know about it?`,
    clarification: (name) => `Which ${name} feature are you asking about, and what are you trying to do?`,
    unverified: 'I don’t have verified information for that specific question. The support team can help confirm it.',
    unknown: 'I don’t have a verified answer to that yet. Could you tell me a little more about what you need?',
    leaveBalance: 'To check your balance, sign in to the Click HR mobile app. From the home screen, open Leave and look for AL (Annual Leave). If the balance is missing or looks wrong, ask your company’s HR team to check it.',
    mobileGuide: 'View app screenshots',
    account: 'For account issues or personal records, contact your company administrator or the support team. Please keep passwords and private records out of this chat.',
    thanks: 'You’re welcome! Is there anything else I can help you with?',
  },
  km: {
    schedule: 'ស្នើសុំកិច្ចប្រជុំ',
    booking: 'បើកទំព័រកក់ Demo',
    contact: 'ទាក់ទងក្រុមការងារ',
    source: 'មើលប្រភព',
    price: (name) => `${name} នឹងផ្ដល់សម្រង់តម្លៃបន្ទាប់ពីកិច្ចប្រជុំដំបូង។ ក្រុមការងារនឹងពិភាក្សាពីតម្រូវការរបស់អ្នកជាមុន ដូចជាចំនួនបុគ្គលិក មុខងារដែលអ្នកត្រូវការ ការដំឡើង និងការតភ្ជាប់ជាមួយប្រព័ន្ធផ្សេងៗ។ តើអ្នកចង់ស្នើសុំកិច្ចប្រជុំដំបូងដែរឬទេ?`,
    meeting: (name) => `អ្នកអាចស្នើសុំកិច្ចប្រជុំដំបូង ឬការបង្ហាញផលិតផលជាមួយ ${name}។ សូមផ្ដល់ឈ្មោះក្រុមហ៊ុន អ៊ីមែលការងារ និងប្រធានបទដែលអ្នកចង់ពិភាក្សា ដើម្បីឱ្យក្រុមការងារទាក់ទងទៅអ្នក។`,
    bookingOnly: (name) => `សូមប្រើតំណខាងក្រោម ដើម្បីទាក់ទង ${name} អំពីកិច្ចប្រជុំដំបូង ឬការបង្ហាញផលិតផល។`,
    contactOnly: (name) => `សូមប្រើតំណខាងក្រោម ដើម្បីទាក់ទង ${name} ដោយផ្ទាល់។`,
    outOfScope: (name) => `ខ្ញុំអាចជួយឆ្លើយសំណួរអំពី ${name}។ តើអ្នកចង់ដឹងអ្វីអំពីប្រព័ន្ធនេះ?`,
    clarification: (name) => `តើអ្នកកំពុងសួរអំពីមុខងារណាមួយរបស់ ${name} ហើយចង់ធ្វើអ្វី?`,
    unverified: 'ខ្ញុំមិនទាន់មានព័ត៌មានដែលបានផ្ទៀងផ្ទាត់សម្រាប់សំណួរជាក់លាក់នេះទេ។ សូមទាក់ទងក្រុមជំនួយដើម្បីបញ្ជាក់។',
    unknown: 'ខ្ញុំមិនទាន់មានចម្លើយដែលបានផ្ទៀងផ្ទាត់សម្រាប់សំណួរនេះទេ។ តើអ្នកអាចប្រាប់បន្ថែមអំពីតម្រូវការរបស់អ្នកបានទេ?',
    leaveBalance: 'ដើម្បីពិនិត្យចំនួនថ្ងៃឈប់សម្រាកដែលនៅសល់ សូមចូលគណនីក្នុងកម្មវិធី Click HR។ នៅទំព័រដើម សូមបើក Leave (ការឈប់សម្រាក) ហើយរកមើល AL (ការឈប់សម្រាកប្រចាំឆ្នាំ)។ បើមិនឃើញចំនួនថ្ងៃ ឬឃើញថាចំនួនថ្ងៃមិនត្រឹមត្រូវ សូមស្នើឱ្យក្រុមធនធានមនុស្សរបស់ក្រុមហ៊ុនអ្នកពិនិត្យ។',
    mobileGuide: 'មើលរូបភាពនៃកម្មវិធី',
    account: 'សម្រាប់បញ្ហាគណនី ឬទិន្នន័យផ្ទាល់ខ្លួន សូមទាក់ទងអ្នកគ្រប់គ្រងក្រុមហ៊ុនរបស់អ្នក ឬផ្នែកជំនួយ។ សូមកុំផ្ញើពាក្យសម្ងាត់ ឬឯកសារឯកជនក្នុងការជជែកនេះ។',
    thanks: 'មិនអីទេ! តើមានអ្វីផ្សេងទៀតដែលខ្ញុំអាចជួយបានទេ?',
  },
};

export function publicBot(bot) {
  return {
    slug: bot.slug,
    name: bot.name,
    summary: bot.summary,
    website: bot.website,
    welcomeEn: bot.welcomeEn,
    welcomeKm: bot.welcomeKm,
    meetingEnabled: bot.meetingEnabled,
    meetingUrl: bot.meetingUrl,
    contactUrl: bot.contactUrl,
    pricingPolicy: bot.pricingPolicy,
    topics: bot.faqs.slice(0, 6).map(({ id, title }) => ({ id, title })),
  };
}

export async function replyTo(bot, { message, language, previous }, classify) {
  const query = normalize(message);
  const romanPricing = matches(query, romanKhmerPrice);
  const isKhmer = language === 'km' || (language !== 'en' && (khmer.test(message) || romanPricing));
  const lang = isKhmer ? 'km' : 'en';
  const copy = replyCopy[lang];
  const meetingAvailable = bot.meetingEnabled || bot.meetingUrl || bot.contactUrl;
  const handoff = [];
  if (bot.meetingEnabled) handoff.push({ type: 'meeting', label: copy.schedule });
  if (bot.meetingUrl) handoff.push({ type: 'link', label: copy.booking, url: bot.meetingUrl });
  if (bot.contactUrl && !bot.meetingUrl && !bot.meetingEnabled) {
    handoff.push({ type: 'link', label: copy.contact, url: bot.contactUrl });
  }
  const contact = bot.contactUrl ? [{ type: 'link', label: copy.contact, url: bot.contactUrl }] : handoff;
  const result = (intent, text, actions = [], topics = [], mode = 'local') => ({ intent, text, actions, topics, language: lang, mode });
  const fallback = (reason, text, actions = []) => ({ ...result('unknown', text, actions), reason });
  const meeting = (mode) => result('meeting', bot.meetingEnabled ? copy.meeting(bot.name) : copy.bookingOnly(bot.name), handoff, [], mode);
  const pricing = (mode) => result('pricing', copy.price(bot.name), handoff, [], mode);
  const answer = (entries, mode) => {
    const actions = Array.from(new Set(entries.map(({ url }) => url).filter(Boolean))).map((url) => {
      const entry = entries.find((faq) => faq.url === url);
      return { type: 'link', label: entries.length === 1 ? copy.source : entry.title, url };
    });
    return result('faq', entries.map((entry) => (isKhmer && entry.km) || entry.en).join('\n\n'), actions, entries.map(({ id }) => id), mode);
  };

  const isClickHr = bot.slug === 'clickhr';
  const asksOwnLeaveBalance = /\b(?:my|our) (?:own )?(?:annual )?leave balance\b/u.test(query) ||
    /\b(?:leave|pto|vacation time|vacation days) (?:do i have left|have i used|do i have remaining)\b/u.test(query) ||
    matches(query, ['ថ្ងៃឈប់សម្រាកនៅសល់', 'ថ្ងៃឈប់សម្រាកប្រចាំឆ្នាំនៅសល់', 'ថ្ងៃឈប់សម្រាកប្រចាំឆ្នាំរបស់ខ្ញុំនៅសល់']);
  const asksHowToViewLeaveBalance = /\b(?:check|view|see|find) (?:the |my |your )?(?:annual )?leave balance\b/u.test(query) ||
    matches(query, ['មើលចំនួនថ្ងៃឈប់សម្រាក', 'ពិនិត្យចំនួនថ្ងៃឈប់សម្រាក']) ||
    (includesTerm(query, 'leave balance') && matches(query, ['មើល', 'ពិនិត្យ', 'នៅឯណា']));
  if (isClickHr && (asksOwnLeaveBalance || asksHowToViewLeaveBalance)) {
    return result('account', copy.leaveBalance, [
      { type: 'link', label: copy.mobileGuide, url: clickHrAppListing },
    ]);
  }
  if (asksOwnLeaveBalance ||
      /\b(?:my|our) (?:own )?(?:salary|payslip|password|login|account|payroll data|overtime)\b/u.test(query) ||
      /\b(?:overtime|hours) (?:did i work|have i worked|did i log)\b/u.test(query) ||
      matches(query, ['reset password', 'forgot password', 'salary of', 'password reset', 'ភ្លេចពាក្យសម្ងាត់',
        'ប្រាក់ខែរបស់ខ្ញុំ', 'ម៉ោងបន្ថែមរបស់ខ្ញុំ', 'bangkan dai prak kha robos knhom'])) {
    return result('account', copy.account, contact);
  }
  const mentionsBot = includesTerm(query, bot.name) || (isClickHr && includesTerm(query, 'clickhr'));
  if (isClickHr && !mentionsBot && matches(query, clearOutOfScope)) {
    return fallback('out_of_scope', copy.outOfScope(bot.name));
  }
  if (requiresDetails.test(query)) return fallback('needs_clarification', copy.clarification(bot.name));

  const quotedMoney = /[$€£៛]/u.test(message) || /\b(?:usd|riel|khr|dollars?|bucks)\b/u.test(query);
  const asksPrice = matches(query, priceTerms) || romanPricing || quotedMoney;
  if (bot.pricingPolicy === 'meeting' && asksPrice) return pricing();
  if (meetingAvailable && matches(query, meetingTerms)) return meeting();
  const headcount = /^(?:(?:and|what about|for|and for|ចុះបើ) )?\p{N}+ (?:people|staff|employees|users|នាក់|បុគ្គលិក)$/u;
  if (bot.pricingPolicy === 'meeting' && previous?.intent === 'pricing' &&
      (headcount.test(query) || matches(query, ['just an estimate', 'cheaper', 'ប៉ាន់ស្មាន'])) &&
      !matches(query, ['does', 'support', 'how does', 'អាច', 'គាំទ្រ'])) return pricing();

  if (/^(?:hi|hello|hey|good morning|good afternoon|សួស្តី|សួស្ដី)$/u.test(query)) {
    return result('welcome', (isKhmer && bot.welcomeKm) || bot.welcomeEn);
  }
  if (/^(?:thanks|thank you|thanks a lot|អរគុណ|អរគុណច្រើន)$/u.test(query)) return result('thanks', copy.thanks);

  const ranked = findFaqs(query, bot);
  const specific = ranked.filter(({ faq }) => faq.id !== 'overview' && faq.id !== 'contact');
  const asksUnverifiedDetail = bot.slug === 'clickhr' && matches(query, [
    'api', 'integrate with', 'integrates with', 'integrations', 'sap', 'quickbooks', 'xero', 'odoo',
    'implementation timeline', 'service level', 'security certification', 'iso 27001', 'custom integration',
    'compatible with', 'fingerprint device model', 'specific fingerprint device', 'this fingerprint device', 'ឧបករណ៍ស្កេនម្រាមដៃម៉ូដែល', 'uptime', 'which admins', 'which roles', 'who has access',
    'តភ្ជាប់ជាមួយ', 'រយៈពេលដំឡើង', 'សិទ្ធិអ្វី', 'អ្នកណាមានសិទ្ធិ',
  ]) && !matches(query, ['nssf integration', 'integrate with nssf', 'integration with nssf']);
  if (asksUnverifiedDetail) return fallback('missing_information', copy.unverified, contact);
  const asksHuman = matches(query, contactTerms) &&
    (!specific.length || matches(query, ['who can i contact', 'talk to someone', 'talk to a human', 'customer support']));

  if (asksHuman && !ranked.some(({ faq }) => faq.id === 'contact') && contact.length) {
    return result('contact', copy.contactOnly(bot.name), contact);
  }
  if (ranked.length) {
    const pool = specific.length ? specific : ranked;
    const multiTopic = /\b(?:and|plus|both|also)\b|[&,]|និង/u.test(message);
    const max = multiTopic ? 3 : 1;
    return answer(pool.slice(0, max).filter(({ score }) => score >= pool[0].score - 2).map(({ faq }) => faq));
  }

  if (query === normalize(bot.name)) {
    const overview = bot.faqs.find(({ id }) => id === 'overview');
    if (overview) return answer([overview]);
  }

  if ((query === 'tell me more' || query === 'more details' || query === 'ព័ត៌មានបន្ថែម') && previous?.topics) {
    const last = bot.faqs.filter(({ id }) => previous.topics.includes(id));
    if (last.length) return answer(last);
  }

  if (classify) {
    const decision = await classify({ bot, message });
    if (decision?.route === 'pricing' && bot.pricingPolicy === 'meeting') return pricing('ai');
    if (decision?.route === 'meeting' && meetingAvailable) return meeting('ai');
    if (decision?.route === 'contact' && contact.length) return result('contact', copy.contactOnly(bot.name), contact, [], 'ai');
    if (decision?.route === 'faq' && Array.isArray(decision.topics)) {
      const resolved = [...new Set(decision.topics)].map((id) => bot.faqs.find((faq) => faq.id === id)).filter(Boolean);
      if (resolved.length) return answer(resolved, 'ai');
    }
  }

  if (mentionsBot) return fallback('missing_information', copy.unverified, contact);
  return result('unknown', copy.unknown, contact);
}

export { openAiRouter } from './model-router.mjs';
