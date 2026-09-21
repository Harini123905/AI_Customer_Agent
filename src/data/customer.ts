export type OrderCategory =
  | "electronics"
  | "clothing"
  | "hygiene"
  | "digital"
  | "gift_card"
  | "home"
  | "accessories"
  | "books";

export type OrderStatus = "processing" | "shipped" | "delivered" | "refunded";

export type Order = {
  orderId: string;
  item: string;
  category: OrderCategory;
  amountInr: number;
  status: OrderStatus;
  deliveredOn: string | null; // YYYY-MM-DD, null if not delivered yet
  finalSale: boolean;
};

export type Customer = {
  customerId: string;
  name: string;
  email: string;
  refundsInLast12Months: number;
  orders: Order[];
};

// Dates are calculated from today, so the demo data never becomes out of date.
const daysAgo = (n: number): string =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export const customers: Customer[] = [
  {
    customerId: "CUST-001",
    name: "Priya Nair",
    email: "priya.nair@example.com",
    refundsInLast12Months: 0,
    orders: [
      { orderId: "ORD-1001", item: "Bluetooth Speaker", category: "electronics", amountInr: 2499, status: "delivered", deliveredOn: daysAgo(5), finalSale: false },
    ],
  },
  {
    customerId: "CUST-002",
    name: "Arjun Mehta",
    email: "arjun.mehta@example.com",
    refundsInLast12Months: 1,
    orders: [
      { orderId: "ORD-1002", item: "Running Shoes", category: "clothing", amountInr: 3999, status: "delivered", deliveredOn: daysAgo(12), finalSale: false },
    ],
  },
  {
    customerId: "CUST-003",
    name: "Kavya Reddy",
    email: "kavya.reddy@example.com",
    refundsInLast12Months: 0,
    orders: [
      { orderId: "ORD-1003", item: "Winter Jacket", category: "clothing", amountInr: 2999, status: "delivered", deliveredOn: daysAgo(45), finalSale: false },
    ],
  },
  {
    customerId: "CUST-004",
    name: "Rohan Das",
    email: "rohan.das@example.com",
    refundsInLast12Months: 0,
    orders: [
      { orderId: "ORD-1004", item: "Video Editing Software Licence", category: "digital", amountInr: 7999, status: "delivered", deliveredOn: daysAgo(3), finalSale: false },
    ],
  },
  {
    customerId: "CUST-005",
    name: "Sneha Iyer",
    email: "sneha.iyer@example.com",
    refundsInLast12Months: 0,
    orders: [
      { orderId: "ORD-1005", item: "ShopEasy Gift Card", category: "gift_card", amountInr: 5000, status: "delivered", deliveredOn: daysAgo(2), finalSale: false },
    ],
  },
  {
    customerId: "CUST-006",
    name: "Vikram Singh",
    email: "vikram.singh@example.com",
    refundsInLast12Months: 0,
    orders: [
      { orderId: "ORD-1006", item: '55" 4K Smart TV', category: "electronics", amountInr: 58000, status: "delivered", deliveredOn: daysAgo(10), finalSale: false },
    ],
  },
  {
    customerId: "CUST-007",
    name: "Ananya Sharma",
    email: "ananya.sharma@example.com",
    refundsInLast12Months: 0,
    orders: [
      { orderId: "ORD-1007", item: "Wireless Earbuds", category: "hygiene", amountInr: 1799, status: "delivered", deliveredOn: daysAgo(8), finalSale: false },
    ],
  },
  {
    customerId: "CUST-008",
    name: "Karthik Raj",
    email: "karthik.raj@example.com",
    refundsInLast12Months: 0,
    orders: [
      { orderId: "ORD-1008", item: "Laptop Bag (Clearance)", category: "accessories", amountInr: 1499, status: "delivered", deliveredOn: daysAgo(6), finalSale: true },
    ],
  },
  {
    customerId: "CUST-009",
    name: "Meera Pillai",
    email: "meera.pillai@example.com",
    refundsInLast12Months: 0,
    orders: [
      { orderId: "ORD-1009", item: "Office Chair", category: "home", amountInr: 4200, status: "shipped", deliveredOn: null, finalSale: false },
    ],
  },
  {
    customerId: "CUST-010",
    name: "Imran Khan",
    email: "imran.khan@example.com",
    refundsInLast12Months: 1,
    orders: [
      { orderId: "ORD-1010", item: "Table Lamp", category: "home", amountInr: 2300, status: "refunded", deliveredOn: daysAgo(20), finalSale: false },
    ],
  },
  {
    customerId: "CUST-011",
    name: "Divya Menon",
    email: "divya.menon@example.com",
    refundsInLast12Months: 3,
    orders: [
      { orderId: "ORD-1011", item: "Mixer Grinder", category: "home", amountInr: 3500, status: "delivered", deliveredOn: daysAgo(7), finalSale: false },
    ],
  },
  {
    customerId: "CUST-012",
    name: "Aditya Verma",
    email: "aditya.verma@example.com",
    refundsInLast12Months: 0,
    orders: [
      { orderId: "ORD-1012", item: "Fast Phone Charger", category: "electronics", amountInr: 1999, status: "delivered", deliveredOn: daysAgo(40), finalSale: false },
    ],
  },
  {
    customerId: "CUST-013",
    name: "Lakshmi Narayanan",
    email: "lakshmi.narayanan@example.com",
    refundsInLast12Months: 0,
    orders: [
      { orderId: "ORD-1013", item: "Electric Kettle", category: "home", amountInr: 1899, status: "delivered", deliveredOn: daysAgo(3), finalSale: false },
      { orderId: "ORD-1014", item: "Programming Books Set", category: "books", amountInr: 899, status: "delivered", deliveredOn: daysAgo(70), finalSale: false },
    ],
  },
  {
    customerId: "CUST-014",
    name: "Farhan Ali",
    email: "farhan.ali@example.com",
    refundsInLast12Months: 0,
    orders: [
      { orderId: "ORD-1015", item: "Smartwatch", category: "electronics", amountInr: 12500, status: "delivered", deliveredOn: daysAgo(20), finalSale: false },
    ],
  },
  {
    customerId: "CUST-015",
    name: "Pooja Gupta",
    email: "pooja.gupta@example.com",
    refundsInLast12Months: 2,
    orders: [
      { orderId: "ORD-1016", item: "Cotton Kurta", category: "clothing", amountInr: 2200, status: "delivered", deliveredOn: daysAgo(62), finalSale: false },
    ],
  },
];