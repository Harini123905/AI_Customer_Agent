# ShopEasy AI Customer Support Agent

An AI customer support agent that **approves, denies or escalates e-commerce refund requests**. The AI talks to the customer and chooses which tools to call, but the **refund policy is enforced in code**, so the decision cannot be argued away in conversation.

Built with Next.js (App Router), TypeScript, Tailwind CSS and Groq function calling.

## Features

- **Customer chat interface** with a sidebar, multiple chats and one-click sample requests
- **Agent loop with tool calling** (raw function calling, no agent framework)
- **Admin dashboard** showing every agent step live: customer message, tool call, tool result, error and reply
- **Mock CRM** with 15 customers and a written refund policy
- **Failure handling**: LLM retries, a step limit, and tool errors returned to the model so it can recover

## Tech stack

| Part | Choice |
|------|--------|
| Framework | Next.js 16 (App Router), TypeScript |
| Styling | Tailwind CSS |
| LLM | `openai/gpt-oss-120b` on Groq (tool calling) |
| Live logs | Server-Sent Events (SSE) |
| Data | In-memory mock data (TypeScript file) |

## How it works

```
Customer  ->  Chat UI (/)  ->  POST /api/chat  ->  Agent loop (src/lib/agent.ts)
                                                     |
                     LLM chooses a tool  <-----------+
                            |
                     Tool runs in code (src/lib/tools.ts)  ->  result goes back to the LLM
                            |
              LLM replies to the customer  ->  every step is logged (src/lib/logger.ts)
                                                     |
Admin dashboard (/admin)  <-  GET /api/logs (SSE)  <-+
```

1. The customer's message and the conversation are sent to `/api/chat`.
2. The agent sends them to the model together with the system prompt, the official policy text and five tool definitions.
3. If the model asks for a tool, the code runs it and returns the result to the model. This repeats until the model gives a final answer, up to 8 steps.
4. Each step is written to the logger, which streams it to the admin dashboard.

## Agent tools

| Tool | What it does |
|------|--------------|
| `lookup_customer` | Finds a customer by email, customer ID or full name and lists their orders |
| `get_order_details` | Returns item, amount, status, delivery date and days since delivery |
| `check_refund_eligibility` | Applies the policy rules and returns `approve`, `deny`, `escalate` or `cancel_instead` with reasons |
| `process_refund` | Issues the refund. It **re-checks the policy itself**, so a rule-breaking refund can never go through |
| `escalate_to_manager` | Creates an escalation ticket for a human manager |

## Refund policy (summary)

The full policy is in [`src/data/refund-policy.md`](src/data/refund-policy.md) and is also given to the agent.

- 30-day return window for a change of mind; 60 days for defective or wrong items
- Digital products, software licences, gift cards and final-sale items are never refundable
- Opened or used items are not refundable for a change of mind
- Undelivered orders should be cancelled instead of refunded; already refunded orders cannot be refunded again
- Refunds up to ₹10,000 are approved automatically; above that they go to a human manager
- Maximum of 3 refunds per customer in 12 months

## Reliability and safety design

- **Rules live in code, not only in the prompt**, so the model cannot be talked into breaking the policy.
- **Double check:** `process_refund` runs the policy check again before issuing money.
- **Retries:** each LLM call is retried up to 3 times with a short delay, and each attempt is logged.
- **Step limit:** the loop stops after 8 steps and hands the case to a human colleague.
- **Tool errors are not fatal:** the error goes back to the model, which can recover (for example after a failed customer lookup).
- **Grounded answers:** the prompt tells the agent to say it does not know instead of inventing products, prices or policy rules.

## Getting started

Requirements: Node.js 20 or newer and a free [Groq API key](https://console.groq.com).

```bash
git clone <your-repository-url>
cd refund-agent
npm install
```

Create a file named `.env.local` in the project root:

```
GROQ_API_KEY=your_key_here
```

Start the app:

```bash
npm run dev
```

- Customer chat: http://localhost:3000
- Admin dashboard: http://localhost:3000/admin (open it in a second tab to watch the agent live)

## Try these scenarios

Refund data is kept in memory, so **restart the server to reset it** between demos.

| Expected result | Customer email | Order | What to say |
|-----------------|----------------|-------|-------------|
| Approve | priya.nair@example.com | ORD-1001 | Change of mind, the speaker is unused |
| Approve | arjun.mehta@example.com | ORD-1002 | The shoes arrived defective |
| Approve (defect, 40 days) | aditya.verma@example.com | ORD-1012 | The charger is defective |
| Deny (past 30 days) | kavya.reddy@example.com | ORD-1003 | Change of mind, unused |
| Deny (digital product) | rohan.das@example.com | ORD-1004 | Refund for the software licence |
| Deny (final sale) | karthik.raj@example.com | ORD-1008 | Change of mind |
| Deny (refund limit) | divya.menon@example.com | ORD-1011 | The mixer grinder is defective |
| Escalate (above ₹10,000) | vikram.singh@example.com | ORD-1006 | The TV is defective |
| Cancel instead | meera.pillai@example.com | ORD-1009 | Refund for an order not yet delivered |

The chat screen also has ready-made sample cards for the main cases. To see failure handling, type an email with a small mistake (for example extra quotation marks) and watch the agent recover in the admin dashboard.

## Project structure

```
src/
  app/
    page.tsx              Customer chat interface
    admin/page.tsx        Admin dashboard (live reasoning logs)
    api/chat/route.ts     Chat endpoint that runs the agent
    api/logs/route.ts     SSE stream of agent logs
  lib/
    agent.ts              Agent loop, system prompt, tool definitions, retries
    tools.ts              Tool functions and policy rules
    logger.ts             Event log with live subscribers
  data/
    Customer.ts           Mock CRM: 15 customers and their orders
    refund-policy.md      Official refund policy
```

## Limitations

- Data and logs are stored in memory and reset when the server restarts. A real system would use a database.
- The admin dashboard has no login.
- The language model can occasionally word things differently between runs, which is why the final decisions are made in code.
- Order dates are calculated from today's date, so the sample data never goes out of date.
- The voice interface (bonus) is not implemented yet.

## Future improvements

- Voice interaction with the OpenAI Realtime API, ElevenLabs or LiveKit
- A database for customers, orders and logs
- Authentication for the admin dashboard
- A manager view to approve or reject escalated cases

## Author

Harini Sivakumar