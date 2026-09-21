import { customers, Order } from "../data/customer";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const daysSince = (date: string): number =>
  Math.floor((Date.now() - new Date(date).getTime()) / MS_PER_DAY);

// ---------- Tool 1: find the customer ----------
export function lookupCustomer(query: string) {
  const q = query.trim().toLowerCase();
  const customer = customers.find(
    (c) =>
      c.customerId.toLowerCase() === q ||
      c.email.toLowerCase() === q ||
      c.name.toLowerCase() === q
  );
  if (!customer) {
    return { found: false, message: "No customer found. Ask for the email address or customer ID." };
  }
  return {
    found: true,
    customerId: customer.customerId,
    name: customer.name,
    refundsInLast12Months: customer.refundsInLast12Months,
    orders: customer.orders.map((o) => ({ orderId: o.orderId, item: o.item, status: o.status })),
  };
}

// ---------- Tool 2: get one order ----------
export function getOrderDetails(orderId: string) {
  for (const c of customers) {
    const order = c.orders.find((o) => o.orderId === orderId);
    if (order) {
      return {
        found: true,
        customerId: c.customerId,
        ...order,
        daysSinceDelivery: order.deliveredOn ? daysSince(order.deliveredOn) : null,
      };
    }
  }
  return { found: false, message: `Order ${orderId} does not exist.` };
}

// ---------- Tool 3: check the refund policy ----------
export type RefundReason = "change_of_mind" | "defective" | "wrong_item";
export type ItemCondition = "unused" | "opened" | "damaged_by_customer";

export type PolicyResult = {
  decision: "approve" | "deny" | "escalate" | "cancel_instead";
  reasons: string[];
  rulesChecked: string[];
};

export function checkRefundEligibility(
  orderId: string,
  reason: RefundReason,
  itemCondition: ItemCondition
): PolicyResult {
  const rulesChecked: string[] = [];
  const found = findOrder(orderId);

  if (!found) {
    return { decision: "deny", reasons: [`Order ${orderId} does not exist.`], rulesChecked };
  }
  const { customer, order } = found;

  // Rule 5: order status
  rulesChecked.push("Rule 5: order status");
  if (order.status === "refunded") {
    return { decision: "deny", reasons: ["This order was already refunded."], rulesChecked };
  }
  if (order.status !== "delivered" || !order.deliveredOn) {
    return {
      decision: "cancel_instead",
      reasons: ["The order has not been delivered yet, so it should be cancelled instead of refunded."],
      rulesChecked,
    };
  }

  // Rule 2: non-refundable items
  rulesChecked.push("Rule 2: non-refundable items");
  if (order.category === "digital" || order.category === "gift_card") {
    return { decision: "deny", reasons: ["Digital products and gift cards are never refundable."], rulesChecked };
  }
  if (order.finalSale) {
    return { decision: "deny", reasons: ["Final sale or clearance items are never refundable."], rulesChecked };
  }
  if (order.category === "hygiene" && itemCondition === "opened" && reason === "change_of_mind") {
    return { decision: "deny", reasons: ["Opened hygiene items are not refundable unless they are defective."], rulesChecked };
  }

  // Rule 3: item condition
  rulesChecked.push("Rule 3: item condition");
  if (itemCondition === "damaged_by_customer") {
    return { decision: "deny", reasons: ["Items damaged or used by the customer are not refundable."], rulesChecked };
  }
    if (itemCondition === "opened" && reason === "change_of_mind") {
    return { decision: "deny", reasons: ["For a change-of-mind refund, the item must be unused and in its original packaging."], rulesChecked };
  }

  // Rules 1 and 4: return window
  rulesChecked.push("Rules 1 and 4: return window");
  const days = daysSince(order.deliveredOn);
  const windowDays = reason === "change_of_mind" ? 30 : 60;
  if (days > windowDays) {
    return {
      decision: "deny",
      reasons: [`Delivered ${days} days ago, which is outside the ${windowDays}-day window for this type of request.`],
      rulesChecked,
    };
  }

  // Rule 6: refund limits
  rulesChecked.push("Rule 6: refund limits");
  if (customer.refundsInLast12Months >= 3) {
    return { decision: "deny", reasons: ["The customer has already received 3 refunds in the last 12 months."], rulesChecked };
  }
  if (order.amountInr > 10000) {
    return {
      decision: "escalate",
      reasons: [`The amount (₹${order.amountInr}) is above ₹10,000, so a human manager must approve it.`],
      rulesChecked,
    };
  }

  return { decision: "approve", reasons: ["All policy rules are satisfied."], rulesChecked };
}

// ---------- Tool 4: process the refund ----------
type RefundRecord = { refundId: string; orderId: string; amountInr: number; createdAt: string };

const globalStore = globalThis as unknown as { refundLedger?: RefundRecord[] };
const ledger = (globalStore.refundLedger ??= []);

export function processRefund(orderId: string, reason: RefundReason, itemCondition: ItemCondition) {
  // The policy is checked again here, so the AI cannot skip the rules.
  const policy = checkRefundEligibility(orderId, reason, itemCondition);
  if (policy.decision !== "approve") {
    return { success: false, message: "Refund blocked by policy.", policy };
  }
  const found = findOrder(orderId)!;
  const record: RefundRecord = {
    refundId: `REF-${1000 + ledger.length + 1}`,
    orderId,
    amountInr: found.order.amountInr,
    createdAt: new Date().toISOString(),
  };
  ledger.push(record);
  found.order.status = "refunded";
  return {
    success: true,
    ...record,
    message: "Refund approved. The money returns to the original payment method in 5 to 7 working days.",
  };
}

// ---------- Tool 5: escalate to a human ----------
export function escalateToManager(orderId: string, summary: string) {
  return {
    success: true,
    ticketId: `ESC-${Math.floor(1000 + Math.random() * 9000)}`,
    orderId,
    summary,
    message: "The case has been sent to a human manager.",
  };
}

// ---------- helper ----------
function findOrder(orderId: string): { customer: (typeof customers)[number]; order: Order } | null {
  for (const customer of customers) {
    const order = customer.orders.find((o) => o.orderId === orderId);
    if (order) return { customer, order };
  }
  return null;
}