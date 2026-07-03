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
  CreditCard,
  Download,
  Landmark,
  LayoutDashboard,
  LineChart,
  ListPlus,
  PieChart,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Upload,
  WalletCards,
  X,
} from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";

type AccountType = "Checking" | "Savings" | "Money Market" | "Cash" | "Investment";
type TransactionType = "expense" | "income" | "card-payment";
type SourceKind = "account" | "card";

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
  name: string;
  bankId: string;
  type: AccountType;
  last4: string;
  openingBalance: number;
  color: string;
};

type UserCard = {
  id: string;
  nickname: string;
  templateId: string;
  issuerId: string;
  network: string;
  last4: string;
  creditLimit: number;
  startingDebt: number;
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
};

type Budget = {
  id: string;
  category: string;
  monthlyLimit: number;
};

type AppData = {
  accounts: Account[];
  cards: UserCard[];
  transactions: Transaction[];
  budgets: Budget[];
};

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
  accounts: [
    {
      id: "acct-main",
      name: "Everyday Checking",
      bankId: "chase",
      type: "Checking",
      last4: "4182",
      openingBalance: 4800,
      color: "#0b66c3",
    },
    {
      id: "acct-save",
      name: "Emergency Savings",
      bankId: "ally",
      type: "Savings",
      last4: "9204",
      openingBalance: 12600,
      color: "#682d8f",
    },
  ],
  cards: [
    {
      id: "card-flex",
      nickname: "Freedom Flex",
      templateId: "chase-freedom-flex",
      issuerId: "chase",
      network: "Mastercard",
      last4: "1198",
      creditLimit: 9500,
      startingDebt: 1220.43,
      apr: 24.99,
      minimumPayment: 40,
      dueDay: 18,
      statementDay: 23,
      accent: "#113f8f",
      rewards: CARD_CATALOG[1].rewards,
    },
    {
      id: "card-active",
      nickname: "Active Cash",
      templateId: "wells-fargo-active-cash",
      issuerId: "wells-fargo",
      network: "Visa",
      last4: "3081",
      creditLimit: 7000,
      startingDebt: 389.11,
      apr: 21.49,
      minimumPayment: 35,
      dueDay: 6,
      statementDay: 11,
      accent: "#b31b1b",
      rewards: CARD_CATALOG[3].rewards,
    },
  ],
  transactions: [
    {
      id: "txn-1",
      type: "expense",
      date: "2026-07-01",
      merchant: "Trader Joe's",
      category: "Groceries",
      amount: 86.44,
      sourceKind: "card",
      sourceId: "card-active",
      cashback: 1.73,
      notes: "Weekly groceries",
    },
    {
      id: "txn-2",
      type: "expense",
      date: "2026-07-02",
      merchant: "Shell",
      category: "Gas",
      amount: 52.18,
      sourceKind: "card",
      sourceId: "card-flex",
      cashback: 2.61,
    },
    {
      id: "txn-3",
      type: "income",
      date: "2026-07-01",
      merchant: "Payroll",
      category: "Income",
      amount: 2850,
      sourceKind: "account",
      sourceId: "acct-main",
      cashback: 0,
    },
    {
      id: "txn-4",
      type: "expense",
      date: "2026-06-28",
      merchant: "Spotify",
      category: "Subscriptions",
      amount: 11.99,
      sourceKind: "card",
      sourceId: "card-active",
      cashback: 0.24,
    },
  ],
  budgets: [
    { id: "budget-food", category: "Groceries", monthlyLimit: 520 },
    { id: "budget-dining", category: "Restaurants", monthlyLimit: 260 },
    { id: "budget-gas", category: "Gas", monthlyLimit: 220 },
    { id: "budget-shopping", category: "Shopping", monthlyLimit: 300 },
  ],
};

const STORAGE_KEY = "money-manager-v1";
const todayIso = new Date().toISOString().slice(0, 10);

