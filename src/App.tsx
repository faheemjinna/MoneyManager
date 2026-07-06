import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeDollarSign,
  Banknote,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  CreditCard,
  Download,
  Landmark,
  LayoutDashboard,
  LineChart,
  Link as LinkIcon,
  LogIn,
  LogOut,
  Mail,
  NotebookPen,
  Pin,
  ListPlus,
  Pencil,
  PieChart,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  SquareCheckBig,
  Target,
  Trash2,
  Upload,
  UserCheck,
  UserX,
  Video,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { usePlaidLink } from "react-plaid-link";

type AccountType = "Checking" | "Savings" | "Money Market" | "Cash" | "Investment";
type TransactionType = "expense" | "income" | "card-payment";
type SourceKind = "account" | "card";
type ViewId = "dashboard" | "tasks" | "calendar" | "notes" | "finance" | "accounts" | "cards" | "transactions" | "budgets" | "rewards" | "admin";

type Bank = {
  id: string;
  name: string;
  shortName: string;
  tone: string;
};

type RewardRule = {
  category: string;
  rate: number;
  cap?: string;
  note?: string;
};

type CardTemplate = {
  id: string;
  name: string;
  issuer: string;
  network: string;
  accent: string;
  annualFee: string;
  sourceLabel: string;
  sourceUrl: string;
  rewards: RewardRule[];
};

type Account = {
  id: string;
  source?: "manual" | "plaid";
  providerAccountId?: string;
  name: string;
  bankId: string;
  type: AccountType;
  last4: string;
  openingBalance: number;
  currentBalance?: number;
  availableBalance?: number | null;
  color: string;
};

type UserCard = {
  id: string;
  source?: "manual" | "plaid";
  providerAccountId?: string;
  nickname: string;
  templateId: string;
  issuerId: string;
  network: string;
  last4: string;
  creditLimit: number;
  startingDebt: number;
  currentDebt?: number;
  availableCredit?: number | null;
  apr: number;
  minimumPayment: number;
  dueDay: number;
  statementDay: number;
  accent: string;
  rewards: RewardRule[];
};

type Transaction = {
  id: string;
  type: TransactionType;
  date: string;
  merchant: string;
  category: string;
  amount: number;
  sourceKind: SourceKind;
  sourceId: string;
  paymentAccountId?: string;
  cashback: number;
  notes?: string;
  providerTransactionId?: string;
};

type Budget = {
  id: string;
  category: string;
  monthlyLimit: number;
};

type TaskItem = {
  id: string;
  title: string;
  notes?: string;
  dueDate?: string;
  priority: "low" | "medium" | "high";
  status: "todo" | "doing" | "done";
  list: string;
};

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  location?: string;
  meetingLink?: string;
  attendees: string[];
  sourceEmail?: string;
  provider?: string;
  providerEventId?: string;
  notes?: string;
  color: string;
};

type NoteItem = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  updatedAt?: string;
};

type User = {
  id: string;
  email: string;
  name?: string;
  role?: "admin" | "user";
  approvalStatus?: "pending" | "approved" | "rejected";
};

type ManagedUser = User & {
  createdAt?: string;
};

type PlaidStatus = {
  configured: boolean;
  environment: string;
};

type CalendarAccount = {
  id: string;
  provider: "google";
  email: string;
  name?: string;
  status: "active" | "needs_reauth";
  calendars: { id: string; summary: string; primary: boolean; selected: boolean; backgroundColor: string }[];
  lastSyncedAt?: string;
};

type CalendarStatus = {
  googleConfigured: boolean;
  accounts: CalendarAccount[];
};

type CalendarImportResult = {
  created: number;
  updated: number;
  total: number;
  events: CalendarEvent[];
};

type AppData = {
  accounts: Account[];
  cards: UserCard[];
  transactions: Transaction[];
  budgets: Budget[];
  tasks: TaskItem[];
  calendarEvents: CalendarEvent[];
  notes: NoteItem[];
};

type ModalState =
  | { type: "account"; item?: Account }
  | { type: "card"; item?: UserCard }
  | { type: "transaction"; item?: Transaction }
  | { type: "budget"; item?: Budget }
  | { type: "task"; item?: TaskItem }
  | { type: "calendar"; item?: CalendarEvent }
  | { type: "note"; item?: NoteItem }
  | null;

const BANKS: Bank[] = [
  { id: "chase", name: "Chase", shortName: "Chase", tone: "#0b66c3" },
  { id: "bank-of-america", name: "Bank of America", shortName: "BofA", tone: "#d71920" },
  { id: "wells-fargo", name: "Wells Fargo", shortName: "WF", tone: "#b31b1b" },
  { id: "citi", name: "Citi", shortName: "Citi", tone: "#1f73b7" },
  { id: "capital-one", name: "Capital One", shortName: "CapOne", tone: "#004977" },
  { id: "us-bank", name: "U.S. Bank", shortName: "U.S.", tone: "#27408b" },
  { id: "american-express", name: "American Express", shortName: "Amex", tone: "#2e77bc" },
  { id: "discover", name: "Discover", shortName: "Disc", tone: "#f58220" },
  { id: "apple-card", name: "Apple Card", shortName: "Apple", tone: "#111111" },
  { id: "pnc", name: "PNC Bank", shortName: "PNC", tone: "#f58025" },
  { id: "truist", name: "Truist", shortName: "Truist", tone: "#612c8f" },
  { id: "td", name: "TD Bank", shortName: "TD", tone: "#54b948" },
  { id: "usaa", name: "USAA", shortName: "USAA", tone: "#1e3a5f" },
  { id: "navy-federal", name: "Navy Federal Credit Union", shortName: "NFCU", tone: "#173b57" },
  { id: "ally", name: "Ally Bank", shortName: "Ally", tone: "#682d8f" },
  { id: "sofi", name: "SoFi", shortName: "SoFi", tone: "#00a7b5" },
  { id: "fidelity", name: "Fidelity", shortName: "Fid", tone: "#386641" },
  { id: "charles-schwab", name: "Charles Schwab", shortName: "Schwab", tone: "#0073cf" },
  { id: "synchrony", name: "Synchrony", shortName: "Sync", tone: "#f4a000" },
  { id: "barclays", name: "Barclays", shortName: "Barclays", tone: "#00aeef" },
];

const CATEGORIES = [
  "Groceries",
  "Restaurants",
  "Gas",
  "Travel",
  "Transit",
  "Drugstores",
  "Online Shopping",
  "Entertainment",
  "Utilities",
  "Home",
  "Shopping",
  "Subscriptions",
  "Healthcare",
  "Education",
  "Income",
  "Other",
];

const CARD_CATALOG: CardTemplate[] = [
  {
    id: "chase-freedom-unlimited",
    name: "Chase Freedom Unlimited",
    issuer: "chase",
    network: "Visa",
    accent: "#0b66c3",
    annualFee: "$0",
    sourceLabel: "Chase rewards page",
    sourceUrl: "https://creditcards.chase.com/cash-back-credit-cards/freedom/unlimited",
    rewards: [
      { category: "Travel", rate: 5, note: "Booked through Chase Travel" },
      { category: "Restaurants", rate: 3 },
      { category: "Drugstores", rate: 3 },
      { category: "Everything", rate: 1.5 },
    ],
  },
  {
    id: "chase-freedom-flex",
    name: "Chase Freedom Flex",
    issuer: "chase",
    network: "Mastercard",
    accent: "#113f8f",
    annualFee: "$0",
    sourceLabel: "Chase Q3 2026 page",
    sourceUrl: "https://www.chase.com/personal/credit-cards/freedom/freedomfive",
    rewards: [
      { category: "Gas", rate: 5, cap: "$1,500 combined Q3 2026 cap", note: "Q3 2026 activated category" },
      { category: "Transit", rate: 5, cap: "$1,500 combined Q3 2026 cap", note: "Q3 2026 activated category" },
      { category: "Entertainment", rate: 5, cap: "$1,500 combined Q3 2026 cap", note: "Select live entertainment" },
      { category: "Travel", rate: 5, note: "Booked through Chase Travel" },
      { category: "Restaurants", rate: 3 },
      { category: "Drugstores", rate: 3 },
      { category: "Everything", rate: 1 },
    ],
  },
  {
    id: "capital-one-savor",
    name: "Capital One Savor",
    issuer: "capital-one",
    network: "Mastercard",
    accent: "#004977",
    annualFee: "$0",
    sourceLabel: "Capital One Savor page",
    sourceUrl: "https://www.capitalone.com/credit-cards/savor/",
    rewards: [
      { category: "Groceries", rate: 3 },
      { category: "Restaurants", rate: 3 },
      { category: "Entertainment", rate: 3 },
      { category: "Subscriptions", rate: 3, note: "Popular streaming services" },
      { category: "Travel", rate: 5, note: "Hotels, vacation rentals, rental cars and activities through Capital One Travel" },
      { category: "Everything", rate: 1 },
    ],
  },
  {
    id: "wells-fargo-active-cash",
    name: "Wells Fargo Active Cash",
    issuer: "wells-fargo",
    network: "Visa",
    accent: "#b31b1b",
    annualFee: "$0",
    sourceLabel: "Wells Fargo card page",
    sourceUrl: "https://creditcards.wellsfargo.com/active-cash-credit-card/",
    rewards: [{ category: "Everything", rate: 2 }],
  },
  {
    id: "discover-it-cash-back",
    name: "Discover it Cash Back",
    issuer: "discover",
    network: "Discover",
    accent: "#f58220",
    annualFee: "$0",
    sourceLabel: "Discover 5% calendar",
    sourceUrl: "https://www.discover.com/credit-cards/cash-back/cashback-calendar.html",
    rewards: [
      { category: "Gas", rate: 5, cap: "$1,500 quarterly cap", note: "Q3 2026 activated category" },
      { category: "Transit", rate: 5, cap: "$1,500 quarterly cap", note: "Q3 2026 transportation category" },
      { category: "Drugstores", rate: 5, cap: "$1,500 quarterly cap", note: "Q3 2026 activated category" },
      { category: "Everything", rate: 1 },
    ],
  },
  {
    id: "citi-double-cash",
    name: "Citi Double Cash",
    issuer: "citi",
    network: "Mastercard",
    accent: "#1f73b7",
    annualFee: "$0",
    sourceLabel: "Citi Double Cash page",
    sourceUrl: "https://www.citi.com/credit-cards/citi-double-cash-credit-card",
    rewards: [
      { category: "Travel", rate: 5, note: "Hotels, car rentals, and attractions through Citi Travel" },
      { category: "Everything", rate: 2, note: "1% when you buy plus 1% as you pay" },
    ],
  },
  {
    id: "amex-blue-cash-everyday",
    name: "Amex Blue Cash Everyday",
    issuer: "american-express",
    network: "American Express",
    accent: "#2e77bc",
    annualFee: "$0",
    sourceLabel: "American Express page",
    sourceUrl: "https://www.americanexpress.com/us/credit-cards/card/blue-cash-everyday/",
    rewards: [
      { category: "Groceries", rate: 3, cap: "$6,000 per year, then 1%", note: "U.S. supermarkets" },
      { category: "Gas", rate: 3, cap: "$6,000 per year, then 1%", note: "U.S. gas stations" },
      { category: "Online Shopping", rate: 3, cap: "$6,000 per year, then 1%", note: "U.S. online retail purchases" },
      { category: "Everything", rate: 1 },
    ],
  },
  {
    id: "boa-customized-cash",
    name: "Bank of America Customized Cash",
    issuer: "bank-of-america",
    network: "Visa",
    accent: "#d71920",
    annualFee: "$0",
    sourceLabel: "Bank of America categories",
    sourceUrl: "https://www.bankofamerica.com/credit-cards/products/cash-back-credit-card/cash-back-category-choices/",
    rewards: [
      { category: "Online Shopping", rate: 3, cap: "$2,500 combined quarterly cap", note: "Selectable category; edit if you choose another" },
      { category: "Groceries", rate: 2, cap: "$2,500 combined quarterly cap" },
      { category: "Everything", rate: 1 },
    ],
  },
  {
    id: "us-bank-cash-plus",
    name: "U.S. Bank Cash+",
    issuer: "us-bank",
    network: "Visa",
    accent: "#27408b",
    annualFee: "$0",
    sourceLabel: "U.S. Bank Cash+ page",
    sourceUrl: "https://www.usbank.com/credit-cards/cash-plus-visa-signature-credit-card.html",
    rewards: [
      { category: "Utilities", rate: 5, cap: "$2,000 combined quarterly cap", note: "One of two selectable 5% categories" },
      { category: "Subscriptions", rate: 5, cap: "$2,000 combined quarterly cap", note: "One of two selectable 5% categories" },
      { category: "Groceries", rate: 2, note: "Selectable 2% everyday category" },
      { category: "Everything", rate: 1 },
    ],
  },
  {
    id: "apple-card",
    name: "Apple Card",
    issuer: "apple-card",
    network: "Mastercard",
    accent: "#111111",
    annualFee: "$0",
    sourceLabel: "Apple Card page",
    sourceUrl: "https://card.apple.com/apply/start",
    rewards: [
      { category: "Online Shopping", rate: 3, note: "Apple purchases and select merchants; edit for your setup" },
      { category: "Everything", rate: 2, note: "Apple Pay purchases" },
      { category: "Other", rate: 1, note: "Physical card purchases" },
    ],
  },
];

