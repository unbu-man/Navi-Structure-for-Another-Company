import { readFile } from 'node:fs/promises';
import { configuredRouter } from '../src/model-router.mjs';
import { replyTo } from '../src/reply.mjs';
import { clickhr } from '../src/seed.mjs';

const cases = JSON.parse(await readFile(new URL('./clickhr-cases.json', import.meta.url), 'utf8'));
const { classify, modelProvider } = configuredRouter();
let providerCalls = 0;
let providerFailures = 0;
const router = classify && (async (request) => {
  providerCalls++;
  const result = await classify(request);
  if (result === null) providerFailures++;
  return result;
});

const groups = new Map();
const misses = [];
for (const item of cases) {
  const { intent, topics, language, actions } = await replyTo(clickhr, {
    message: item.question, language: 'auto', previous: item.previous,
  }, router);
  const routingCorrect = intent === item.intent && (!item.topic || topics.includes(item.topic));
  const languageCorrect = !item.language || language === item.language;
  const kickoffCorrect = item.intent !== 'pricing' || intent === 'pricing' &&
    actions.some((action) => action.type === 'meeting');
  const score = groups.get(item.group) ?? { passed: 0, total: 0 };
  score.total++;
  if (routingCorrect && languageCorrect && kickoffCorrect) {
    score.passed++;
  } else {
    misses.push({
      id: item.id, question: item.question, expected: item.intent + (item.topic ? '/' + item.topic : ''),
      actual: intent + (topics.length ? '/' + topics.join(',') : ''), expectedLanguage: item.language ?? null,
      actualLanguage: language, kickoffCorrect,
    });
  }
  groups.set(item.group, score);
}
console.log(JSON.stringify({
  provider: modelProvider,
  ...(modelProvider === 'ollama' ? { model: process.env.NAVI_OLLAMA_MODEL || 'gemma3:4b' } : {}),
  passed: cases.length - misses.length,
  total: cases.length,
  providerCalls,
  providerFailures,
  groups: Object.fromEntries(groups),
  misses,
}, null, 2));
if (providerFailures > 0) process.exitCode = 1;
