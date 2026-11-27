export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class InputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function field(value, label, max, required = false) {
  if (value == null && !required) return '';
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) {
    throw new InputError(`${label} must contain ${required ? '1 to ' : 'at most '}${max} characters.`);
  }
  return value.trim();
}

function website(value, label) {
  const url = field(value, label, 400);
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) return parsed.href;
  } catch {
    // Invalid URLs get the same validation message as disallowed schemes.
  }
  throw new InputError(`${label} must be an HTTPS URL.`);
}

export function validateBot(body, slug) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('Expected a bot configuration.');
  if (typeof slug !== 'string' || slug.length > 48 || !slugPattern.test(slug)) {
    throw new InputError('Use a URL slug with lowercase letters, numbers and hyphens.');
  }
  const faqs = body.faqs ?? [];
  if (!Array.isArray(faqs) || faqs.length > 30) throw new InputError('Use up to 30 FAQs.');
  if (typeof body.meetingEnabled !== 'boolean') throw new InputError('Select whether to accept meeting requests.');
  if (!['meeting', 'faq'].includes(body.pricingPolicy)) throw new InputError('Select a pricing policy.');
  const meetingUrl = website(body.meetingUrl, 'Meeting link');
  const contactUrl = website(body.contactUrl, 'Contact link');
  if (body.pricingPolicy === 'meeting' && !body.meetingEnabled && !meetingUrl && !contactUrl) {
    throw new InputError('Add a meeting or contact link, or enable the meeting request form.');
  }
  const ids = new Set();
  return {
    slug,
    name: field(body.name, 'Company name', 80, true),
    summary: field(body.summary, 'Description', 180),
    website: website(body.website, 'Website'),
    contactUrl,
    meetingUrl,
    meetingEnabled: body.meetingEnabled,
    pricingPolicy: body.pricingPolicy,
    welcomeEn: field(body.welcomeEn, 'English greeting', 400, true),
    welcomeKm: field(body.welcomeKm, 'Khmer greeting', 400),
    faqs: faqs.map((entry) => {
      const id = field(entry?.id, 'FAQ identifier', 48, true);
      if (!slugPattern.test(id) || ids.has(id)) throw new InputError('Each FAQ needs a unique identifier.');
      ids.add(id);
      if (!Array.isArray(entry.tags) || entry.tags.length > 30) throw new InputError('Use up to 30 matching phrases per FAQ.');
      return {
        id, title: field(entry.title, 'FAQ title', 100, true),
        tags: entry.tags.map((tag) => field(tag, 'Matching phrase', 100, true)),
        en: field(entry.en, 'English answer', 1000, true),
        km: field(entry.km, 'Khmer answer', 1000),
        url: website(entry.url, 'FAQ source link'),
      };
    }),
  };
}

export function validateLead(body) {
  if (body?.consent !== true) throw new InputError('Consent is required to save a meeting request.');
  const email = field(body.email, 'Work email', 180, true);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) throw new InputError('Enter a valid email address.');
  const requestId = field(body.requestId, 'Request identifier', 36, true);
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(requestId)) throw new InputError('Invalid request identifier.');
  return {
    requestId,
    name: field(body.name, 'Your name', 100, true),
    email,
    company: field(body.company, 'Company', 120, true),
    needs: field(body.needs, 'What you need', 850),
  };
}