const DEFAULT_DATA: AppData = {
  accounts: [],
  cards: [],
  transactions: [],
  budgets: [],
  tasks: [],
  calendarEvents: [],
  notes: [],
};

const todayIso = new Date().toISOString().slice(0, 10);
const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const SESSION_TOKEN_KEY = "money-manager-session-token";
const USE_BEARER_SESSION = window.location.protocol === "capacitor:" || API_BASE.length > 0;
const VIEW_PATHS: Record<ViewId, string> = {
  dashboard: "/",
  tasks: "/tasks",
  calendar: "/calendar",
  notes: "/notes",
  finance: "/finance",
  accounts: "/accounts",
  cards: "/cards",
  transactions: "/transactions",
  budgets: "/budgets",
  rewards: "/rewards",
  admin: "/admin",
};
const DATA_ENDPOINTS: Record<keyof AppData, string> = {
  accounts: "accounts",
  cards: "cards",
  transactions: "transactions",
  budgets: "budgets",
  tasks: "tasks",
  calendarEvents: "calendar-events",
  notes: "notes",
};

function viewFromPath(pathname: string): ViewId {
  const match = (Object.entries(VIEW_PATHS) as [ViewId, string][]).find(([, path]) => path === pathname);
  return match?.[0] ?? "dashboard";
}

