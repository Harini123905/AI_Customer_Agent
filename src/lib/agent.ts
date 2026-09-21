import fs from "fs";
import path from "path";
import Groq from "groq-sdk";
import {
  lookupCustomer,
  getOrderDetails,
  checkRefundEligibility,
  processRefund,
  escalateToManager,
  RefundReason,
  ItemCondition,
} from "./tools";
import { logEvent } from "./logger";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "openai/gpt-oss-120b";
const MAX_STEPS = 8; // safety limit so the loop can never run forever

type Msg = Groq.Chat.ChatCompletionMessageParam;
export type ChatMessage = { role: "user" | "assistant"; content: string };

// The official policy is read from the file, so the agent always quotes the real rules.
const POLICY = fs.readFileSync(path.join(process.cwd(), "src", "data", "refund-policy.md"), "utf8");

const SYSTEM_PROMPT = `You are a polite customer support agent for ShopEasy, an online shop in India.
Your job is to handle refund requests.

Follow these rules strictly:
1. First identify the customer. If you do not have their email address or customer ID, ask for it.
   When you use an email address, customer ID or order ID in a tool, copy it exactly, character by character, from the customer's message. Never correct, change or guess it.
   If lookup_customer finds nobody, try once more with the exact text from the customer's message before asking again.
2. Ask for the order ID if the customer has not given it. If the customer has only one order, you may confirm it with them.
3. Find out the reason (change of mind, defective, or wrong item) and the condition of the item (unused, opened, or damaged by the customer). Ask if you do not know.
4. Always use get_order_details and then check_refund_eligibility. Never decide a refund yourself. The policy tool decides.
5. If the decision is "approve", call process_refund, then tell the customer the refund ID and the amount from the tool result.
6. If the decision is "escalate", call escalate_to_manager, then tell the customer that a human manager will review the case and give them the ticket ID (for example ESC-1234) from the tool result.
7. If the decision is "deny" or "cancel_instead", explain the reason kindly and clearly. Do not offer a refund.
8. Never invent order details, amounts or policy rules. Use only what the tools return.
9. Keep replies short, warm and simple. Amounts are in rupees (₹). Use plain text only, with no tables.
10. Your main work is refunds, returns, order questions and questions about the refund policy. Answer these fully and carefully.
11. You may also have light general conversation, such as greetings, thanks, or "what can you do?". Reply in one or two warm sentences, then gently bring the customer back to how you can help with their order or refund.
12. If the customer asks for something you cannot check with the tools or the official policy (product suggestions, prices, stock, warranties, delivery times, shipping charges), say honestly that you do not have that information and suggest contacting the ShopEasy support team. Never invent it.
13. If the customer asks about the refund policy, answer only from the official policy below. Never invent rules, time limits or warranties.

OFFICIAL REFUND POLICY:
${POLICY}`;

const tools: Groq.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "lookup_customer",
      description: "Find a customer by email address, customer ID or full name. Returns their orders.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Email, customer ID (CUST-001) or full name" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_order_details",
      description: "Get full details of one order: item, amount, status, delivery date and days since delivery.",
      parameters: {
        type: "object",
        properties: { orderId: { type: "string", description: "Order ID, for example ORD-1001" } },
        required: ["orderId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_refund_eligibility",
      description: "Check an order against the refund policy. Returns approve, deny, escalate or cancel_instead, with reasons.",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string" },
          reason: { type: "string", enum: ["change_of_mind", "defective", "wrong_item"] },
          itemCondition: { type: "string", enum: ["unused", "opened", "damaged_by_customer"] },
        },
        required: ["orderId", "reason", "itemCondition"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "process_refund",
      description: "Issue the refund. Only call this after check_refund_eligibility returned approve.",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string" },
          reason: { type: "string", enum: ["change_of_mind", "defective", "wrong_item"] },
          itemCondition: { type: "string", enum: ["unused", "opened", "damaged_by_customer"] },
        },
        required: ["orderId", "reason", "itemCondition"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "escalate_to_manager",
      description: "Send the case to a human manager. Use when check_refund_eligibility returned escalate.",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string" },
          summary: { type: "string", description: "One or two lines explaining the case for the manager" },
        },
        required: ["orderId", "summary"],
      },
    },
  },
];

// Connects the tool name chosen by the LLM to the real function.
function runTool(name: string, args: Record<string, string>) {
  switch (name) {
    case "lookup_customer":
      return lookupCustomer(args.query);
    case "get_order_details":
      return getOrderDetails(args.orderId);
    case "check_refund_eligibility":
      return checkRefundEligibility(args.orderId, args.reason as RefundReason, args.itemCondition as ItemCondition);
    case "process_refund":
      return processRefund(args.orderId, args.reason as RefundReason, args.itemCondition as ItemCondition);
    case "escalate_to_manager":
      return escalateToManager(args.orderId, args.summary);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Calls the LLM and retries up to 3 times if it fails.
async function callLLM(messages: Msg[], sessionId: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await client.chat.completions.create({
        model: MODEL,
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.1,
      });
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      logEvent(sessionId, "error", `LLM call failed (attempt ${attempt} of 3): ${text}`);
      if (attempt === 3) throw err;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw new Error("LLM call failed");
}

export async function runAgent(sessionId: string, chat: ChatMessage[]): Promise<string> {
  const messages: Msg[] = [{ role: "system", content: SYSTEM_PROMPT }, ...chat];

  const lastUser = [...chat].reverse().find((m) => m.role === "user");
  if (lastUser) logEvent(sessionId, "customer", lastUser.content);

  for (let step = 1; step <= MAX_STEPS; step++) {
    const response = await callLLM(messages, sessionId);
    const message = response.choices[0].message;

    // No tool calls means the agent is ready to talk to the customer.
    if (!message.tool_calls || message.tool_calls.length === 0) {
      const reply = message.content ?? "";
      logEvent(sessionId, "reply", reply);
      return reply;
    }

    if (message.content) logEvent(sessionId, "thinking", message.content);
    messages.push({ role: "assistant", content: message.content ?? "", tool_calls: message.tool_calls });

    for (const call of message.tool_calls) {
      const name = call.function.name;
      let result: unknown;

      try {
        const args = JSON.parse(call.function.arguments || "{}");
        logEvent(sessionId, "tool_call", `${name}(${JSON.stringify(args)})`);
        result = runTool(name, args);
      } catch (err) {
        const text = err instanceof Error ? err.message : String(err);
        logEvent(sessionId, "error", `Tool ${name} failed: ${text}`);
        result = { error: text };
      }

      logEvent(sessionId, "tool_result", JSON.stringify(result));
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }

  const fallback = "I am sorry, I could not complete this request. Let me pass it to a human colleague.";
  logEvent(sessionId, "error", `Stopped after ${MAX_STEPS} steps without a final answer.`);
  return fallback;
}