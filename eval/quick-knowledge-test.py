"""Exercise the free Click HR HTTP API and optionally probe a knowledge CSV."""

import argparse
import csv
import json
import re
import subprocess
import unicodedata
from collections import Counter
from dataclasses import dataclass
from math import sqrt
from pathlib import Path


@dataclass(frozen=True)
class Case:
    question: str
    intent: str
    language: str = 'en'
    topic: str = ''
    reason: str = ''
    contains: tuple[str, ...] = ()
    action: str = ''
    row: str = ''


CASES = (
    Case('Does payroll handle NSSF and electronic tax filing?', 'faq', topic='payroll',
         contains=('nssf', 'tax e-filing'), row='payroll-nssf-tax'),
    Case('Click HR ផ្ញើ daily attendance report តាម Telegram បានទេ?', 'faq', 'km',
         topic='attendance', contains=('telegram',), row='daily-attendance-reports'),
    Case('How do I request leave on my iPhone?', 'faq', topic='leave',
         contains=('create new leave',), row='mobile-leave-request'),
    Case('How much annual leave do I have left?', 'account', topic='leave-balance',
         contains=('open leave', 'al (annual leave)'), row='mobile-leave-balance'),
    Case('Click HR តម្លៃប៉ុន្មាន for 80 employees?', 'pricing', 'km',
         contains=('កិច្ចប្រជុំ',), action='meeting'),
    Case('Where is the overtime request menu?', 'unknown', reason='missing_information',
         action='link', row='mobile-overtime-menu'),
    Case('Can Click HR connect to QuickBooks?', 'unknown', reason='missing_information',
         action='link', row='custom-integration'),
    Case('I go to schol', 'unknown', reason='out_of_scope'),
    Case("It doesn't work", 'unknown', reason='needs_clarification'),
    Case('Can staff retrieve their wage slips on a smartphone?', 'faq', topic='mobile',
         contains=('payslip',), row='mobile-payslip'),
)

REQUESTS = '''
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { createNavi } from './src/server.mjs';

const { questions, url } = JSON.parse(readFileSync(0, 'utf8'));
const server = url ? null : createNavi();
try {
  if (server) {
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
  }
  const base = url || `http://127.0.0.1:${server.address().port}`;
  const replies = [];
  for (const message of questions) {
    const response = await fetch(new URL('/api/bots/clickhr/chat', base), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, language: 'auto' }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`Navi returned HTTP ${response.status}`);
    replies.push(await response.json());
  }
  console.log(JSON.stringify(replies));
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
}
'''


def matches(case, reply):
    actions = {item['type'] for item in reply['actions']}
    checks = {
        'route': reply['intent'] == case.intent,
        'language': reply['language'] == case.language,
        'topic': not case.topic or case.topic in reply['topics'],
        'reason': reply.get('reason', '') == case.reason,
        'answer details': all(term in reply['text'].casefold() for term in case.contains),
        'action': case.action in actions if case.action else 'meeting' not in actions,
    }
    if case.intent == 'pricing':
        checks['no quoted amount'] = not re.search(
            r'[$€£៛]\s*\d|\d[\d,.]*\s*(?:[$€£៛]|usd\b|khr\b|dollars?\b|riels?\b)',
            reply['text'], re.IGNORECASE,
        )
    return [name for name, passed in checks.items() if not passed]


STOP_WORDS = set('a an and are can click hr clickhr do does for how i in is it my on or the their to where with'.split())


def features(text):
    text = unicodedata.normalize('NFKC', text).casefold()
    words = re.findall(r'[a-z0-9]+|[\u1780-\u17ff]+', text)
    counts = Counter()
    for word in words:
        if word in STOP_WORDS:
            continue
        if word.isascii():
            counts[word.removesuffix('s')] += 2
        counts.update('~' + word[i:i + 3] for i in range(len(word) - 2))
    return counts


def closest(question, rows):
    query = features(question)
    best_row, best_score = None, 0
    for row in rows:
        score = 0
        for language in ('en', 'km'):
            candidate = features(row[f'question_{language}'])
            if candidate:
                overlap = sum(weight * candidate[term] for term, weight in query.items())
                score = max(score, overlap / sqrt(sum(weight ** 2 for weight in candidate.values())))
        if score > best_score:
            best_row, best_score = row, score
    return best_row


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--csv', type=Path, help='Optional Navi-Click-HR-Public-Knowledge.csv')
    parser.add_argument('--query', help='Send one query instead of the ten labeled checks')
    parser.add_argument('--url', help='Use a running Navi server instead of a temporary free server')
    args = parser.parse_args()
    try:
        rows = []
        if args.csv:
            with args.csv.open(encoding='utf-8-sig', newline='') as file:
                reader = csv.DictReader(file)
                required = {'id', 'question_en', 'question_km', 'answer_en', 'answer_km', 'review_status', 'source_url'}
                if not required.issubset(reader.fieldnames or []):
                    parser.error('CSV is missing columns required by the knowledge probe')
                rows = list(reader)
        by_id = {row['id']: row for row in rows}
        questions = [args.query] if args.query is not None else [case.question for case in CASES]
        run = subprocess.run(
            ['node', '--input-type=module', '-e', REQUESTS],
            cwd=Path(__file__).resolve().parents[1], input=json.dumps({'questions': questions, 'url': args.url}),
            capture_output=True, text=True, encoding='utf-8', timeout=65, check=True,
        )
    except subprocess.CalledProcessError as error:
        parser.exit(2, f'Navi API check failed. Confirm Node.js 24+ and the server URL.\n{error.stderr}')
    except (OSError, subprocess.TimeoutExpired) as error:
        parser.exit(2, f'Could not run the check. {error}\n')

    replies = json.loads(run.stdout)
    if args.query is not None:
        print(json.dumps(replies[0], ensure_ascii=False, indent=2))
        candidate = closest(args.query, rows)
        if candidate:
            print(f"CSV candidate (lexical overlap only)  {candidate['id']} | {candidate['review_status']} | {candidate['source_url']}")
        elif args.csv:
            print('CSV candidate  none')
        return 0

    passed = csv_matches = csv_total = 0
    for index, (case, reply) in enumerate(zip(CASES, replies, strict=True), start=1):
        failures = matches(case, reply)
        passed += not failures
        route = '/'.join([reply['intent'], *reply['topics'], *([reply['reason']] if reply.get('reason') else [])])
        print(f"\n{index}. {'FAIL' if failures else 'PASS'}  {case.question}")
        print(f"   API [{reply['language']}] {route}  {reply['text']}")
        if failures:
            print(f"   Failed checks  {', '.join(failures)}")
        if args.csv and case.row:
            csv_total += 1
            row_id = 'clickhr-' + case.row
            expected = by_id.get(row_id)
            candidate = closest(case.question, rows)
            found = candidate['id'] if candidate else 'none'
            csv_matches += found == row_id
            coverage = ('absent' if not expected else
                        'answer present' if expected[f'answer_{case.language}'].strip() else 'answer blank')
            print(f'   CSV expected {row_id} ({coverage}) | retrieved {found}')
    print(f'\nAPI checks passed  {passed}/{len(CASES)}')
    if args.csv:
        print(f'CSV expected rows ranked first  {csv_matches}/{csv_total}')
    return int(passed != len(CASES))


if __name__ == '__main__':
    raise SystemExit(main())
