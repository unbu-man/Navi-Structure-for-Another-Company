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

## Optional OpenAI routing

Navi starts in FAQ mode. To enable the model for questions the local matcher cannot classify, copy `.env.example` to `.env` and set `OPENAI_API_KEY` on the server. Restart Navi. Set `OPENAI_MODEL` if you want to change the model.

For an unmatched question, Navi can send the message and that bot’s approved FAQ content to OpenAI. The model selects an approved topic or handoff route. Navi renders the saved answer or its own workflow message. Explicit Click HR pricing requests are handled locally before any model call. Provider failures fall back to the local response. The kickoff form stores its details directly in SQLite. Chat messages are not stored in the database.

See the [Responses API reference](https://developers.openai.com/api/reference/resources/responses/methods/create).

## Service configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `NAVI_HOST` | `127.0.0.1` | Address the server listens on. |
| `NAVI_PORT` | `3000` | HTTP port. |
| `NAVI_DB` | `data/navi.sqlite` | SQLite database containing bots and meeting requests. |
| `NAVI_ADMIN_PASSWORD` | Empty | Protects the owner workspace. Set at least 12 characters for a non-local listener. |
| `NAVI_SECURE_COOKIE` | `0` | Set to `1` when serving the workspace over HTTPS. |
| `NAVI_PUBLIC_ORIGIN` | Empty | Set to the external HTTPS origin when a proxy changes the incoming Host header. |
| `OPENAI_API_KEY` | Empty | Enables optional OpenAI routing. |
| `OPENAI_MODEL` | `gpt-4.1-mini` | Model used for routing. |

For a hosted deployment, run one Navi instance behind an HTTPS reverse proxy with a strong admin password, a secure session cookie, and a persistent writable volume for the database. Keep `.env` and the database out of Git. A proxy that hides client IPs shares Navi’s built-in rate limits across its users. Configure public-facing traffic limits at the proxy if you publish it widely. Give your sales or support staff access to review the inbox and follow up.

## Run tests

```bash
npm test
```

The test suite covers Click HR pricing in English and Khmer, FAQ sources and unknown questions, the optional model integration with a simulated provider, company and inbox isolation, SQLite persistence, and workspace authentication.