function useLocalStorage<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : fallback;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
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
  const accountBalances = new Map(data.accounts.map((account) => [account.id, account.openingBalance]));
  const cardBalances = new Map(data.cards.map((card) => [card.id, card.startingDebt]));

  for (const txn of data.transactions) {
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
  onSubmit,
  onCancel,
}: {
  onSubmit: (account: Account) => void;
  onCancel: () => void;
}) {
  const [bankId, setBankId] = useState(BANKS[0].id);
  const [type, setType] = useState<AccountType>("Checking");
  const [name, setName] = useState("Everyday Checking");
  const [last4, setLast4] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");

  function submit(event: FormEvent) {
    event.preventDefault();
    const bank = getBank(bankId);
    onSubmit({
      id: uid("acct"),
      name: name.trim() || `${bank.shortName} ${type}`,
      bankId,
      type,
      last4: last4.slice(-4),
      openingBalance: Number(openingBalance) || 0,
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
          <Plus size={18} /> Add account
        </button>
      </div>
    </form>
  );
}

function CardForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (card: UserCard) => void;
  onCancel: () => void;
}) {
  const [templateId, setTemplateId] = useState(CARD_CATALOG[0].id);
  const template = getTemplate(templateId);
  const [nickname, setNickname] = useState(template.name);
  const [issuerId, setIssuerId] = useState(template.issuer);
  const [last4, setLast4] = useState("");
  const [creditLimit, setCreditLimit] = useState("5000");
  const [startingDebt, setStartingDebt] = useState("0");
  const [apr, setApr] = useState("24.99");
  const [minimumPayment, setMinimumPayment] = useState("35");
  const [dueDay, setDueDay] = useState("15");
  const [statementDay, setStatementDay] = useState("20");

  function changeTemplate(value: string) {
    const next = getTemplate(value);
    setTemplateId(value);
    setNickname(next.name);
    setIssuerId(next.issuer);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const selected = getTemplate(templateId);
    onSubmit({
      id: uid("card"),
      nickname: nickname.trim() || selected.name,
      templateId,
      issuerId,
      network: selected.network,
      last4: last4.slice(-4),
      creditLimit: Number(creditLimit) || 0,
      startingDebt: Number(startingDebt) || 0,
      apr: Number(apr) || 0,
      minimumPayment: Number(minimumPayment) || 0,
      dueDay: Math.min(28, Math.max(1, Number(dueDay) || 1)),
      statementDay: Math.min(28, Math.max(1, Number(statementDay) || 1)),
      accent: selected.accent,
      rewards: selected.rewards,
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
          <CreditCard size={18} /> Add card
        </button>
      </div>
    </form>
  );
}

function TransactionForm({
  data,
  onSubmit,
  onCancel,
}: {
  data: AppData;
  onSubmit: (txn: Transaction) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<TransactionType>("expense");
  const [date, setDate] = useState(todayIso);
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState("Groceries");
  const [amount, setAmount] = useState("");
  const [sourceKind, setSourceKind] = useState<SourceKind>("card");
  const [sourceId, setSourceId] = useState(data.cards[0]?.id ?? data.accounts[0]?.id ?? "");
  const [paymentAccountId, setPaymentAccountId] = useState(data.accounts[0]?.id ?? "");
  const [notes, setNotes] = useState("");

  const selectedCard = data.cards.find((card) => card.id === sourceId);
  const estimatedCashback = type === "expense" && sourceKind === "card" ? projectedCashback(selectedCard, category, Number(amount)) : 0;

  useEffect(() => {
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
      id: uid("txn"),
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
          <ListPlus size={18} /> Add transaction
        </button>
      </div>
    </form>
  );
}

function BudgetForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (budget: Budget) => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState("Groceries");
  const [monthlyLimit, setMonthlyLimit] = useState("300");

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit({
      id: uid("budget"),
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
          <Target size={18} /> Add budget
        </button>
      </div>
    </form>
  );
}

function AccountList({
  data,
  balances,
  onDelete,
}: {
  data: AppData;
  balances: Map<string, number>;
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
                {bank.name} · {account.type} {account.last4 && `· ${account.last4}`}
              </span>
            </div>
            <b>{currency(balances.get(account.id) ?? 0)}</b>
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
  onDelete,
}: {
  data: AppData;
  balances: Map<string, number>;
  onDelete: (id: string) => void;
}) {
  if (!data.cards.length) {
    return <EmptyState title="Add your first credit card" body="Track debt, available credit, due dates, and estimated cashback." />;
  }

  return (
    <div className="cards-grid">
      {data.cards.map((card) => {
        const debt = balances.get(card.id) ?? 0;
        const available = Math.max(0, card.creditLimit - debt);
        const util = card.creditLimit ? Math.min(100, (debt / card.creditLimit) * 100) : 0;
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
                <strong>{currency(available)}</strong>
              </div>
              <div>
                <span>Minimum</span>
                <strong>{currency(card.minimumPayment)}</strong>
              </div>
            </div>
            <div className="progress-label">
              <span>Utilization</span>
              <b>{util.toFixed(0)}%</b>
            </div>
            <div className="meter">
              <i style={{ width: `${util}%` }} />
            </div>
            <div className="reward-preview compact">
              {card.rewards.slice(0, 4).map((rule) => (
                <span key={`${card.id}-${rule.category}`}>
                  {percent(rule.rate)} {rule.category}
                </span>
              ))}
            </div>
            <button className="text-danger" onClick={() => onDelete(card.id)}>
              <Trash2 size={15} /> Remove card
            </button>
          </article>
        );
      })}
    </div>
  );
}

function TransactionsTable({
  data,
  onDelete,
}: {
  data: AppData;
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
  onDelete,
}: {
  data: AppData;
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
            <button className="ghost-icon" onClick={() => onDelete(budget.id)} aria-label={`Delete ${budget.category} budget`}>
              <Trash2 size={16} />
            </button>
          </article>
        );
      })}
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

function App() {
  const [data, setData] = useLocalStorage<AppData>(STORAGE_KEY, DEFAULT_DATA);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [modal, setModal] = useState<"account" | "card" | "transaction" | "budget" | null>(null);
  const [query, setQuery] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  const balances = useMemo(() => calculateBalances(data), [data]);
  const cash = [...balances.accountBalances.values()].reduce((sum, value) => sum + value, 0);
  const debt = [...balances.cardBalances.values()].reduce((sum, value) => sum + value, 0);
  const netWorth = cash - debt;
  const monthlySpend = monthSpend(data.transactions);
  const monthlyCashback = monthCashback(data.transactions);
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

  function updateData(next: Partial<AppData>) {
    setData((current) => ({ ...current, ...next }));
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `money-manager-${todayIso}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importData(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        setData(JSON.parse(String(reader.result)) as AppData);
      } catch {
        alert("That file does not look like a Money Manager export.");
      }
    };
    reader.readAsText(file);
  }

  const navItems = [
    { id: "dashboard", label: "Today", icon: <LayoutDashboard size={19} /> },
    { id: "accounts", label: "Accounts", icon: <Landmark size={19} /> },
    { id: "cards", label: "Cards", icon: <WalletCards size={19} /> },
    { id: "transactions", label: "Spending", icon: <Receipt size={19} /> },
    { id: "budgets", label: "Budgets", icon: <Target size={19} /> },
    { id: "rewards", label: "Rewards", icon: <BadgeDollarSign size={19} /> },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <CircleDollarSign size={24} />
          </div>
          <div>
            <strong>Money Manager</strong>
            <span>Local expense studio</span>
          </div>
        </div>
        <nav>
          {navItems.map((item) => (
            <button key={item.id} className={activeTab === item.id ? "active" : ""} onClick={() => setActiveTab(item.id)}>
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <div className="security-note">
          <ShieldCheck size={18} />
          <span>Stored locally in this browser</span>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Personal finance</p>
            <h1>{activeTab === "dashboard" ? "Today" : navItems.find((item) => item.id === activeTab)?.label}</h1>
          </div>
          <div className="top-actions">
            <div className="searchbox">
              <Search size={17} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search spending" />
            </div>
            <button className="icon-button" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button className="primary-button" onClick={() => setModal("transaction")}>
              <Plus size={18} /> Transaction
            </button>
          </div>
        </header>

        {activeTab === "dashboard" && (
          <div className="page-grid animate-fade">
            <section className="hero-panel">
              <div>
                <p className="eyebrow">Net worth</p>
                <h2>{currency(netWorth)}</h2>
                <span>
                  {currency(cash)} cash and assets · {currency(debt)} credit card debt
                </span>
              </div>
              <div className="hero-orbit">
                <div className="hero-phone">
                  <div className="phone-pill" />
                  <strong>{currency(monthlySpend)}</strong>
                  <span>spent in {currentMonthKey()}</span>
                  <div className="mini-wave">
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              </div>
            </section>

            <div className="stats-grid">
              <StatTile label="Monthly spend" value={currency(monthlySpend)} detail="Current month expenses" icon={<Receipt size={20} />} tone="orange" />
              <StatTile label="Cashback" value={currency(monthlyCashback)} detail="Estimated from card rules" icon={<BadgeDollarSign size={20} />} tone="green" />
              <StatTile label="Accounts" value={String(data.accounts.length)} detail={`${data.cards.length} credit cards linked`} icon={<Landmark size={20} />} tone="blue" />
              <StatTile label="Transactions" value={String(data.transactions.length)} detail="Income, expenses, payments" icon={<Activity size={20} />} tone="pink" />
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
                {data.cards.map((card) => {
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
                })}
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
              <TransactionsTable data={{ ...data, transactions: data.transactions.slice(-5) }} onDelete={(id) => updateData({ transactions: data.transactions.filter((txn) => txn.id !== id) })} />
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
              <button className="primary-button" onClick={() => setModal("account")}>
                <Plus size={18} /> Account
              </button>
            </div>
            <AccountList
              data={data}
              balances={balances.accountBalances}
              onDelete={(id) => updateData({ accounts: data.accounts.filter((account) => account.id !== id) })}
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
              <button className="primary-button" onClick={() => setModal("card")}>
                <Plus size={18} /> Card
              </button>
            </div>
            <CardStack data={data} balances={balances.cardBalances} onDelete={(id) => updateData({ cards: data.cards.filter((card) => card.id !== id) })} />
          </section>
        )}

        {activeTab === "transactions" && (
          <section className="panel animate-fade">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Ledger</p>
                <h2>Spending and income</h2>
              </div>
              <button className="primary-button" onClick={() => setModal("transaction")}>
                <Plus size={18} /> Transaction
              </button>
            </div>
            <TransactionsTable data={filteredData} onDelete={(id) => updateData({ transactions: data.transactions.filter((txn) => txn.id !== id) })} />
          </section>
        )}

        {activeTab === "budgets" && (
          <section className="panel animate-fade">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Planning</p>
                <h2>Monthly budgets</h2>
              </div>
              <button className="primary-button" onClick={() => setModal("budget")}>
                <Plus size={18} /> Budget
              </button>
            </div>
            <BudgetPanel data={data} onDelete={(id) => updateData({ budgets: data.budgets.filter((budget) => budget.id !== id) })} />
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
              <p className="body-copy">
                Seeded from current issuer pages checked July 3, 2026. Always confirm your exact card terms, caps, activation rules, and merchant coding.
              </p>
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
                <button className="secondary-button" onClick={() => importRef.current?.click()}>
                  <Upload size={18} /> Import JSON
                </button>
                <input
                  ref={importRef}
                  type="file"
                  accept="application/json"
                  hidden
                  onChange={(event) => importData(event.target.files?.[0])}
                />
                <button className="text-danger" onClick={() => setData(DEFAULT_DATA)}>
                  <RefreshCw size={16} /> Restore demo data
                </button>
              </div>
            </section>
          </div>
        )}
      </main>

      <nav className="bottom-nav">
        {navItems.slice(0, 5).map((item) => (
          <button key={item.id} className={activeTab === item.id ? "active" : ""} onClick={() => setActiveTab(item.id)} aria-label={item.label}>
            {item.icon}
          </button>
        ))}
      </nav>

      {modal === "account" && (
        <Modal title="Add account" onClose={() => setModal(null)}>
          <AccountForm
            onCancel={() => setModal(null)}
            onSubmit={(account) => {
              updateData({ accounts: [account, ...data.accounts] });
              setModal(null);
            }}
          />
        </Modal>
      )}
      {modal === "card" && (
        <Modal title="Add credit card" onClose={() => setModal(null)}>
          <CardForm
            onCancel={() => setModal(null)}
            onSubmit={(card) => {
              updateData({ cards: [card, ...data.cards] });
              setModal(null);
            }}
          />
        </Modal>
      )}
      {modal === "transaction" && (
        <Modal title="Add transaction" onClose={() => setModal(null)}>
          <TransactionForm
            data={data}
            onCancel={() => setModal(null)}
            onSubmit={(txn) => {
              updateData({ transactions: [txn, ...data.transactions] });
              setModal(null);
            }}
          />
        </Modal>
      )}
      {modal === "budget" && (
        <Modal title="Add budget" onClose={() => setModal(null)}>
          <BudgetForm
            onCancel={() => setModal(null)}
            onSubmit={(budget) => {
              updateData({ budgets: [budget, ...data.budgets] });
              setModal(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

export default App;
