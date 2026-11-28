# Navi

Navi is a company chatbot builder. Click HR is the first configured assistant. Use the Playground to test it, then create a bot for another company using that company’s own approved answers.

## Run Navi

Install **Node.js 24 or newer**, then open the Navi folder in VS Code and run:

```bash
npm start
```

Open [the workspace](http://127.0.0.1:3000/) in your browser. The app uses Node’s built-in HTTP and SQLite modules and has no package installation step.

| Where to go | What to test |
| --- | --- |
| **Playground** | Send English or Khmer questions and check the answers and source links. |
| **Bot setup** | Edit the greeting, FAQs, pricing policy, and handoff links. |
| **Meeting requests** | Review a kickoff request submitted through the chat form. |
| **Share bot** | Copy a visitor chat link or iframe code. |
| **New bot** | Add a second company with its own approved answers. |

## Test Click HR

| Try saying | Expected behavior |
| --- | --- |
| What does Click HR do? | Explains the HR and payroll platform and links to the company’s website. |
| Does Click HR support payroll and NSSF? | Shows the approved payroll answer with a source link. |
| តើបុគ្គលិកអាចកត់ត្រាវត្តមានតាមទូរស័ព្ទបានទេ? | Explains attendance in Khmer. |
| How much does Click HR cost for 50 employees? | Explains that a quote follows a kickoff meeting. Shows the request form and the official demo link. |
| And for 150 employees? | Keeps the conversation on the kickoff workflow. |
| Can Click HR integrate with SAP? | Refers the visitor to Click HR for confirmation. |
| Show me my payslip. | Directs the visitor to their company administrator or support. |

Use sample information to check the kickoff form. For example, submit `qa@example.com` from a company named `Navi Demo`, then open **Meeting requests** and mark the entry reviewed. The form saves requests in this installation’s inbox. Navi sends no email and the request leaves the meeting time pending. Visitors can use the [official Click HR booking page](https://www.clickhr.app/booking-demo/) to contact Click HR through its own site.

Click HR’s seeded product information comes from the [official website](https://www.clickhr.app/) and its module pages. Each source link is included in the bot’s FAQ. The kickoff-before-quote policy is set independently in Bot setup.

## Create a bot for another company

1. Select **New bot** and add the company name, link slug, and greeting.
2. Add one or more FAQs. For a delivery question, for example, use matching phrases such as `delivery, shipping, ដឹកជញ្ជូន` and paste the company’s approved English and Khmer answers.
3. Choose **Answer from approved FAQs** when the company supplies pricing for publication. Choose **Quote after kickoff** for custom quotes. Add a booking link, contact link, or turn on the Navi request form.
4. Save, test the questions in the Playground, and copy the visitor link and embed code from **Share bot**.

Bots share one owner workspace. The public chat answers from the selected company’s configuration and the inbox shows that company’s requests. Each bot has its own visitor URL at `/chat/<slug>` and embed URL at `/embed/<slug>`. A localhost URL is reachable on the computer running Navi. A deployed HTTPS URL is needed for customers to use the link or iframe from their own devices.

## Free API and browser demo

Start the free edition with Node.js 24 or newer:

```bash
npm run start:free
```

This command always uses the bilingual FAQ engine, even if you already configured a model provider. It needs no model download, paid API key, or account. Navi runs on the computer that starts it. A remotely hosted URL needs a server of its own.

Open [the API demo](http://127.0.0.1:3000/api-demo) to try Click HR questions and inspect the full JSON response. The [OpenAPI definition](http://127.0.0.1:3000/api/openapi.json) is available from the same server.

| Method | Endpoint | Result |
| --- | --- | --- |
| GET | `/api/health` | Confirms the server is running. |
| GET | `/api/bots/clickhr` | Returns the public bot profile and routing mode. |
| POST | `/api/bots/clickhr/chat` | Returns the reply text, language, intent, FAQ topics and available actions. |
| POST | `/api/bots/clickhr/leads` | Saves a consented kickoff request in the inbox. |

```bash
curl -sS http://127.0.0.1:3000/api/bots/clickhr/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Click HR តម្លៃប៉ុន្មានសម្រាប់ 50 employees?","language":"auto"}'
```

For some replies with `intent: "unknown"`, the API also returns a `reason`:

| Reason | Example | Response |
| --- | --- | --- |
| `out_of_scope` | I go to schol | Redirect to Click HR questions. |
| `needs_clarification` | It doesn’t work | Ask which feature and task the visitor means. |
| `missing_information` | Does Click HR support this specific fingerprint device? | Say the detail is unverified and offer support. |

The free matcher recognizes selected phrases in English, Khmer, and Khmer typed in Latin letters. When a message remains unclear, the API may return a general `unknown` reply. A supported paraphrase such as “Can staff punch in from their phones?” can return the saved attendance FAQ.

For a follow-up, add `previous` with the preceding reply's `intent` and `topics`. For another company, replace `clickhr` with the bot slug. Browser clients can use the same-origin API or the existing iframe. Server clients can call the API directly.

## Optional Gemma or OpenAI routing

Navi uses the FAQ matcher and business rules first. For unmatched questions, enable a model to select an approved FAQ ID or a handoff. Navi still renders the saved answer or a backend workflow message. Provider failures use the contact fallback.

To try Gemma 3 4B locally, run [Ollama](https://ollama.com/library/gemma3) on the same machine as Navi and download the model. Then start Navi with the Ollama router:

```bash
ollama pull gemma3:4b
NAVI_ROUTER=ollama npm start
```

Set `NAVI_OLLAMA_MODEL` to a different local model name when comparing a compatible adapter. If you use OpenAI, set `NAVI_ROUTER=openai` and `OPENAI_API_KEY` on the server. An OpenAI API key also enables that provider when `NAVI_ROUTER` is left blank. In OpenAI mode, unmatched messages and that bot's approved FAQ text can be sent to the provider. The kickoff form writes directly to SQLite.

## Evaluate Click HR

Run the free HTTP smoke test with Node.js 24+ and Python 3.10+. It starts a temporary local server and uses the [bundled public CSV](Navi-Click-HR-Public-Knowledge.csv) to compare search candidates with the API replies. The API uses the bot’s configured answers and source-backed guidance. The CSV search runs in the test tool.

```bash
python3 eval/quick-knowledge-test.py
python3 eval/quick-knowledge-test.py --query 'Where is the overtime request menu?'
```

Use `--csv PATH` to compare a different CSV with the same columns. Run the routing evaluation separately to compare model providers.

```bash
NAVI_ROUTER=faq npm run eval
NAVI_ROUTER=ollama npm run eval
NAVI_ROUTER=ollama NAVI_OLLAMA_MODEL=your-gemma-adapter npm run eval
```

The evaluation uses the 24 labeled examples in [eval/clickhr-cases.json](eval/clickhr-cases.json). It reports matches by language group, individual misses, and failed model calls. A failed provider call falls back to Navi but makes the evaluation exit with a failure status so a fallback score cannot stand in for a working provider. Reply language is scored for English, Khmer script, and mixed script. The Romanized Khmer cases score the route because language selection remains ambiguous for spelling variants.

Use these examples as development checks. To select a model or train an adapter, collect approved customer-like examples and reserve a separate test set with new phrasings and customer scenarios. Compare the base model and adapter with the same FAQs and routing rules.

## Service configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `NAVI_HOST` | `127.0.0.1` | Address the server listens on. |
| `NAVI_PORT` | `3000` | HTTP port. |
| `NAVI_DB` | `data/navi.sqlite` | SQLite database containing bots and meeting requests. |
| `NAVI_ADMIN_PASSWORD` | Empty | Protects the owner workspace. Set at least 12 characters for a non-local listener. |
| `NAVI_SECURE_COOKIE` | `0` | Set to `1` when serving the workspace over HTTPS. |
| `NAVI_PUBLIC_ORIGIN` | Empty | Set to the external HTTPS origin when a proxy changes the incoming Host header. |
| `NAVI_ROUTER` | Empty | `faq`, `ollama`, or `openai`. |
| `NAVI_OLLAMA_MODEL` | `gemma3:4b` | Local model or compatible adapter name. |
| `NAVI_OLLAMA_ORIGIN` | `http://127.0.0.1:11434` | Local Ollama HTTP origin. |
| `OPENAI_API_KEY` | Empty | Enables optional OpenAI routing. |
| `OPENAI_MODEL` | `gpt-4.1-mini` | Model used for routing. |

For a hosted deployment, run one Navi instance behind an HTTPS reverse proxy with a strong admin password, a secure session cookie, and a persistent writable volume for the database. Keep `.env` and the database out of Git. A proxy that hides client IPs shares Navi’s built-in rate limits across its users. Configure public-facing traffic limits at the proxy if you publish it widely. Give your sales or support staff access to review the inbox and follow up.

## Run tests

```bash
npm test
```

The test suite covers Click HR pricing in English and Khmer, FAQ sources and unknown questions, the optional OpenAI and Ollama integrations with simulated providers, company and inbox isolation, SQLite persistence, and workspace authentication.