function getSessionToken() {
  if (!USE_BEARER_SESSION) return null;
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

function setSessionToken(token?: string) {
  if (USE_BEARER_SESSION && token) {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  }
}

function clearSessionToken() {
  localStorage.removeItem(SESSION_TOKEN_KEY);
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  const token = getSessionToken();
  try {
    response = await fetch(`${API_BASE}/api${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error("Cannot reach the API server. Start it with npm run dev or npm run dev:api.");
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message ?? "Request failed");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 10000 ? 0 : 2,
  }).format(value || 0);
}

function percent(value: number) {
  return `${Number(value || 0).toFixed(value % 1 ? 2 : 0)}%`;
}

function currentMonthKey() {
  return todayIso.slice(0, 7);
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthKey(date: Date) {
  return localDateKey(date).slice(0, 7);
}

function shiftMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function calendarMonthCells(monthDate: Date) {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const firstMondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - firstMondayOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      date,
      key: localDateKey(date),
      inMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
}

function getBank(id: string) {
  return BANKS.find((bank) => bank.id === id) ?? BANKS[0];
}

function getTemplate(id: string) {
  return CARD_CATALOG.find((card) => card.id === id) ?? CARD_CATALOG[0];
}

function bestRewardRate(card: UserCard, category: string) {
  const matching = card.rewards.filter((rule) => rule.category === category || rule.category === "Everything");
  if (!matching.length) return 0;
  return Math.max(...matching.map((rule) => rule.rate));
}

function projectedCashback(card: UserCard | undefined, category: string, amount: number) {
  if (!card || !amount) return 0;
  return (amount * bestRewardRate(card, category)) / 100;
}

function calculateBalances(data: AppData) {
  const accountBalances = new Map(
    data.accounts.map((account) => [
      account.id,
      account.source === "plaid" && account.availableBalance != null ? account.availableBalance : account.currentBalance ?? account.openingBalance,
    ])
  );
  const cardBalances = new Map(data.cards.map((card) => [card.id, card.currentDebt ?? card.startingDebt]));

  for (const txn of data.transactions) {
    if (txn.providerTransactionId) continue;

    if (txn.type === "income") {
      accountBalances.set(txn.sourceId, (accountBalances.get(txn.sourceId) ?? 0) + txn.amount);
    }
    if (txn.type === "expense" && txn.sourceKind === "account") {
      accountBalances.set(txn.sourceId, (accountBalances.get(txn.sourceId) ?? 0) - txn.amount);
    }
    if (txn.type === "expense" && txn.sourceKind === "card") {
      cardBalances.set(txn.sourceId, (cardBalances.get(txn.sourceId) ?? 0) + txn.amount);
    }
    if (txn.type === "card-payment") {
      cardBalances.set(txn.sourceId, Math.max(0, (cardBalances.get(txn.sourceId) ?? 0) - txn.amount));
      if (txn.paymentAccountId) {
        accountBalances.set(txn.paymentAccountId, (accountBalances.get(txn.paymentAccountId) ?? 0) - txn.amount);
      }
    }
  }

  return { accountBalances, cardBalances };
}

function monthSpend(transactions: Transaction[], month = currentMonthKey()) {
  return transactions
    .filter((txn) => txn.type === "expense" && txn.date.startsWith(month))
    .reduce((sum, txn) => sum + txn.amount, 0);
}

function monthCashback(transactions: Transaction[], month = currentMonthKey()) {
  return transactions
    .filter((txn) => txn.type === "expense" && txn.date.startsWith(month))
    .reduce((sum, txn) => sum + txn.cashback, 0);
}

function formatEventTime(value: string) {
  if (!value) return "Unscheduled";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function isToday(value?: string) {
  return Boolean(value?.startsWith(todayIso));
}

function isUpcoming(value?: string) {
  if (!value) return false;
  return value >= todayIso;
}

function splitTags(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMeetingEmail(sourceEmail: string): Partial<CalendarEvent> {
  const lines = sourceEmail
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const emailMatches = [...sourceEmail.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)].map((match) => match[0].toLowerCase());
  const linkMatch = sourceEmail.match(/https?:\/\/\S+/i);
  const dateLine = lines.find((line) => /\b(mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}[/-]\d{1,2})/i.test(line));
  const isoDateMatch = dateLine?.match(/\d{4}-\d{2}-\d{2}/);
  const timeMatch = dateLine?.match(/\b\d{1,2}:\d{2}\b/);
  const locationLine = lines.find((line) => /^(location|where|room):/i.test(line));
  const subjectLine = lines.find((line) => /^subject:/i.test(line));
  const title =
    subjectLine?.replace(/^subject:\s*/i, "") ||
    lines.find((line) => !line.includes("@") && !line.startsWith("http") && line.length < 120) ||
    "Imported meeting";

  return {
    title,
    start: isoDateMatch ? `${isoDateMatch[0]}T${timeMatch?.[0] ?? "09:00"}` : `${todayIso}T09:00`,
    location: locationLine?.replace(/^(location|where|room):\s*/i, "") ?? "",
    meetingLink: linkMatch?.[0]?.replace(/[),.]+$/, "") ?? "",
    attendees: [...new Set(emailMatches)],
    sourceEmail,
  };
}

function spendingByCategory(transactions: Transaction[], month = currentMonthKey()) {
  const map = new Map<string, number>();
  transactions
    .filter((txn) => txn.type === "expense" && txn.date.startsWith(month))
    .forEach((txn) => map.set(txn.category, (map.get(txn.category) ?? 0) + txn.amount));
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function sourceName(data: AppData, txn: Transaction) {
  if (txn.type === "card-payment") {
    const card = data.cards.find((item) => item.id === txn.sourceId);
    const account = data.accounts.find((item) => item.id === txn.paymentAccountId);
    return `${account?.name ?? "Account"} -> ${card?.nickname ?? "Card"}`;
  }
  if (txn.sourceKind === "card") return data.cards.find((card) => card.id === txn.sourceId)?.nickname ?? "Card";
  return data.accounts.find((account) => account.id === txn.sourceId)?.name ?? "Account";
}

function StatTile({
  label,
  value,
  detail,
  icon,
  tone = "blue",
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  tone?: "blue" | "green" | "orange" | "pink";
}) {
  return (
    <section className={`stat-tile tone-${tone}`}>
      <div className="stat-icon">{icon}</div>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </section>
  );
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <Sparkles size={28} />
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="sheet animate-rise">
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function AccountForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Account;
  onSubmit: (account: Account) => void;
  onCancel: () => void;
}) {
  const [bankId, setBankId] = useState(initial?.bankId ?? BANKS[0].id);
  const [type, setType] = useState<AccountType>(initial?.type ?? "Checking");
  const [name, setName] = useState(initial?.name ?? "Everyday Checking");
  const [last4, setLast4] = useState(initial?.last4 ?? "");
  const [openingBalance, setOpeningBalance] = useState(String(initial?.currentBalance ?? initial?.openingBalance ?? 0));

  function submit(event: FormEvent) {
    event.preventDefault();
    const bank = getBank(bankId);
    const balance = Number(openingBalance) || 0;
    onSubmit({
      ...initial,
      id: initial?.id ?? uid("acct"),
      name: name.trim() || `${bank.shortName} ${type}`,
      bankId,
      type,
      last4: last4.slice(-4),
      openingBalance: balance,
      currentBalance: balance,
      color: bank.tone,
    });
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      <Field label="Bank">
        <select value={bankId} onChange={(event) => setBankId(event.target.value)}>
          {BANKS.map((bank) => (
            <option value={bank.id} key={bank.id}>
              {bank.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Account type">
        <select value={type} onChange={(event) => setType(event.target.value as AccountType)}>
          {["Checking", "Savings", "Money Market", "Cash", "Investment"].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </Field>
      <Field label="Nickname">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Everyday Checking" />
      </Field>
      <Field label="Last four">
        <input
          value={last4}
          onChange={(event) => setLast4(event.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          placeholder="1234"
        />
      </Field>
      <Field label="Current balance">
        <input
          value={openingBalance}
          onChange={(event) => setOpeningBalance(event.target.value)}
          inputMode="decimal"
          placeholder="0.00"
        />
      </Field>
      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="primary-button" type="submit">
          {initial ? <Check size={18} /> : <Plus size={18} />} {initial ? "Save account" : "Add account"}
        </button>
      </div>
    </form>
  );
}

function CardForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: UserCard;
  onSubmit: (card: UserCard) => void;
  onCancel: () => void;
}) {
  const [templateId, setTemplateId] = useState(initial?.templateId ?? CARD_CATALOG[0].id);
  const template = getTemplate(templateId);
  const [nickname, setNickname] = useState(initial?.nickname ?? template.name);
  const [issuerId, setIssuerId] = useState(initial?.issuerId ?? template.issuer);
  const [last4, setLast4] = useState(initial?.last4 ?? "");
  const [creditLimit, setCreditLimit] = useState(String(initial?.creditLimit ?? 5000));
  const [startingDebt, setStartingDebt] = useState(String(initial?.currentDebt ?? initial?.startingDebt ?? 0));
  const [apr, setApr] = useState(String(initial?.apr ?? 24.99));
  const [minimumPayment, setMinimumPayment] = useState(String(initial?.minimumPayment ?? 35));
  const [dueDay, setDueDay] = useState(String(initial?.dueDay ?? 15));
  const [statementDay, setStatementDay] = useState(String(initial?.statementDay ?? 20));

  function changeTemplate(value: string) {
    const next = getTemplate(value);
    setTemplateId(value);
    setNickname(next.name);
    setIssuerId(next.issuer);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const selected = getTemplate(templateId);
    const debt = Number(startingDebt) || 0;
    onSubmit({
      ...initial,
      id: initial?.id ?? uid("card"),
      nickname: nickname.trim() || selected.name,
      templateId,
      issuerId,
      network: selected.network,
      last4: last4.slice(-4),
      creditLimit: Number(creditLimit) || 0,
      startingDebt: debt,
      currentDebt: debt,
      apr: Number(apr) || 0,
      minimumPayment: Number(minimumPayment) || 0,
      dueDay: Math.min(28, Math.max(1, Number(dueDay) || 1)),
      statementDay: Math.min(28, Math.max(1, Number(statementDay) || 1)),
      accent: selected.accent,
      rewards: initial?.templateId === templateId ? initial.rewards : selected.rewards,
    });
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      <Field label="Card product" hint="Rewards are seeded from issuer pages and can be edited later in code.">
        <select value={templateId} onChange={(event) => changeTemplate(event.target.value)}>
          {CARD_CATALOG.map((card) => (
            <option value={card.id} key={card.id}>
              {card.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Issuer">
        <select value={issuerId} onChange={(event) => setIssuerId(event.target.value)}>
          {BANKS.map((bank) => (
            <option value={bank.id} key={bank.id}>
              {bank.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Nickname">
        <input value={nickname} onChange={(event) => setNickname(event.target.value)} />
      </Field>
      <Field label="Last four">
        <input
          value={last4}
          onChange={(event) => setLast4(event.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          placeholder="1234"
        />
      </Field>
      <Field label="Credit limit">
        <input value={creditLimit} onChange={(event) => setCreditLimit(event.target.value)} inputMode="decimal" />
      </Field>
      <Field label="Current debt">
        <input value={startingDebt} onChange={(event) => setStartingDebt(event.target.value)} inputMode="decimal" />
      </Field>
      <Field label="APR">
        <input value={apr} onChange={(event) => setApr(event.target.value)} inputMode="decimal" />
      </Field>
      <Field label="Minimum payment">
        <input value={minimumPayment} onChange={(event) => setMinimumPayment(event.target.value)} inputMode="decimal" />
      </Field>
      <Field label="Due day">
        <input value={dueDay} onChange={(event) => setDueDay(event.target.value)} inputMode="numeric" />
      </Field>
      <Field label="Statement day">
        <input value={statementDay} onChange={(event) => setStatementDay(event.target.value)} inputMode="numeric" />
      </Field>
      <div className="reward-preview">
        {template.rewards.map((rule) => (
          <span key={`${rule.category}-${rule.rate}`}>
            {percent(rule.rate)} {rule.category}
          </span>
        ))}
      </div>
      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="primary-button" type="submit">
          {initial ? <Check size={18} /> : <CreditCard size={18} />} {initial ? "Save card" : "Add card"}
        </button>
      </div>
    </form>
  );
}

function TransactionForm({
  data,
  initial,
  onSubmit,
  onCancel,
}: {
  data: AppData;
  initial?: Transaction;
  onSubmit: (txn: Transaction) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<TransactionType>(initial?.type ?? "expense");
  const [date, setDate] = useState(initial?.date ?? todayIso);
  const [merchant, setMerchant] = useState(initial?.merchant ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Groceries");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [sourceKind, setSourceKind] = useState<SourceKind>(initial?.sourceKind ?? "card");
  const [sourceId, setSourceId] = useState(initial?.sourceId ?? data.cards[0]?.id ?? data.accounts[0]?.id ?? "");
  const [paymentAccountId, setPaymentAccountId] = useState(initial?.paymentAccountId ?? data.accounts[0]?.id ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const firstTypeEffect = useRef(true);

  const selectedCard = data.cards.find((card) => card.id === sourceId);
  const estimatedCashback = type === "expense" && sourceKind === "card" ? projectedCashback(selectedCard, category, Number(amount)) : 0;

  useEffect(() => {
    if (initial && firstTypeEffect.current) {
      firstTypeEffect.current = false;
      return;
    }
    firstTypeEffect.current = false;
    if (type === "income") {
      setSourceKind("account");
      setSourceId(data.accounts[0]?.id ?? "");
      setCategory("Income");
    }
    if (type === "card-payment") {
      setSourceKind("card");
      setSourceId(data.cards[0]?.id ?? "");
      setCategory("Other");
      setMerchant("Credit card payment");
    }
  }, [type, data.accounts, data.cards]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0 || !sourceId) return;
    onSubmit({
      ...initial,
      id: initial?.id ?? uid("txn"),
      type,
      date,
      merchant: merchant.trim() || (type === "income" ? "Income" : "Transaction"),
      category,
      amount: numericAmount,
      sourceKind,
      sourceId,
      paymentAccountId: type === "card-payment" ? paymentAccountId : undefined,
      cashback: Number(estimatedCashback.toFixed(2)),
      notes,
    });
  }

  const sourceOptions = sourceKind === "card" ? data.cards : data.accounts;

  return (
    <form className="form-grid" onSubmit={submit}>
      <div className="segmented full">
        {(["expense", "income", "card-payment"] as TransactionType[]).map((item) => (
          <button type="button" key={item} className={type === item ? "active" : ""} onClick={() => setType(item)}>
            {item === "card-payment" ? "Card payment" : item}
          </button>
        ))}
      </div>
      <Field label="Date">
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </Field>
      <Field label={type === "income" ? "Source" : "Merchant"}>
        <input value={merchant} onChange={(event) => setMerchant(event.target.value)} placeholder="Apple, Costco, Payroll..." />
      </Field>
      {type !== "card-payment" && (
        <Field label="Category">
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {CATEGORIES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Amount">
        <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0.00" />
      </Field>
      {type === "expense" && (
        <Field label="Pay with">
          <div className="segmented">
            <button
              type="button"
              className={sourceKind === "card" ? "active" : ""}
              onClick={() => {
                setSourceKind("card");
                setSourceId(data.cards[0]?.id ?? "");
              }}
            >
              Card
            </button>
            <button
              type="button"
              className={sourceKind === "account" ? "active" : ""}
              onClick={() => {
                setSourceKind("account");
                setSourceId(data.accounts[0]?.id ?? "");
              }}
            >
              Account
            </button>
          </div>
        </Field>
      )}
      <Field label={type === "card-payment" ? "Card" : "Source"}>
        <select value={sourceId} onChange={(event) => setSourceId(event.target.value)}>
          {sourceOptions.map((item) => (
            <option value={item.id} key={item.id}>
              {"nickname" in item ? item.nickname : item.name}
            </option>
          ))}
        </select>
      </Field>
      {type === "card-payment" && (
        <Field label="From account">
          <select value={paymentAccountId} onChange={(event) => setPaymentAccountId(event.target.value)}>
            {data.accounts.map((account) => (
              <option value={account.id} key={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      {type === "expense" && sourceKind === "card" && (
        <div className="cashback-callout">
          <BadgeDollarSign size={20} />
          <div>
            <strong>{currency(estimatedCashback)}</strong>
            <span>estimated cashback at {percent(bestRewardRate(selectedCard!, category))}</span>
          </div>
        </div>
      )}
      <Field label="Notes">
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional" />
      </Field>
      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="primary-button" type="submit">
          {initial ? <Check size={18} /> : <ListPlus size={18} />} {initial ? "Save transaction" : "Add transaction"}
        </button>
      </div>
    </form>
  );
}

function BudgetForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Budget;
  onSubmit: (budget: Budget) => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState(initial?.category ?? "Groceries");
  const [monthlyLimit, setMonthlyLimit] = useState(String(initial?.monthlyLimit ?? 300));

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit({
      id: initial?.id ?? uid("budget"),
      category,
      monthlyLimit: Number(monthlyLimit) || 0,
    });
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      <Field label="Category">
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          {CATEGORIES.filter((item) => item !== "Income").map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </Field>
      <Field label="Monthly limit">
        <input value={monthlyLimit} onChange={(event) => setMonthlyLimit(event.target.value)} inputMode="decimal" />
      </Field>
      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="primary-button" type="submit">
          {initial ? <Check size={18} /> : <Target size={18} />} {initial ? "Save budget" : "Add budget"}
        </button>
      </div>
    </form>
  );
}

function TaskForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: TaskItem;
  onSubmit: (task: TaskItem) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [list, setList] = useState(initial?.list ?? "Personal");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? todayIso);
  const [priority, setPriority] = useState<TaskItem["priority"]>(initial?.priority ?? "medium");
  const [status, setStatus] = useState<TaskItem["status"]>(initial?.status ?? "todo");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      ...initial,
      id: initial?.id ?? uid("task"),
      title: title.trim(),
      notes,
      dueDate,
      priority,
      status,
      list: list.trim() || "Personal",
    });
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      <Field label="Task">
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Review budget, renew passport..." />
      </Field>
      <Field label="List">
        <input value={list} onChange={(event) => setList(event.target.value)} placeholder="Personal" />
      </Field>
      <Field label="Due date">
        <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
      </Field>
      <Field label="Priority">
        <select value={priority} onChange={(event) => setPriority(event.target.value as TaskItem["priority"])}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </Field>
      <Field label="Status">
        <select value={status} onChange={(event) => setStatus(event.target.value as TaskItem["status"])}>
          <option value="todo">To do</option>
          <option value="doing">Doing</option>
          <option value="done">Done</option>
        </select>
      </Field>
      <Field label="Notes">
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Details, links, next steps..." />
      </Field>
      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="primary-button" type="submit">
          {initial ? <Check size={18} /> : <SquareCheckBig size={18} />} {initial ? "Save task" : "Add task"}
        </button>
      </div>
    </form>
  );
}

function CalendarEventForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: CalendarEvent;
  onSubmit: (event: CalendarEvent) => void;
  onCancel: () => void;
}) {
  const [sourceEmail, setSourceEmail] = useState(initial?.sourceEmail ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [start, setStart] = useState(initial?.start ?? `${todayIso}T09:00`);
  const [end, setEnd] = useState(initial?.end ?? `${todayIso}T10:00`);
  const [location, setLocation] = useState(initial?.location ?? "");
  const [meetingLink, setMeetingLink] = useState(initial?.meetingLink ?? "");
  const [attendees, setAttendees] = useState((initial?.attendees ?? []).join(", "));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [color, setColor] = useState(initial?.color ?? "#0a84ff");

  function importInvite() {
    const parsed = parseMeetingEmail(sourceEmail);
    setTitle(parsed.title ?? title);
    setStart(parsed.start ?? start);
    setLocation(parsed.location ?? location);
    setMeetingLink(parsed.meetingLink ?? meetingLink);
    setAttendees((parsed.attendees ?? []).join(", "));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !start) return;
    onSubmit({
      ...initial,
      id: initial?.id ?? uid("event"),
      title: title.trim(),
      start,
      end,
      location,
      meetingLink,
      attendees: splitTags(attendees),
      sourceEmail,
      notes,
      color,
    });
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      <Field label="Paste email or invite" hint="Optional. Import fills the meeting fields from readable invite text.">
        <textarea value={sourceEmail} onChange={(event) => setSourceEmail(event.target.value)} placeholder="Subject: Product sync&#10;When: 2026-07-07 10:00..." />
      </Field>
      <div className="form-actions inline">
        <button className="secondary-button" type="button" onClick={importInvite}>
          <Mail size={18} /> Import details
        </button>
      </div>
      <Field label="Title">
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Team meeting" />
      </Field>
      <Field label="Starts">
        <input type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} />
      </Field>
      <Field label="Ends">
        <input type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} />
      </Field>
      <Field label="Location">
        <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Office, room, address..." />
      </Field>
      <Field label="Meeting link">
        <input value={meetingLink} onChange={(event) => setMeetingLink(event.target.value)} placeholder="https://..." />
      </Field>
      <Field label="Attendees">
        <input value={attendees} onChange={(event) => setAttendees(event.target.value)} placeholder="name@example.com, ..." />
      </Field>
      <Field label="Color">
        <input value={color} onChange={(event) => setColor(event.target.value)} placeholder="#0a84ff" />
      </Field>
      <Field label="Notes">
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Agenda, prep, decisions..." />
      </Field>
      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="primary-button" type="submit">
          {initial ? <Check size={18} /> : <CalendarDays size={18} />} {initial ? "Save event" : "Add event"}
        </button>
      </div>
    </form>
  );
}

function NoteForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: NoteItem;
  onSubmit: (note: NoteItem) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [pinned, setPinned] = useState(initial?.pinned ?? false);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      ...initial,
      id: initial?.id ?? uid("note"),
      title: title.trim(),
      body,
      tags: splitTags(tags),
      pinned,
    });
  }

  return (
    <form className="form-grid note-form" onSubmit={submit}>
      <Field label="Title">
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ideas, plan, travel notes..." />
      </Field>
      <Field label="Tags">
        <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="work, home, ideas" />
      </Field>
      <label className="toggle-field">
        <input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} />
        <span>Pin this note</span>
      </label>
      <Field label="Note">
        <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write anything you need to keep..." />
      </Field>
      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="primary-button" type="submit">
          {initial ? <Check size={18} /> : <NotebookPen size={18} />} {initial ? "Save note" : "Add note"}
        </button>
      </div>
    </form>
  );
}

function AccountList({
  data,
  balances,
  onEdit,
  onDelete,
}: {
  data: AppData;
  balances: Map<string, number>;
  onEdit: (account: Account) => void;
  onDelete: (id: string) => void;
}) {
  if (!data.accounts.length) {
    return <EmptyState title="Add your first bank account" body="Checking, savings, cash, and investment accounts all live here." />;
  }

  return (
    <div className="list-stack">
      {data.accounts.map((account) => {
        const bank = getBank(account.bankId);
        return (
          <article className="account-row" key={account.id}>
            <div className="bank-mark" style={{ background: account.color }}>
              {bank.shortName.slice(0, 2)}
            </div>
            <div>
              <strong>{account.name}</strong>
              <span>
                {bank.name} · {account.type} {account.last4 && `· ${account.last4}`} {account.source === "plaid" && "· live available"}
              </span>
            </div>
            <b>{currency(balances.get(account.id) ?? 0)}</b>
            <button className="ghost-icon" onClick={() => onEdit(account)} aria-label={`Edit ${account.name}`}>
              <Pencil size={16} />
            </button>
            <button className="ghost-icon" onClick={() => onDelete(account.id)} aria-label={`Delete ${account.name}`}>
              <Trash2 size={16} />
            </button>
          </article>
        );
      })}
    </div>
  );
}

function CardStack({
  data,
  balances,
  onEdit,
  onDelete,
}: {
  data: AppData;
  balances: Map<string, number>;
  onEdit: (card: UserCard) => void;
  onDelete: (id: string) => void;
}) {
  if (!data.cards.length) {
    return <EmptyState title="Add your first credit card" body="Track debt, available credit, due dates, and estimated cashback." />;
  }

  return (
    <div className="cards-grid">
      {data.cards.map((card) => {
        const debt = balances.get(card.id) ?? 0;
        const available = card.source === "plaid" && card.availableCredit != null ? card.availableCredit : card.creditLimit ? Math.max(0, card.creditLimit - debt) : null;
        const effectiveLimit = card.creditLimit || (card.source === "plaid" && card.availableCredit != null ? card.availableCredit + debt : 0);
        const util = effectiveLimit ? Math.min(100, (debt / effectiveLimit) * 100) : 0;
        const bank = getBank(card.issuerId);
        return (
          <article className="credit-card-panel" style={{ "--accent": card.accent } as React.CSSProperties} key={card.id}>
            <div className="credit-card-face">
              <div className="card-chip" />
              <div className="card-topline">
                <span>{bank.name}</span>
                <CreditCard size={22} />
              </div>
              <h3>{card.nickname}</h3>
              <div className="card-number">•••• •••• •••• {card.last4 || "0000"}</div>
              <div className="card-foot">
                <span>{card.network}</span>
                <span>Due {card.dueDay}</span>
              </div>
            </div>
            <div className="card-metrics">
              <div>
                <span>Debt</span>
                <strong>{currency(debt)}</strong>
              </div>
              <div>
                <span>Available</span>
                <strong>{available == null ? "Unknown" : currency(available)}</strong>
              </div>
              <div>
                <span>Minimum</span>
                <strong>{currency(card.minimumPayment)}</strong>
              </div>
            </div>
            <div className="progress-label">
              <span>Utilization</span>
              <b>{effectiveLimit ? `${util.toFixed(0)}%` : "N/A"}</b>
            </div>
            <div className="meter">
              <i style={{ width: `${util}%` }} />
            </div>
            {card.source === "plaid" && available == null && <p className="card-note">Plaid did not provide this card's credit limit or available credit.</p>}
            <div className="reward-preview compact">
              {card.rewards.slice(0, 4).map((rule) => (
                <span key={`${card.id}-${rule.category}`}>
                  {percent(rule.rate)} {rule.category}
                </span>
              ))}
            </div>
            <div className="card-actions">
              <button className="secondary-button" onClick={() => onEdit(card)}>
                <Pencil size={15} /> Edit
              </button>
              <button className="text-danger" onClick={() => onDelete(card.id)}>
                <Trash2 size={15} /> Remove card
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function TransactionsTable({
  data,
  onEdit,
  onDelete,
}: {
  data: AppData;
  onEdit: (txn: Transaction) => void;
  onDelete: (id: string) => void;
}) {
  if (!data.transactions.length) {
    return <EmptyState title="No transactions yet" body="Add purchases, income, and card payments to see your spending picture." />;
  }

  return (
    <div className="transaction-list">
      {data.transactions
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((txn) => (
          <article className="transaction-row" key={txn.id}>
            <div className={`txn-icon ${txn.type}`}>
              {txn.type === "income" ? <ArrowDownLeft size={18} /> : txn.type === "card-payment" ? <RefreshCw size={18} /> : <ArrowUpRight size={18} />}
            </div>
            <div className="txn-main">
              <strong>{txn.merchant}</strong>
              <span>
                {txn.category} · {sourceName(data, txn)} · {txn.date}
              </span>
            </div>
            <div className="txn-money">
              <strong className={txn.type === "income" ? "positive" : ""}>
                {txn.type === "income" ? "+" : "-"}
                {currency(txn.amount)}
              </strong>
              {txn.cashback > 0 && <span>+{currency(txn.cashback)} cash back</span>}
            </div>
            <button className="ghost-icon" onClick={() => onEdit(txn)} aria-label="Edit transaction">
              <Pencil size={16} />
            </button>
            <button className="ghost-icon" onClick={() => onDelete(txn.id)} aria-label="Delete transaction">
              <Trash2 size={16} />
            </button>
          </article>
        ))}
    </div>
  );
}

function BudgetPanel({
  data,
  onEdit,
  onDelete,
}: {
  data: AppData;
  onEdit: (budget: Budget) => void;
  onDelete: (id: string) => void;
}) {
  const categorySpend = spendingByCategory(data.transactions);
  const spendMap = new Map(categorySpend);

  if (!data.budgets.length) {
    return <EmptyState title="No budgets yet" body="Create monthly category limits and watch them fill as you spend." />;
  }

  return (
    <div className="budget-grid">
      {data.budgets.map((budget) => {
        const used = spendMap.get(budget.category) ?? 0;
        const ratio = budget.monthlyLimit ? Math.min(100, (used / budget.monthlyLimit) * 100) : 0;
        return (
          <article className="budget-card" key={budget.id}>
            <div>
              <strong>{budget.category}</strong>
              <span>
                {currency(used)} of {currency(budget.monthlyLimit)}
              </span>
            </div>
            <div className="progress-ring" style={{ "--value": `${ratio}%` } as React.CSSProperties}>
              <b>{ratio.toFixed(0)}%</b>
            </div>
            <div className="meter">
              <i style={{ width: `${ratio}%` }} />
            </div>
            <button className="ghost-icon" onClick={() => onEdit(budget)} aria-label={`Edit ${budget.category} budget`}>
              <Pencil size={16} />
            </button>
            <button className="ghost-icon" onClick={() => onDelete(budget.id)} aria-label={`Delete ${budget.category} budget`}>
              <Trash2 size={16} />
            </button>
          </article>
        );
      })}
    </div>
  );
}

function TaskBoard({
  tasks,
  onEdit,
  onDelete,
  onStatus,
}: {
  tasks: TaskItem[];
  onEdit: (task: TaskItem) => void;
  onDelete: (id: string) => void;
  onStatus: (task: TaskItem, status: TaskItem["status"]) => void;
}) {
  const columns: { id: TaskItem["status"]; label: string }[] = [
    { id: "todo", label: "To do" },
    { id: "doing", label: "Doing" },
    { id: "done", label: "Done" },
  ];

  if (!tasks.length) {
    return <EmptyState title="No tasks yet" body="Add errands, projects, renewals, reminders, and personal follow-ups in one place." />;
  }

  return (
    <div className="task-board">
      {columns.map((column) => (
        <section className="task-column" key={column.id}>
          <div className="task-column-head">
            <strong>{column.label}</strong>
            <span>{tasks.filter((task) => task.status === column.id).length}</span>
          </div>
          {tasks
            .filter((task) => task.status === column.id)
            .map((task) => (
              <article className={`task-card priority-${task.priority}`} key={task.id}>
                <div>
                  <strong>{task.title}</strong>
                  <span>
                    {task.list} {task.dueDate && `· due ${task.dueDate}`}
                  </span>
                </div>
                {task.notes && <p>{task.notes}</p>}
                <div className="card-actions">
                  <select value={task.status} onChange={(event) => onStatus(task, event.target.value as TaskItem["status"])} aria-label="Task status">
                    <option value="todo">To do</option>
                    <option value="doing">Doing</option>
                    <option value="done">Done</option>
                  </select>
                  <button className="ghost-icon" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`}>
                    <Pencil size={16} />
                  </button>
                  <button className="ghost-icon" onClick={() => onDelete(task.id)} aria-label={`Delete ${task.title}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
        </section>
      ))}
    </div>
  );
}

function CalendarImportCard({
  onImported,
  onMessage,
}: {
  onImported: (events: CalendarEvent[]) => void;
  onMessage: (message: string) => void;
}) {
  const [accountEmail, setAccountEmail] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [icsText, setIcsText] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);

  async function chooseFile(file?: File) {
    if (!file) return;
    setFileName(file.name);
    setIcsText(await file.text());
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!accountEmail.trim() || (!feedUrl.trim() && !icsText.trim())) {
      onMessage("Add the calendar email, then paste a feed URL or upload an .ics file.");
      return;
    }
    setBusy(true);
    try {
      const result = await api<CalendarImportResult>("/data/calendar-events/import", {
        method: "POST",
        body: JSON.stringify({ accountEmail: accountEmail.trim(), feedUrl: feedUrl.trim(), icsText }),
      });
      onImported(result.events);
      onMessage(`Imported ${result.created} new event${result.created === 1 ? "" : "s"} and refreshed ${result.updated}.`);
      setFeedUrl("");
      setIcsText("");
      setFileName("");
    } catch (caught) {
      onMessage(caught instanceof Error ? caught.message : "Calendar import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="calendar-import-card" onSubmit={submit}>
      <div>
        <p className="eyebrow">Import account</p>
        <h3>Add calendars from any email</h3>
        <span>Use a private calendar feed URL or an exported .ics file from Google, Outlook, Apple, Yahoo, work calendars, or other providers.</span>
      </div>
      <div className="import-fields">
        <input type="email" value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} placeholder="email@example.com" />
        <input value={feedUrl} onChange={(event) => setFeedUrl(event.target.value)} placeholder="https://.../calendar.ics" />
        <label className="file-import-button">
          <Upload size={17} />
          <span>{fileName || "Upload .ics"}</span>
          <input type="file" accept=".ics,text/calendar" onChange={(event) => void chooseFile(event.target.files?.[0])} />
        </label>
        <button className="primary-button" type="submit" disabled={busy}>
          <Download size={18} /> {busy ? "Importing" : "Import events"}
        </button>
      </div>
    </form>
  );
}

function GoogleCalendarConnect({
  status,
  onConnected,
  onImported,
  onMessage,
}: {
  status: CalendarStatus;
  onConnected: () => Promise<void>;
  onImported: (events: CalendarEvent[]) => void;
  onMessage: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type !== "calendar-google-callback") return;
      setBusy(false);
      onMessage(event.data.ok ? "Google Calendar connected. Click Sync Gmail to import events." : event.data.message || "Google Calendar connection failed.");
      void onConnected();
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onConnected, onMessage]);

  async function connectGoogle() {
    if (!status.googleConfigured) {
      onMessage("Google Calendar is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env, then restart npm run dev.");
      return;
    }
    setBusy(true);
    try {
      const result = await api<{ url: string }>("/calendar/google/auth-url", { method: "POST", body: "{}" });
      const popup = window.open(result.url, "google-calendar", "width=520,height=720");
      if (!popup) {
        onMessage("Allow popups for this site to connect Google Calendar.");
        setBusy(false);
        return;
      }
      const timer = window.setInterval(() => {
        if (!popup.closed) return;
        window.clearInterval(timer);
        setBusy(false);
        void onConnected();
      }, 800);
    } catch (caught) {
      setBusy(false);
      onMessage(caught instanceof Error ? caught.message : "Google Calendar connection failed.");
    }
  }

  async function syncGoogle() {
    setBusy(true);
    try {
      const result = await api<CalendarImportResult>("/calendar/sync", { method: "POST", body: "{}" });
      onImported(result.events);
      await onConnected();
      onMessage(`Google Calendar synced ${result.total} event${result.total === 1 ? "" : "s"}.`);
    } catch (caught) {
      onMessage(caught instanceof Error ? caught.message : "Google Calendar sync failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="calendar-account-card">
      <div>
        <p className="eyebrow">Google sync</p>
        <h3>Gmail calendars</h3>
        <span>Connect with the Google popup, then sync events from every selected Google calendar.</span>
      </div>
      <div className="calendar-account-actions">
        <button className="primary-button" onClick={connectGoogle} disabled={busy}>
          <Mail size={18} /> {busy ? "Finish Google login" : status.accounts.some((account) => account.provider === "google") ? "Add Google account" : "Connect Gmail"}
        </button>
        <button className="secondary-button" onClick={syncGoogle} disabled={busy || !status.accounts.length}>
          <RefreshCw size={18} /> {busy ? "Working" : "Sync Gmail"}
        </button>
      </div>
      {status.accounts.length > 0 && (
        <div className="calendar-account-list">
          {status.accounts.map((account) => (
            <article className="calendar-account-row" key={account.id}>
              <div>
                <strong>{account.email}</strong>
                <span>{account.status === "needs_reauth" ? "Reconnect needed" : account.lastSyncedAt ? `Last synced ${formatEventTime(account.lastSyncedAt)}` : "Ready to sync"}</span>
              </div>
              <div className="calendar-source-list">
                {account.calendars.map((calendar) => (
                  <span key={calendar.id}>
                    <i style={{ background: calendar.backgroundColor }} />
                    {calendar.summary}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function CalendarPanel({
  events,
  onEdit,
  onDelete,
}: {
  events: CalendarEvent[];
  onEdit: (event: CalendarEvent) => void;
  onDelete: (id: string) => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(todayIso));
  const visibleMonthKey = monthKey(visibleMonth);
  const monthCells = calendarMonthCells(visibleMonth);
  const monthEvents = events.filter((event) => event.start.startsWith(visibleMonthKey)).sort((a, b) => a.start.localeCompare(b.start));
  const monthTitle = visibleMonth.toLocaleDateString([], { month: "long", year: "numeric" });

  return (
    <div className="calendar-layout">
      <section className="apple-calendar">
        <div className="calendar-nav">
          <div>
            <p className="eyebrow">Month view</p>
            <h3>{monthTitle}</h3>
          </div>
          <div className="calendar-nav-actions">
            <button className="secondary-button" onClick={() => setVisibleMonth((current) => shiftMonth(current, -1))} type="button">
              Previous
            </button>
            <button className="secondary-button" onClick={() => setVisibleMonth(new Date(todayIso))} type="button">
              Today
            </button>
            <button className="secondary-button" onClick={() => setVisibleMonth((current) => shiftMonth(current, 1))} type="button">
              Next
            </button>
          </div>
        </div>
        <div className="calendar-weekdays">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="calendar-grid">
          {monthCells.map((cell) => {
            const dayEvents = events.filter((event) => event.start.startsWith(cell.key)).sort((a, b) => a.start.localeCompare(b.start));
            return (
              <div className={`calendar-day ${cell.key === todayIso ? "today" : ""} ${cell.inMonth ? "" : "muted"}`} key={cell.key}>
                <b>{cell.date.getDate()}</b>
                {dayEvents.slice(0, 2).map((event) => (
                  <button key={event.id} style={{ "--event-color": event.color } as React.CSSProperties} onClick={() => onEdit(event)}>
                    {event.title}
                  </button>
                ))}
                {dayEvents.length > 2 && <span className="more-events">+{dayEvents.length - 2} more</span>}
              </div>
            );
          })}
        </div>
      </section>
      <section className="agenda-panel">
        <div className="panel-head slim">
          <div>
            <p className="eyebrow">Agenda</p>
            <h2>{monthTitle}</h2>
          </div>
          <Clock3 size={21} />
        </div>
        <div className="list-stack">
          {monthEvents.length === 0 ? (
            <EmptyState title="Month is clear" body="Switch months to browse past or future events." />
          ) : (
            monthEvents.map((event) => (
              <article className="event-row" key={event.id}>
                <div className="event-dot" style={{ background: event.color }} />
                <div>
                  <strong>{event.title}</strong>
                  <span>{formatEventTime(event.start)}</span>
                  {(event.location || event.meetingLink) && (
                    <small>
                      {event.location}
                      {event.location && event.meetingLink ? " · " : ""}
                      {event.meetingLink && "Video meeting"}
                    </small>
                  )}
                </div>
                <button className="ghost-icon" onClick={() => onEdit(event)} aria-label={`Edit ${event.title}`}>
                  <Pencil size={16} />
                </button>
                <button className="ghost-icon" onClick={() => onDelete(event.id)} aria-label={`Delete ${event.title}`}>
                  <Trash2 size={16} />
                </button>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function NotesPanel({
  notes,
  onEdit,
  onDelete,
}: {
  notes: NoteItem[];
  onEdit: (note: NoteItem) => void;
  onDelete: (id: string) => void;
}) {
  if (!notes.length) {
    return <EmptyState title="No notes yet" body="Keep editable notes, ideas, lists, and personal reference material here." />;
  }

  return (
    <div className="notes-grid">
      {notes.map((note) => (
        <article className={`note-card ${note.pinned ? "pinned" : ""}`} key={note.id}>
          <div className="note-head">
            <div>
              <strong>{note.title}</strong>
              {note.updatedAt && <span>Edited {new Date(note.updatedAt).toLocaleDateString()}</span>}
            </div>
            {note.pinned && <Pin size={17} />}
          </div>
          <p>{note.body || "Empty note"}</p>
          <div className="reward-preview compact">
            {note.tags.map((tag) => (
              <span key={`${note.id}-${tag}`}>{tag}</span>
            ))}
          </div>
          <div className="card-actions">
            <button className="secondary-button" onClick={() => onEdit(note)}>
              <Pencil size={15} /> Edit
            </button>
            <button className="text-danger" onClick={() => onDelete(note.id)}>
              <Trash2 size={15} /> Remove
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function SpendingChart({ transactions }: { transactions: Transaction[] }) {
  const categories = spendingByCategory(transactions).slice(0, 8);
  const max = Math.max(1, ...categories.map(([, value]) => value));

  if (!categories.length) {
    return <EmptyState title="No spending this month" body="Your category chart will appear once you add expenses." />;
  }

  return (
    <div className="bar-chart">
      {categories.map(([category, value], index) => (
        <div className="bar-row" key={category}>
          <span>{category}</span>
          <div className="bar-track">
            <i style={{ width: `${Math.max(8, (value / max) * 100)}%`, animationDelay: `${index * 70}ms` }} />
          </div>
          <b>{currency(value)}</b>
        </div>
      ))}
    </div>
  );
}

function RewardsLibrary() {
  return (
    <div className="library-grid">
      {CARD_CATALOG.map((card) => {
        const bank = getBank(card.issuer);
        return (
          <article className="library-card" key={card.id}>
            <div className="library-head">
              <div className="bank-mark" style={{ background: card.accent }}>
                {bank.shortName.slice(0, 2)}
              </div>
              <div>
                <strong>{card.name}</strong>
                <span>
                  {bank.name} · {card.network} · {card.annualFee}
                </span>
              </div>
            </div>
            <div className="reward-preview">
              {card.rewards.map((rule) => (
                <span key={`${card.id}-${rule.category}`}>
                  {percent(rule.rate)} {rule.category}
                </span>
              ))}
            </div>
            <a href={card.sourceUrl} target="_blank" rel="noreferrer">
              {card.sourceLabel} <ArrowRight size={14} />
            </a>
          </article>
        );
      })}
    </div>
  );
}

function AuthScreen({ onAuthed }: { onAuthed: (user: User) => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const result = await api<{ user?: User; token?: string; message?: string }>(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
      });
      if (result.user) {
        setSessionToken(result.token);
        onAuthed(result.user);
      } else {
        setNotice(result.message ?? "Your account request was sent. You can sign in after the admin approves it.");
        setMode("signin");
        setPassword("");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel animate-rise">
        <div className="brand auth-brand">
          <div className="brand-mark">
            <Sparkles size={24} />
          </div>
          <div>
            <strong>Personal Assistant</strong>
            <span>Encrypted life workspace</span>
          </div>
        </div>
        <div>
          <p className="eyebrow">Secure access</p>
          <h1>{mode === "signin" ? "Sign in" : "Create account"}</h1>
          <p className="body-copy">
            {mode === "signin"
              ? "Use a strong password. Bank tokens are encrypted server-side and never stored in the browser."
              : "New accounts are held for admin approval before they can access the workspace."}
          </p>
        </div>
        <form className="form-grid auth-form" onSubmit={submit}>
          {mode === "signup" && (
            <Field label="Name">
              <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
            </Field>
          )}
          <Field label="Email">
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
          </Field>
          <Field label="Password" hint="Minimum 10 characters. Use a password manager.">
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={10} required />
          </Field>
          {notice && <p className="form-notice">{notice}</p>}
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError("");
                setNotice("");
              }}
            >
              {mode === "signin" ? "Create account" : "Use sign in"}
            </button>
            <button className="primary-button" type="submit" disabled={busy}>
              <LogIn size={18} /> {busy ? "Please wait" : mode === "signin" ? "Sign in" : "Sign up"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function AdminPanel() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const pendingCount = users.filter((item) => item.approvalStatus === "pending").length;

  async function loadUsers() {
    const result = await api<{ users: ManagedUser[] }>("/auth/admin/users");
    setUsers(result.users);
  }

  useEffect(() => {
    void loadUsers().catch((caught) => setMessage(caught instanceof Error ? caught.message : "Could not load users."));
  }, []);

  async function reviewUser(id: string, action: "approve" | "reject") {
    setBusyId(id);
    setMessage("");
    try {
      await api(`/auth/admin/users/${id}/${action}`, { method: "POST", body: "{}" });
      await loadUsers();
      setMessage(action === "approve" ? "User approved." : "User rejected.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Could not update user.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="panel animate-fade">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Access control</p>
          <h2>Signup approvals</h2>
        </div>
        <span className="count-pill">{pendingCount} pending</span>
      </div>
      <p className="body-copy">New signups cannot enter the workspace until you approve them here.</p>
      {message && <div className="status-strip compact">{message}</div>}
      <div className="admin-list">
        {users.length === 0 ? (
          <EmptyState title="No signup requests" body="New account requests will appear here." />
        ) : (
          users.map((item) => (
            <div className="admin-row" key={item.id}>
              <div className="admin-avatar">{(item.name || item.email).slice(0, 1).toUpperCase()}</div>
              <div>
                <strong>{item.name || item.email}</strong>
                <span>{item.email}</span>
                {item.createdAt && <small>Requested {new Date(item.createdAt).toLocaleDateString()}</small>}
              </div>
              <span className={`approval-pill ${item.approvalStatus ?? "pending"}`}>{item.approvalStatus ?? "pending"}</span>
              <div className="admin-actions">
                <button className="secondary-button" onClick={() => void reviewUser(item.id, "approve")} disabled={busyId === item.id || item.approvalStatus === "approved"}>
                  <UserCheck size={18} /> Approve
                </button>
                <button className="text-danger" onClick={() => void reviewUser(item.id, "reject")} disabled={busyId === item.id || item.approvalStatus === "rejected"}>
                  <UserX size={16} /> Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function PlaidConnectButton({
  configured,
  environment,
  onMessage,
  onSynced,
}: {
  configured: boolean;
  environment: string;
  onMessage: (message: string) => void;
  onSynced: () => Promise<void>;
}) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function prepareLink() {
    if (!configured) {
      onMessage("Plaid is not configured yet. Add PLAID_CLIENT_ID and PLAID_SECRET to .env, then restart npm run dev.");
      return;
    }
    if (environment === "sandbox") {
      onMessage("Plaid sandbox: real phone numbers are rejected. Use 415-555-0010 with OTP 123456, then choose a sandbox institution.");
    }
    setBusy(true);
    try {
      const result = await api<{ linkToken: string }>("/plaid/link-token", { method: "POST", body: "{}" });
      setLinkToken(result.linkToken);
    } catch (caught) {
      onMessage(caught instanceof Error ? caught.message : "Plaid setup failed.");
    } finally {
      setBusy(false);
    }
  }

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken, metadata) => {
      await api("/plaid/exchange-public-token", {
        method: "POST",
        body: JSON.stringify({ publicToken, metadata }),
      });
      await onSynced();
      setLinkToken(null);
    },
  });

  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, open, ready]);

  return (
    <button className="primary-button" onClick={prepareLink} disabled={busy}>
      <LinkIcon size={18} /> {busy ? "Connecting" : configured ? "Connect bank" : "Plaid setup needed"}
    </button>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [activeTab, setActiveTab] = useState<ViewId>(() => viewFromPath(window.location.pathname));
  const [modal, setModal] = useState<ModalState>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [plaidStatus, setPlaidStatus] = useState<PlaidStatus>({ configured: false, environment: "sandbox" });
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>({ googleConfigured: false, accounts: [] });
  const [financeOpen, setFinanceOpen] = useState(true);

  async function loadData() {
    const next = await api<AppData>("/data");
    setData(next);
  }

  async function loadPlaidStatus() {
    const next = await api<PlaidStatus>("/plaid/status");
    setPlaidStatus(next);
  }

  async function loadCalendarStatus() {
    const next = await api<CalendarStatus>("/calendar/status");
    setCalendarStatus(next);
  }

  useEffect(() => {
    api<{ user: User }>("/auth/me")
      .then(async (result) => {
        setUser(result.user);
        await Promise.all([loadData(), loadPlaidStatus(), loadCalendarStatus()]);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handlePopState() {
      setActiveTab(viewFromPath(window.location.pathname));
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const balances = useMemo(() => calculateBalances(data), [data]);
  const cash = [...balances.accountBalances.values()].reduce((sum, value) => sum + value, 0);
  const debt = [...balances.cardBalances.values()].reduce((sum, value) => sum + value, 0);
  const netWorth = cash - debt;
  const monthlySpend = monthSpend(data.transactions);
  const monthlyCashback = monthCashback(data.transactions);
  const openTasks = data.tasks.filter((task) => task.status !== "done");
  const todayTasks = openTasks.filter((task) => isToday(task.dueDate));
  const upcomingEvents = data.calendarEvents.filter((event) => isUpcoming(event.start)).slice(0, 5);
  const pinnedNotes = data.notes.filter((note) => note.pinned).slice(0, 3);
  const isAdmin = user?.role === "admin";
  const filteredData = useMemo(() => {
    if (!query.trim()) return data;
    const needle = query.toLowerCase();
    return {
      ...data,
      transactions: data.transactions.filter((txn) =>
        [txn.merchant, txn.category, sourceName(data, txn), txn.notes ?? ""].some((part) => part.toLowerCase().includes(needle))
      ),
    };
  }, [data, query]);

  useEffect(() => {
    if (user && !isAdmin && activeTab === "admin") {
      navigateTo("dashboard");
    }
  }, [activeTab, isAdmin, user]);

  function navigateTo(view: ViewId) {
    setActiveTab(view);
    const nextPath = VIEW_PATHS[view];
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `personal-assistant-${todayIso}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function createItem<T extends keyof AppData>(collection: T, endpoint: string, item: AppData[T][number]) {
    const created = await api<AppData[T][number]>(endpoint, { method: "POST", body: JSON.stringify(item) });
    setData((current) => {
      const exists = current[collection].some((existing) => existing.id === created.id);
      return {
        ...current,
        [collection]: exists ? current[collection].map((existing) => (existing.id === created.id ? created : existing)) : [created, ...current[collection]],
      };
    });
  }

  async function updateItem<T extends keyof AppData>(collection: T, endpoint: string, item: AppData[T][number]) {
    const updated = await api<AppData[T][number]>(endpoint, { method: "PUT", body: JSON.stringify(item) });
    setData((current) => ({
      ...current,
      [collection]: current[collection].map((existing) => (existing.id === updated.id ? updated : existing)),
    }));
  }

  async function deleteItem(collection: keyof AppData, id: string) {
    await api(`/data/${DATA_ENDPOINTS[collection]}/${id}`, { method: "DELETE" });
    setData((current) => ({ ...current, [collection]: current[collection].filter((item) => item.id !== id) }));
  }

  function mergeImportedEvents(events: CalendarEvent[]) {
    setData((current) => {
      const importedIds = new Set(events.map((event) => event.id));
      return {
        ...current,
        calendarEvents: [...events, ...current.calendarEvents.filter((event) => !importedIds.has(event.id))].sort((a, b) => a.start.localeCompare(b.start)),
      };
    });
  }

  async function syncLiveData() {
    if (!plaidStatus.configured) {
      setStatus("Plaid is not configured yet. Add PLAID_CLIENT_ID and PLAID_SECRET to .env, then restart npm run dev.");
      return;
    }
    setStatus("Syncing live data...");
    try {
      await api("/plaid/sync", { method: "POST", body: "{}" });
      await loadData();
      setStatus("Live data synced.");
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : "Sync failed.");
    }
  }

  async function resetWorkspaceData() {
    if (!confirm("Delete all assistant data for this user, including finances, tasks, calendar events, notes, and linked institutions?")) return;
    await api("/data/reset", { method: "POST", body: "{}" });
    setData(DEFAULT_DATA);
  }

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST", body: "{}" });
    } finally {
      clearSessionToken();
      setUser(null);
      setData(DEFAULT_DATA);
    }
  }

  if (loading) {
    return (
      <div className="loading-shell">
        <RefreshCw size={22} />
        <span>Loading secure workspace</span>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        onAuthed={async (nextUser) => {
          setUser(nextUser);
          await Promise.all([loadData(), loadPlaidStatus(), loadCalendarStatus()]);
        }}
      />
    );
  }

  const financeTabs: ViewId[] = ["finance", "accounts", "cards", "transactions", "budgets", "rewards"];
  const financeActive = financeTabs.includes(activeTab);
  const financeSubItems: { id: ViewId; label: string; icon: ReactNode }[] = [
    { id: "accounts", label: "Accounts", icon: <Landmark size={18} /> },
    { id: "cards", label: "Cards", icon: <WalletCards size={18} /> },
    { id: "transactions", label: "Spending", icon: <Receipt size={18} /> },
    { id: "budgets", label: "Budgets", icon: <Target size={18} /> },
    { id: "rewards", label: "Rewards", icon: <BadgeDollarSign size={18} /> },
  ];
  const navItems: { id: ViewId; label: string; icon: ReactNode }[] = [
    { id: "dashboard", label: "Today", icon: <LayoutDashboard size={19} /> },
    { id: "tasks", label: "Tasks", icon: <ClipboardList size={19} /> },
    { id: "calendar", label: "Calendar", icon: <CalendarDays size={19} /> },
    { id: "notes", label: "Notes", icon: <NotebookPen size={19} /> },
    { id: "finance", label: "Finances", icon: <CircleDollarSign size={19} /> },
    ...(isAdmin ? [{ id: "admin" as ViewId, label: "Admin", icon: <Users size={19} /> }] : []),
  ];
  const allNavItems = [...navItems, ...financeSubItems];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={24} />
          </div>
          <div>
            <strong>Personal Assistant</strong>
            <span>All-in-one secure sync</span>
          </div>
        </div>
        <nav>
          {navItems.map((item) => (
            <div className="nav-group" key={item.id}>
              <button
                className={`${activeTab === item.id || (item.id === "finance" && financeActive) ? "active" : ""} ${item.id === "finance" ? "has-children" : ""}`}
                onClick={() => {
                  if (item.id === "finance") {
                    setFinanceOpen((current) => !current);
                    navigateTo("finance");
                    return;
                  }
                  navigateTo(item.id);
                }}
              >
                {item.icon}
                {item.label}
                {item.id === "finance" && <ChevronRight className={financeOpen || financeActive ? "chevron open" : "chevron"} size={17} />}
              </button>
              {item.id === "finance" && (financeOpen || financeActive) && (
                <div className="subnav">
                  {financeSubItems.map((subItem) => (
                    <button key={subItem.id} className={activeTab === subItem.id ? "active" : ""} onClick={() => navigateTo(subItem.id)}>
                      {subItem.icon}
                      {subItem.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="security-note">
          <ShieldCheck size={18} />
          <span>Signed in as {user.email}</span>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{financeActive ? "Finance module" : "Personal assistant"}</p>
            <h1>{activeTab === "dashboard" ? "Today" : allNavItems.find((item) => item.id === activeTab)?.label ?? "Today"}</h1>
          </div>
          <div className="top-actions">
            <div className="searchbox">
              <Search size={17} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search finance" />
            </div>
            <button className="icon-button" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button className="secondary-button" onClick={syncLiveData}>
              <RefreshCw size={18} /> Sync
            </button>
            <button className="icon-button" onClick={logout} aria-label="Sign out">
              <LogOut size={18} />
            </button>
            <button
              className="primary-button"
              onClick={() =>
                setModal(
                  activeTab === "calendar"
                    ? { type: "calendar" }
                    : activeTab === "notes"
                      ? { type: "note" }
                      : financeActive
                        ? { type: "transaction" }
                        : { type: "task" }
                )
              }
            >
              <Plus size={18} /> {activeTab === "calendar" ? "Event" : activeTab === "notes" ? "Note" : financeActive ? "Transaction" : "Task"}
            </button>
          </div>
        </header>
        {status && <div className="status-strip">{status}</div>}

        {activeTab === "dashboard" && (
          <div className="page-grid animate-fade">
            <section className="hero-panel">
              <div>
                <p className="eyebrow">Your day</p>
                <h2>{openTasks.length} open tasks</h2>
                <span>
                  {upcomingEvents.length} upcoming events · {pinnedNotes.length} pinned notes · {currency(netWorth)} net worth
                </span>
              </div>
              <div className="hero-orbit">
                <div className="hero-phone">
                  <div className="phone-pill" />
                  <strong>{todayTasks.length || upcomingEvents.length}</strong>
                  <span>{todayTasks.length ? "tasks due today" : "meetings ahead"}</span>
                  <div className="assistant-stack">
                    <span><SquareCheckBig size={16} /> Tasks</span>
                    <span><CalendarDays size={16} /> Calendar</span>
                    <span><NotebookPen size={16} /> Notes</span>
                  </div>
                </div>
              </div>
            </section>

            <div className="stats-grid">
              <StatTile label="Tasks" value={String(openTasks.length)} detail={`${todayTasks.length} due today`} icon={<SquareCheckBig size={20} />} tone="blue" />
              <StatTile label="Calendar" value={String(upcomingEvents.length)} detail="Upcoming schedule" icon={<CalendarDays size={20} />} tone="green" />
              <StatTile label="Notes" value={String(data.notes.length)} detail={`${pinnedNotes.length} pinned`} icon={<NotebookPen size={20} />} tone="pink" />
              <StatTile label="Net worth" value={currency(netWorth)} detail={`${currency(monthlySpend)} spent this month`} icon={<CircleDollarSign size={20} />} tone="orange" />
            </div>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Focus</p>
                  <h2>Tasks due soon</h2>
                </div>
                <ClipboardList size={22} />
              </div>
              <div className="list-stack">
                {openTasks.slice(0, 5).length ? (
                  openTasks.slice(0, 5).map((task) => (
                    <div className="due-row" key={task.id}>
                      <div>
                        <strong>{task.title}</strong>
                        <span>{task.list} · {task.dueDate || "No due date"}</span>
                      </div>
                      <button className="ghost-icon" onClick={() => setModal({ type: "task", item: task })} aria-label={`Edit ${task.title}`}>
                        <Pencil size={16} />
                      </button>
                    </div>
                  ))
                ) : (
                  <EmptyState title="Nothing pressing" body="Your open task list is clear." />
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Schedule</p>
                  <h2>Upcoming events</h2>
                </div>
                <CalendarDays size={22} />
              </div>
              <div className="list-stack">
                {upcomingEvents.length ? (
                  upcomingEvents.map((event) => (
                    <div className="due-row" key={event.id}>
                      <div>
                        <strong>{event.title}</strong>
                        <span>{formatEventTime(event.start)}</span>
                      </div>
                      {event.meetingLink && <Video size={18} />}
                    </div>
                  ))
                ) : (
                  <EmptyState title="No upcoming events" body="Import meetings or add personal appointments from Calendar." />
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Finance pulse</p>
                  <h2>Spending by category</h2>
                </div>
                <LineChart size={22} />
              </div>
              <SpendingChart transactions={data.transactions} />
            </section>

            <section className="panel wide">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Pinned</p>
                  <h2>Notes</h2>
                </div>
                <NotebookPen size={22} />
              </div>
              <NotesPanel notes={pinnedNotes.length ? pinnedNotes : data.notes.slice(0, 3)} onEdit={(note) => setModal({ type: "note", item: note })} onDelete={(id) => void deleteItem("notes", id)} />
            </section>
          </div>
        )}

        {activeTab === "tasks" && (
          <section className="panel animate-fade">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Task management</p>
                <h2>Tasks and follow-ups</h2>
              </div>
              <button className="primary-button" onClick={() => setModal({ type: "task" })}>
                <Plus size={18} /> Task
              </button>
            </div>
            <TaskBoard
              tasks={data.tasks}
              onEdit={(task) => setModal({ type: "task", item: task })}
              onDelete={(id) => void deleteItem("tasks", id)}
              onStatus={(task, status) => void updateItem("tasks", `/data/tasks/${task.id}`, { ...task, status })}
            />
          </section>
        )}

        {activeTab === "calendar" && (
          <section className="panel animate-fade">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Calendar</p>
                <h2>Meetings and appointments</h2>
              </div>
              <button className="primary-button" onClick={() => setModal({ type: "calendar" })}>
                <Plus size={18} /> Event
              </button>
            </div>
            <GoogleCalendarConnect status={calendarStatus} onConnected={async () => { await Promise.all([loadCalendarStatus(), loadData()]); }} onImported={mergeImportedEvents} onMessage={setStatus} />
            <CalendarImportCard onImported={mergeImportedEvents} onMessage={setStatus} />
            <CalendarPanel events={data.calendarEvents} onEdit={(event) => setModal({ type: "calendar", item: event })} onDelete={(id) => void deleteItem("calendarEvents", id)} />
          </section>
        )}

        {activeTab === "notes" && (
          <section className="panel animate-fade">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Notes</p>
                <h2>Editable personal notes</h2>
              </div>
              <button className="primary-button" onClick={() => setModal({ type: "note" })}>
                <Plus size={18} /> Note
              </button>
            </div>
            <NotesPanel notes={data.notes} onEdit={(note) => setModal({ type: "note", item: note })} onDelete={(id) => void deleteItem("notes", id)} />
          </section>
        )}

        {activeTab === "finance" && (
          <div className="page-grid animate-fade">
            <section className="hero-panel finance-hero">
              <div>
                <p className="eyebrow">Finance dashboard</p>
                <h2>{currency(netWorth)}</h2>
                <span>
                  {currency(cash)} cash and assets · {currency(debt)} credit card debt · {currency(monthlyCashback)} cashback
                </span>
              </div>
              <div className="finance-links">
                {[
                  ["Accounts", "accounts", <Landmark size={19} />],
                  ["Cards", "cards", <WalletCards size={19} />],
                  ["Spending", "transactions", <Receipt size={19} />],
                  ["Budgets", "budgets", <Target size={19} />],
                  ["Rewards", "rewards", <BadgeDollarSign size={19} />],
                ].map(([label, id, icon]) => (
                  <button key={String(id)} className="secondary-button" onClick={() => navigateTo(id as ViewId)}>
                    {icon} {label}
                  </button>
                ))}
              </div>
            </section>

            <div className="stats-grid">
              <StatTile label="Cash and assets" value={currency(cash)} detail={`${data.accounts.length} accounts tracked`} icon={<Landmark size={20} />} tone="blue" />
              <StatTile label="Credit debt" value={currency(debt)} detail={`${data.cards.length} cards tracked`} icon={<WalletCards size={20} />} tone="orange" />
              <StatTile label="Monthly spend" value={currency(monthlySpend)} detail="Current month expenses" icon={<Receipt size={20} />} tone="pink" />
              <StatTile label="Cashback" value={currency(monthlyCashback)} detail="Estimated from card rules" icon={<BadgeDollarSign size={20} />} tone="green" />
            </div>

            <section className="panel wide">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Analytics</p>
                  <h2>Spending by category</h2>
                </div>
                <LineChart size={22} />
              </div>
              <SpendingChart transactions={data.transactions} />
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Upcoming</p>
                  <h2>Card payments</h2>
                </div>
                <CalendarDays size={22} />
              </div>
              <div className="list-stack">
                {data.cards.length ? (
                  data.cards.map((card) => {
                    const debtValue = balances.cardBalances.get(card.id) ?? 0;
                    return (
                      <div className="due-row" key={card.id}>
                        <div>
                          <strong>{card.nickname}</strong>
                          <span>Due day {card.dueDay} · minimum {currency(card.minimumPayment)}</span>
                        </div>
                        <b>{currency(debtValue)}</b>
                      </div>
                    );
                  })
                ) : (
                  <EmptyState title="No cards yet" body="Add credit cards to track payments, debt, and rewards." />
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Recent</p>
                  <h2>Latest transactions</h2>
                </div>
                <Receipt size={22} />
              </div>
              <TransactionsTable
                data={{ ...data, transactions: data.transactions.slice(0, 5) }}
                onEdit={(txn) => setModal({ type: "transaction", item: txn })}
                onDelete={(id) => void deleteItem("transactions", id)}
              />
            </section>
          </div>
        )}

        {activeTab === "accounts" && (
          <section className="panel animate-fade">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Banking</p>
                <h2>Accounts</h2>
              </div>
              <div className="panel-actions">
                <PlaidConnectButton configured={plaidStatus.configured} environment={plaidStatus.environment} onMessage={setStatus} onSynced={loadData} />
                <button className="secondary-button" onClick={() => setModal({ type: "account" })}>
                  <Plus size={18} /> Manual
                </button>
              </div>
            </div>
            <AccountList
              data={data}
              balances={balances.accountBalances}
              onEdit={(account) => setModal({ type: "account", item: account })}
              onDelete={(id) => void deleteItem("accounts", id)}
            />
          </section>
        )}

        {activeTab === "cards" && (
          <section className="panel animate-fade">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Credit</p>
                <h2>Credit cards and debt</h2>
              </div>
              <div className="panel-actions">
                <PlaidConnectButton configured={plaidStatus.configured} environment={plaidStatus.environment} onMessage={setStatus} onSynced={loadData} />
                <button className="secondary-button" onClick={() => setModal({ type: "card" })}>
                  <Plus size={18} /> Manual
                </button>
              </div>
            </div>
            <CardStack
              data={data}
              balances={balances.cardBalances}
              onEdit={(card) => setModal({ type: "card", item: card })}
              onDelete={(id) => void deleteItem("cards", id)}
            />
          </section>
        )}

        {activeTab === "transactions" && (
          <section className="panel animate-fade">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Ledger</p>
                <h2>Spending and income</h2>
              </div>
              <button className="primary-button" onClick={() => setModal({ type: "transaction" })}>
                <Plus size={18} /> Transaction
              </button>
            </div>
            <TransactionsTable
              data={filteredData}
              onEdit={(txn) => setModal({ type: "transaction", item: txn })}
              onDelete={(id) => void deleteItem("transactions", id)}
            />
          </section>
        )}

        {activeTab === "budgets" && (
          <section className="panel animate-fade">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Planning</p>
                <h2>Monthly budgets</h2>
              </div>
              <button className="primary-button" onClick={() => setModal({ type: "budget" })}>
                <Plus size={18} /> Budget
              </button>
            </div>
            <BudgetPanel
              data={data}
              onEdit={(budget) => setModal({ type: "budget", item: budget })}
              onDelete={(id) => void deleteItem("budgets", id)}
            />
          </section>
        )}

        {activeTab === "rewards" && (
          <div className="page-grid animate-fade">
            <section className="panel wide">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Cashback library</p>
                  <h2>U.S. card reward templates</h2>
                </div>
                <BadgeDollarSign size={22} />
              </div>
              <p className="body-copy">Reward templates help estimate cashback for manual cards. Live balances and transactions come from connected institutions when Plaid is configured.</p>
              <RewardsLibrary />
            </section>
            <section className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Data</p>
                  <h2>Backup and reset</h2>
                </div>
                <Settings size={22} />
              </div>
              <div className="settings-stack">
                <button className="secondary-button" onClick={exportData}>
                  <Download size={18} /> Export JSON
                </button>
                <button className="secondary-button" onClick={syncLiveData}>
                  <RefreshCw size={18} /> Sync live data
                </button>
                <button className="text-danger" onClick={resetWorkspaceData}>
                  <Trash2 size={16} /> Delete all data
                </button>
              </div>
            </section>
          </div>
        )}

        {activeTab === "admin" && isAdmin && <AdminPanel />}
      </main>

      <nav className="bottom-nav">
        {navItems.slice(0, 5).map((item) => (
          <button key={item.id} className={activeTab === item.id ? "active" : ""} onClick={() => navigateTo(item.id)} aria-label={item.label}>
            {item.icon}
          </button>
        ))}
      </nav>

      {modal?.type === "account" && (
        <Modal title={modal.item ? "Edit account" : "Add account"} onClose={() => setModal(null)}>
          <AccountForm
            initial={modal.item}
            onCancel={() => setModal(null)}
            onSubmit={async (account) => {
              if (modal.item) {
                await updateItem("accounts", `/data/accounts/${account.id}`, account);
              } else {
                await createItem("accounts", "/data/accounts", account);
              }
              setModal(null);
            }}
          />
        </Modal>
      )}
      {modal?.type === "card" && (
        <Modal title={modal.item ? "Edit credit card" : "Add credit card"} onClose={() => setModal(null)}>
          <CardForm
            initial={modal.item}
            onCancel={() => setModal(null)}
            onSubmit={async (card) => {
              if (modal.item) {
                await updateItem("cards", `/data/cards/${card.id}`, card);
              } else {
                await createItem("cards", "/data/cards", card);
              }
              setModal(null);
            }}
          />
        </Modal>
      )}
      {modal?.type === "transaction" && (
        <Modal title={modal.item ? "Edit transaction" : "Add transaction"} onClose={() => setModal(null)}>
          <TransactionForm
            data={data}
            initial={modal.item}
            onCancel={() => setModal(null)}
            onSubmit={async (txn) => {
              if (modal.item) {
                await updateItem("transactions", `/data/transactions/${txn.id}`, txn);
              } else {
                await createItem("transactions", "/data/transactions", txn);
              }
              setModal(null);
            }}
          />
        </Modal>
      )}
      {modal?.type === "budget" && (
        <Modal title={modal.item ? "Edit budget" : "Add budget"} onClose={() => setModal(null)}>
          <BudgetForm
            initial={modal.item}
            onCancel={() => setModal(null)}
            onSubmit={async (budget) => {
              if (modal.item) {
                await updateItem("budgets", `/data/budgets/${budget.id}`, budget);
              } else {
                await createItem("budgets", "/data/budgets", budget);
              }
              setModal(null);
            }}
          />
        </Modal>
      )}
      {modal?.type === "task" && (
        <Modal title={modal.item ? "Edit task" : "Add task"} onClose={() => setModal(null)}>
          <TaskForm
            initial={modal.item}
            onCancel={() => setModal(null)}
            onSubmit={async (task) => {
              if (modal.item) {
                await updateItem("tasks", `/data/tasks/${task.id}`, task);
              } else {
                await createItem("tasks", "/data/tasks", task);
              }
              setModal(null);
            }}
          />
        </Modal>
      )}
      {modal?.type === "calendar" && (
        <Modal title={modal.item ? "Edit event" : "Add event"} onClose={() => setModal(null)}>
          <CalendarEventForm
            initial={modal.item}
            onCancel={() => setModal(null)}
            onSubmit={async (event) => {
              if (modal.item) {
                await updateItem("calendarEvents", `/data/calendar-events/${event.id}`, event);
              } else {
                await createItem("calendarEvents", "/data/calendar-events", event);
              }
              setModal(null);
            }}
          />
        </Modal>
      )}
      {modal?.type === "note" && (
        <Modal title={modal.item ? "Edit note" : "Add note"} onClose={() => setModal(null)}>
          <NoteForm
            initial={modal.item}
            onCancel={() => setModal(null)}
            onSubmit={async (note) => {
              if (modal.item) {
                await updateItem("notes", `/data/notes/${note.id}`, note);
              } else {
                await createItem("notes", "/data/notes", note);
              }
              setModal(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

export default App;
