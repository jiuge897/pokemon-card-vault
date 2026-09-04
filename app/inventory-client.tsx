'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  Box,
  Check,
  ExternalLink,
  Languages,
  Layers3,
  LoaderCircle,
  Minus,
  PackagePlus,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShoppingBag,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  detectLocale,
  formatText,
  localeNames,
  locales,
  Locale,
  TranslationKey,
  translations,
} from './i18n';

type ItemType = 'card' | 'sealed' | 'merch';
type CardItem = {
  id: number;
  productId: number | null;
  sourceId: string | null;
  sourceUrl: string | null;
  name: string;
  itemType: ItemType;
  printing: string;
  quantity: number;
  marketPrice: number | null;
  unitCost: number | null;
  taxable: number;
  taxRate: number;
  costSource: 'purchase' | 'pulled';
  createdAt: string;
  updatedAt: string | null;
};
type RoiPoint = {
  date: string;
  marketRoi: number;
  adjustedRoi: number;
};
type ApiData = {
  items?: CardItem[];
  updated?: number;
  error?: string;
  errorCode?: string;
};
const getProductId = (value: string) =>
  Number(value.match(/(?:product\/)?(\d{4,})/)?.[1] || NaN);
const getMerchSku = (value: string) => {
  try {
    const u = new URL(value);
    const p = u.pathname.split('/').filter(Boolean);
    const i = p.indexOf('product');
    return i >= 0 ? (p[i + 1] || '').toUpperCase() : '';
  } catch {
    return /^[a-z0-9-]{3,40}$/i.test(value.trim())
      ? value.trim().toUpperCase()
      : '';
  }
};
const cashRateFor = (itemType: ItemType) =>
  itemType === 'merch' ? 1 : itemType === 'sealed' ? 0.8 : 0.5;
const afterTaxUnitCost = (
  item: Pick<CardItem, 'unitCost' | 'taxable' | 'taxRate'>,
) =>
  item.unitCost == null
    ? null
    : item.unitCost * (1 + (item.taxable ? item.taxRate : 0) / 100);
const errorKeys: Record<string, TranslationKey> = {
  AUTH_REQUIRED: 'authRequired',
  INCOMPLETE: 'incomplete',
  INVALID_ADJUSTMENT: 'invalidAdjustment',
  NOT_FOUND: 'notFound',
  INVALID_ID: 'invalidId',
};

export default function InventoryClient({
  user,
  signOutPath,
}: {
  user: { displayName: string; email: string };
  signOutPath: string;
}) {
  const [locale, setLocale] = useState<Locale>('zh-CN');
  const [items, setItems] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [lookingUpPack, setLookingUpPack] = useState(false);
  const [packMatch, setPackMatch] = useState('');
  const [packGroupId, setPackGroupId] = useState('');
  const [pokemonSets, setPokemonSets] = useState<
    { groupId: number; name: string }[]
  >([]);
  const [loadingSets, setLoadingSets] = useState(false);
  const [savingCost, setSavingCost] = useState(false);
  const [roiHistory, setRoiHistory] = useState<RoiPoint[]>([]);
  const [costEditor, setCostEditor] = useState<{
    id: number;
    name: string;
    unitCost: string;
    taxable: boolean;
    taxRate: string;
    itemType: ItemType;
    costSource: 'purchase' | 'pulled';
  } | null>(null);
  const [form, setForm] = useState({
    link: '',
    sourceId: '',
    name: '',
    itemType: 'card' as ItemType,
    printing: 'Foil',
    officialPrice: '',
    unitCost: '',
    taxable: false,
    taxRate: '',
    costSource: 'purchase' as 'purchase' | 'pulled',
    quantity: '1',
  });
  const t = translations[locale];
  const rtl = locale === 'ar';
  const dir = rtl ? 'rtl' : 'ltr';
  const usd = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }),
    [locale],
  );
  const number = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const percent = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
    [locale],
  );
  const tr = (key: TranslationKey, values?: Record<string, string | number>) =>
    formatText(t[key], values);
  const apiError = (data: ApiData, fallback: TranslationKey) =>
    data.errorCode && errorKeys[data.errorCode]
      ? t[errorKeys[data.errorCode]]
      : t[fallback];

  useEffect(() => {
    const saved = localStorage.getItem('card-vault-locale') as Locale | null;
    setLocale(saved && locales.includes(saved) ? saved : detectLocale());
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    localStorage.setItem('card-vault-locale', locale);
  }, [locale, dir]);
  const loadInventory = useCallback(async () => {
    try {
      const r = await fetch('/api/inventory');
      if (!r.ok) throw new Error();
      setItems(((await r.json()) as { items: CardItem[] }).items);
    } catch {
      setMessage(translations[locale].readFailed);
    } finally {
      setLoading(false);
    }
  }, [locale]);
  const loadRoiHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/roi-history');
      if (!response.ok) return;
      const data = (await response.json()) as { history?: RoiPoint[] };
      setRoiHistory(data.history ?? []);
    } catch {}
  }, []);
  const refreshPrices = useCallback(
    async (force = false) => {
      setSyncing(true);
      setMessage('');
      try {
        const r = await fetch('/api/prices', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ force }),
        });
        const d = (await r.json()) as ApiData;
        if (!r.ok) throw new Error(apiError(d, 'priceFailed'));
        if (d.items) setItems(d.items);
        await loadRoiHistory();
        setMessage(
          d.updated
            ? tr('updatedPrices', { count: number.format(d.updated) })
            : t.pricesCurrent,
        );
      } catch (e) {
        setMessage(e instanceof Error ? e.message : t.priceFailed);
      } finally {
        setSyncing(false);
      }
    },
    [loadRoiHistory, locale, number, t],
  );
  useEffect(() => {
    void loadInventory().then(() => refreshPrices(false));
  }, [loadInventory, refreshPrices]);

  async function lookupMerch() {
    if (!form.link.trim()) {
      setMessage(t.pastePokemonCenter);
      return;
    }
    setLookingUp(true);
    setMessage('');
    try {
      const r = await fetch('/api/pokemon-center', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input: form.link.trim() }),
      });
      const d = (await r.json()) as {
        product?: {
          sourceId: string;
          name: string;
          officialPrice: number | null;
          sourceUrl: string;
        };
        complete?: boolean;
        errorCode?: string;
      };
      if (!r.ok || !d.product)
        throw new Error(
          d.errorCode === 'INVALID_ID'
            ? t.invalidPokemonCenterSku
            : t.lookupFailed,
        );
      setForm((current) => ({
        ...current,
        sourceId: d.product!.sourceId,
        link: d.product!.sourceUrl,
        name: d.product!.name || current.name,
        officialPrice: d.product!.officialPrice
          ? String(d.product!.officialPrice)
          : current.officialPrice,
      }));
      setMessage(d.complete ? t.productFound : t.lookupManual);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t.lookupFailed);
    } finally {
      setLookingUp(false);
    }
  }
  async function loadPokemonSets() {
    if (pokemonSets.length || loadingSets) return;
    setLoadingSets(true);
    try {
      const response = await fetch('/api/pokemon-sets');
      const data = (await response.json()) as {
        sets?: { groupId: number; name: string }[];
      };
      if (!response.ok || !data.sets) throw new Error();
      setPokemonSets(data.sets);
    } catch {
      setMessage(t.setsUnavailable);
    } finally {
      setLoadingSets(false);
    }
  }
  async function lookupPackCost(
    input = form.link,
    selectedGroupId = packGroupId,
  ) {
    const productId = getProductId(input);
    if (!productId) return;
    setLookingUpPack(true);
    setPackMatch('');
    try {
      const response = await fetch('/api/pack-price', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          productId,
          sourceUrl: input,
          groupId: selectedGroupId ? Number(selectedGroupId) : undefined,
        }),
      });
      const data = (await response.json()) as {
        price?: number;
        packName?: string;
        groupId?: number;
        errorCode?: string;
      };
      if (!response.ok || data.price == null || !data.packName) {
        if (data.errorCode === 'SET_REQUIRED') {
          await loadPokemonSets();
          setMessage(t.setRequired);
          return;
        }
        throw new Error();
      }
      setForm((current) =>
        current.costSource === 'pulled'
          ? { ...current, unitCost: String(data.price) }
          : current,
      );
      setPackMatch(data.packName);
      if (data.groupId) setPackGroupId(String(data.groupId));
      setMessage(
        tr('packCostFound', {
          name: data.packName,
          price: usd.format(data.price),
        }),
      );
    } catch {
      setMessage(t.packCostNotFound);
    } finally {
      setLookingUpPack(false);
    }
  }
  async function addItem(e: FormEvent) {
    e.preventDefault();
    const isMerch = form.itemType === 'merch',
      productId = getProductId(form.link),
      sourceId = form.sourceId || getMerchSku(form.link),
      unitCost = form.unitCost.trim() === '' ? null : Number(form.unitCost),
      taxRate = form.taxable ? Number(form.taxRate) : 0;
    if (!form.link.trim()) {
      setMessage(isMerch ? t.pastePokemonCenter : t.pasteLink);
      return;
    }
    if (isMerch && !sourceId) {
      setMessage(t.invalidPokemonCenterSku);
      return;
    }
    if (!isMerch && !productId) {
      setMessage(t.invalidProductId);
      return;
    }
    if (!form.name.trim()) {
      setMessage(t.enterName);
      return;
    }
    if (
      isMerch &&
      (!Number.isFinite(Number(form.officialPrice)) ||
        Number(form.officialPrice) <= 0)
    ) {
      setMessage(t.invalidOfficialPrice);
      return;
    }
    if (
      !isMerch &&
      unitCost != null &&
      (!Number.isFinite(unitCost) || unitCost < 0)
    ) {
      setMessage(t.invalidCost);
      return;
    }
    if (
      !isMerch &&
      form.taxable &&
      (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 25)
    ) {
      setMessage(t.invalidTaxRate);
      return;
    }
    setAdding(true);
    setMessage('');
    try {
      const r = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          isMerch
            ? {
                sourceId,
                sourceUrl: form.link,
                name: form.name.trim(),
                itemType: 'merch',
                officialPrice: Number(form.officialPrice),
                quantity: Math.max(1, Number(form.quantity) || 1),
              }
            : {
                productId,
                name: form.name.trim(),
                itemType: form.itemType,
                printing:
                  form.itemType === 'sealed'
                    ? 'Sealed'
                    : form.printing.trim() || 'Foil',
                unitCost,
                taxable: form.taxable,
                taxRate,
                costSource:
                  form.itemType === 'card' ? form.costSource : 'purchase',
                quantity: Math.max(1, Number(form.quantity) || 1),
              },
        ),
      });
      const d = (await r.json()) as ApiData;
      if (!r.ok) throw new Error(apiError(d, 'addFailed'));
      if (d.items) setItems(d.items);
      setForm({
        link: '',
        sourceId: '',
        name: '',
        itemType: 'card',
        printing: 'Foil',
        officialPrice: '',
        unitCost: '',
        taxable: false,
        taxRate: '',
        costSource: 'purchase',
        quantity: '1',
      });
      setPackGroupId('');
      setPackMatch('');
      setMessage(isMerch ? t.merchAdded : t.added);
      if (!isMerch) await refreshPrices(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t.addFailed);
    } finally {
      setAdding(false);
    }
  }
  async function removeItem(id: number) {
    const r = await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
    if (r.ok) {
      setItems((c) => c.filter((i) => i.id !== id));
      await loadRoiHistory();
    } else setMessage(t.notFound);
  }
  async function changeQuantity(id: number, delta: 1 | -1) {
    const current = items.find((i) => i.id === id);
    if (!current || (delta < 0 && current.quantity <= 1)) return;
    setItems((list) =>
      list.map((i) =>
        i.id === id ? { ...i, quantity: i.quantity + delta } : i,
      ),
    );
    try {
      const r = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, delta }),
      });
      const d = (await r.json()) as ApiData;
      if (!r.ok) throw new Error(apiError(d, 'quantityFailed'));
      if (d.items) setItems(d.items);
      await loadRoiHistory();
    } catch (error) {
      setItems((list) =>
        list.map((i) =>
          i.id === id ? { ...i, quantity: i.quantity - delta } : i,
        ),
      );
      setMessage(error instanceof Error ? error.message : t.quantityFailed);
    }
  }
  function editCost(item: CardItem) {
    setCostEditor({
      id: item.id,
      name: item.name,
      unitCost: item.unitCost == null ? '' : String(item.unitCost),
      taxable: Boolean(item.taxable),
      taxRate: item.taxable ? String(item.taxRate) : '',
      itemType: item.itemType,
      costSource: item.costSource,
    });
  }
  async function saveCost() {
    if (!costEditor) return;
    const unitCost =
        costEditor.unitCost.trim() === '' ? null : Number(costEditor.unitCost),
      taxRate = costEditor.taxable ? Number(costEditor.taxRate) : 0;
    if (unitCost != null && (!Number.isFinite(unitCost) || unitCost < 0)) {
      setMessage(t.invalidCost);
      return;
    }
    if (
      costEditor.taxable &&
      (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 25)
    ) {
      setMessage(t.invalidTaxRate);
      return;
    }
    setSavingCost(true);
    setMessage('');
    try {
      const r = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'cost',
          id: costEditor.id,
          unitCost,
          taxable: costEditor.taxable,
          taxRate,
          costSource: costEditor.costSource,
        }),
      });
      const d = (await r.json()) as ApiData;
      if (!r.ok) throw new Error(apiError(d, 'costFailed'));
      if (d.items) setItems(d.items);
      await loadRoiHistory();
      setCostEditor(null);
      setMessage(t.costSaved);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t.costFailed);
    } finally {
      setSavingCost(false);
    }
  }
  const filtered = useMemo(() => {
    const n = query.trim().toLowerCase();
    return n
      ? items.filter(
          (i) =>
            i.name.toLowerCase().includes(n) ||
            String(i.productId || '').includes(n) ||
            (i.sourceId || '').toLowerCase().includes(n),
        )
      : items;
  }, [items, query]);
  const totals = useMemo(() => {
    const market = items.reduce(
      (s, i) => s + (i.marketPrice || 0) * i.quantity,
      0,
    );
    const cash = items.reduce(
      (s, i) => s + (i.marketPrice || 0) * i.quantity * cashRateFor(i.itemType),
      0,
    );
    const cost = items.reduce(
      (s, i) => s + (afterTaxUnitCost(i) || 0) * i.quantity,
      0,
    );
    const costedItems = items.filter(
      (i) => (afterTaxUnitCost(i) || 0) > 0 && i.marketPrice != null,
    );
    const costedMarket = costedItems.reduce(
      (s, i) => s + (i.marketPrice || 0) * i.quantity,
      0,
    );
    const costedCash = costedItems.reduce(
      (s, i) => s + (i.marketPrice || 0) * i.quantity * cashRateFor(i.itemType),
      0,
    );
    return {
      copies: items.reduce((s, i) => s + i.quantity, 0),
      market,
      cash,
      cost,
      costedMarket,
      costedCash,
    };
  }, [items]);
  const latest = items
    .map((i) => i.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  function exportCsv() {
    const rows = [
      [
        t.csvName,
        t.csvId,
        t.csvType,
        t.csvPrinting,
        t.csvQuantity,
        t.csvMarket,
        t.csvCash,
        t.csvCost,
        t.csvCostSource,
        t.csvTaxRate,
        t.csvAfterTaxCost,
        t.csvMarketRoi,
        t.csvAdjustedRoi,
      ],
      ...items.map((i) => {
        const unitCost = afterTaxUnitCost(i),
          marketTotal = (i.marketPrice || 0) * i.quantity,
          adjustedTotal = marketTotal * cashRateFor(i.itemType),
          costTotal = (unitCost || 0) * i.quantity;
        return [
          i.name,
          i.itemType === 'merch' ? i.sourceId : i.productId,
          i.itemType === 'merch'
            ? t.merch
            : i.itemType === 'sealed'
              ? t.sealed
              : t.card,
          i.itemType === 'merch' ? t.officialPriceSource : i.printing,
          i.quantity,
          i.marketPrice ?? '',
          adjustedTotal.toFixed(2),
          i.unitCost ?? '',
          i.itemType === 'card' && i.costSource === 'pulled'
            ? t.packCostBasis
            : t.purchaseCostBasis,
          i.taxable ? i.taxRate : '',
          unitCost ?? '',
          unitCost == null || costTotal === 0
            ? ''
            : (((marketTotal - costTotal) / costTotal) * 100).toFixed(2),
          unitCost == null || costTotal === 0
            ? ''
            : (((adjustedTotal - costTotal) / costTotal) * 100).toFixed(2),
        ];
      }),
    ];
    const csv = rows
      .map((r) =>
        r.map((c) => `"${String(c ?? '').replaceAll('"', '""')}"`).join(','),
      )
      .join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob(['\ufeff' + csv], { type: 'text/csv' }),
    );
    a.download = 'pokemon-inventory.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <main className="min-h-screen pb-14" dir={dir}>
      <header className="border-b border-white/10 bg-[#101521]/92 text-white backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-5 py-4 md:px-10">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#f4ca47] text-[#171b26] shadow-[0_0_0_5px_rgba(244,202,71,.09)]">
              <WalletCards className="size-5" />
            </span>
            <div>
              <p className="font-display text-lg font-bold tracking-tight">
                {t.vault}
              </p>
              <p className="text-xs text-slate-400">{t.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 text-xs text-slate-300 xl:flex">
              <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
              {t.marketUsd}
            </div>
            <div className="relative">
              <Languages
                className={`pointer-events-none absolute top-1/2 size-3.5 -translate-y-1/2 text-slate-400 ${rtl ? 'right-2.5' : 'left-2.5'}`}
              />
              <select
                aria-label={t.language}
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
                className={`h-9 appearance-none rounded-lg border border-white/15 bg-white/5 text-xs font-semibold text-slate-200 outline-none hover:border-white/30 ${rtl ? 'pr-8 pl-3' : 'pl-8 pr-3'}`}
              >
                {locales.map((code) => (
                  <option key={code} value={code} className="bg-[#171d2b]">
                    {localeNames[code]}
                  </option>
                ))}
              </select>
            </div>
            <div className="hidden h-5 w-px bg-white/15 sm:block" />
            <div className="hidden min-w-0 text-end md:block">
              <p className="max-w-40 truncate text-xs font-semibold text-slate-200">
                {user.displayName}
              </p>
              <p
                dir="ltr"
                className="hidden max-w-48 truncate text-[11px] text-slate-500 lg:block"
              >
                {user.email}
              </p>
            </div>
            <a
              href={signOutPath}
              target="_top"
              className="whitespace-nowrap rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-white/30 hover:text-white"
            >
              {t.signOut}
            </a>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1440px] px-5 pt-8 md:px-10">
        <section className="mb-7 grid gap-4 lg:grid-cols-[1.35fr_.65fr_.65fr]">
          <div className="relative overflow-hidden rounded-[26px] bg-[#171d2b] p-6 text-white shadow-[0_22px_60px_rgba(20,29,45,.14)] md:p-8">
            <div className="pokeball-grid absolute inset-0 opacity-20" />
            <div className="relative">
              <p className="mb-5 text-xs font-semibold uppercase tracking-[.22em] text-[#f4ca47]">
                {t.currentCollection}
              </p>
              <p
                dir="ltr"
                className={`font-display text-4xl font-bold tracking-[-.04em] md:text-5xl ${rtl ? 'text-right' : ''}`}
              >
                {usd.format(totals.market)}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-300">
                <span>
                  {number.format(totals.copies)} {t.cards}
                </span>
                <span className="h-4 w-px bg-white/15" />
                <span>
                  {number.format(items.length)} {t.itemCount}
                </span>
                <span className="h-4 w-px bg-white/15" />
                <span>{t.cashRate}</span>
              </div>
              {totals.cost > 0 && (
                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">
                    {t.totalCost}: {usd.format(totals.cost)}
                  </div>
                  <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2">
                    <span className="block text-[11px] font-semibold text-emerald-300">
                      {t.marketRoi}
                    </span>
                    <strong className="mt-0.5 block text-2xl text-emerald-300">
                      {percent.format(
                        ((totals.costedMarket - totals.cost) / totals.cost) *
                          100,
                      )}
                      %
                    </strong>
                  </div>
                  <div className="rounded-xl border border-[#f4ca47]/20 bg-[#f4ca47]/10 px-3 py-2">
                    <span className="block text-[11px] font-semibold text-[#f4ca47]">
                      {t.adjustedRoi}
                    </span>
                    <strong className="mt-0.5 block text-2xl text-[#f4ca47]">
                      {percent.format(
                        ((totals.costedCash - totals.cost) / totals.cost) * 100,
                      )}
                      %
                    </strong>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="metric-card border-[#f4ca47]">
            <p className="metric-label">{t.cashValue}</p>
            <p dir="ltr" className={`metric-value ${rtl ? 'text-right' : ''}`}>
              {usd.format(totals.cash)}
            </p>
            <p className="metric-note">{t.marketTimes}</p>
          </div>
          <div className="metric-card border-emerald-400">
            <p className="metric-label">{t.dataStatus}</p>
            <p className="metric-value text-[1.7rem]">
              {syncing ? t.syncing : latest ? t.updated : t.pending}
            </p>
            <p className="metric-note">
              {latest
                ? new Date(latest).toLocaleString(locale, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : t.autoCheck}
            </p>
          </div>
        </section>
        <section className="panel mb-7">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="eyebrow">ROI HISTORY</p>
              <h2 className="font-display text-xl font-bold text-slate-900">
                {t.roiTrend}
              </h2>
            </div>
            <p className="max-w-xl text-xs text-slate-500">{t.roiTrendHint}</p>
          </div>
          {roiHistory.length ? (
            <div dir="ltr" className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={roiHistory}
                  margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(value) =>
                      new Date(`${value}T00:00:00Z`).toLocaleDateString(
                        locale,
                        {
                          month: 'short',
                          day: 'numeric',
                          timeZone: 'UTC',
                        },
                      )
                    }
                  />
                  <YAxis
                    width={58}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(value) => `${percent.format(value)}%`}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      `${percent.format(Number(value))}%`,
                      name === 'marketRoi' ? t.marketRoi : t.adjustedRoi,
                    ]}
                    labelFormatter={(value) =>
                      new Date(`${value}T00:00:00Z`).toLocaleDateString(
                        locale,
                        {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          timeZone: 'UTC',
                        },
                      )
                    }
                  />
                  <Legend
                    formatter={(value) =>
                      value === 'marketRoi' ? t.marketRoi : t.adjustedRoi
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="marketRoi"
                    stroke="#059669"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="adjustedRoi"
                    stroke="#d59f10"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="grid h-44 place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center text-sm text-slate-500">
              {t.roiHistoryEmpty}
            </div>
          )}
        </section>
        <section className="grid items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="panel xl:sticky xl:top-6">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">{t.addEyebrow}</p>
                <h1>{t.addTitle}</h1>
              </div>
              <span className="icon-chip">
                <PackagePlus />
              </span>
            </div>
            <form className="space-y-4" onSubmit={addItem}>
              <div>
                <span className="field-label">{t.inventoryType}</span>
                <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    className={`type-option ${form.itemType === 'card' ? 'type-option-active' : ''}`}
                    onClick={() =>
                      setForm({ ...form, itemType: 'card', sourceId: '' })
                    }
                  >
                    <Layers3 />
                    {t.card}
                  </button>
                  <button
                    type="button"
                    className={`type-option ${form.itemType === 'sealed' ? 'type-option-active' : ''}`}
                    onClick={() =>
                      setForm({
                        ...form,
                        itemType: 'sealed',
                        sourceId: '',
                        costSource: 'purchase',
                      })
                    }
                  >
                    <Box />
                    {t.sealed}
                  </button>
                  <button
                    type="button"
                    className={`type-option ${form.itemType === 'merch' ? 'type-option-active' : ''}`}
                    onClick={() =>
                      setForm({
                        ...form,
                        itemType: 'merch',
                        costSource: 'purchase',
                      })
                    }
                  >
                    <ShoppingBag />
                    {t.merch}
                  </button>
                </div>
              </div>
              <label className="field-label">
                {form.itemType === 'merch'
                  ? t.pokemonCenterLinkLabel
                  : t.linkLabel}
                <div className="mt-2 flex gap-2">
                  <Input
                    dir="ltr"
                    className="h-11 rounded-xl bg-slate-50 text-start font-normal"
                    placeholder={
                      form.itemType === 'merch'
                        ? t.pokemonCenterLinkPlaceholder
                        : t.linkPlaceholder
                    }
                    value={form.link}
                    onBlur={() => {
                      if (
                        form.itemType === 'card' &&
                        form.costSource === 'pulled' &&
                        getProductId(form.link)
                      )
                        void lookupPackCost(form.link);
                    }}
                    onChange={(e) => {
                      setForm({
                        ...form,
                        link: e.target.value,
                        sourceId:
                          form.itemType === 'merch' ? '' : form.sourceId,
                      });
                      if (form.itemType === 'card') {
                        setPackGroupId('');
                        setPackMatch('');
                      }
                    }}
                  />
                  {form.itemType === 'merch' && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 shrink-0 rounded-xl px-3"
                      disabled={lookingUp}
                      onClick={lookupMerch}
                    >
                      {lookingUp ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <Search />
                      )}
                      <span className="hidden sm:inline">
                        {t.lookupProduct}
                      </span>
                    </Button>
                  )}
                </div>
              </label>
              <label className="field-label">
                {form.itemType === 'card' ? t.cardName : t.productName}
                <Input
                  className="field-input"
                  placeholder={
                    form.itemType === 'card'
                      ? t.cardPlaceholder
                      : t.productPlaceholder
                  }
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <div
                className={`grid gap-3 ${form.itemType === 'sealed' ? 'grid-cols-1' : 'grid-cols-[1fr_96px]'}`}
              >
                {form.itemType === 'card' && (
                  <label className="field-label">
                    {t.printing}
                    <Input
                      className="field-input"
                      placeholder="Foil"
                      value={form.printing}
                      onChange={(e) =>
                        setForm({ ...form, printing: e.target.value })
                      }
                    />
                  </label>
                )}
                {form.itemType === 'merch' && (
                  <label className="field-label">
                    {t.officialPrice}
                    <Input
                      dir="ltr"
                      className="field-input text-start"
                      min="0.01"
                      step="0.01"
                      type="number"
                      placeholder="29.99"
                      value={form.officialPrice}
                      onChange={(e) =>
                        setForm({ ...form, officialPrice: e.target.value })
                      }
                    />
                  </label>
                )}
                <label className="field-label">
                  {t.quantity}
                  <Input
                    className="field-input"
                    min="1"
                    type="number"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({ ...form, quantity: e.target.value })
                    }
                  />
                </label>
              </div>
              {form.itemType !== 'merch' && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  {form.itemType === 'card' && (
                    <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
                      <Checkbox
                        checked={form.costSource === 'pulled'}
                        onCheckedChange={(checked) => {
                          const pulled = checked === true;
                          setForm({
                            ...form,
                            costSource: pulled ? 'pulled' : 'purchase',
                          });
                          setPackMatch('');
                          setPackGroupId('');
                          if (pulled) {
                            void loadPokemonSets();
                            if (getProductId(form.link))
                              void lookupPackCost(form.link, '');
                          }
                        }}
                      />
                      {t.pulledMyself}
                    </label>
                  )}
                  {form.itemType === 'card' && form.costSource === 'pulled' && (
                    <label className="field-label mb-3">
                      {t.sourceSet}
                      <NativeSelect
                        className="mt-2 w-full"
                        value={packGroupId}
                        disabled={loadingSets}
                        onFocus={() => void loadPokemonSets()}
                        onChange={(event) => {
                          const groupId = event.target.value;
                          setPackGroupId(groupId);
                          setPackMatch('');
                          if (groupId && getProductId(form.link))
                            void lookupPackCost(form.link, groupId);
                        }}
                      >
                        <NativeSelectOption value="">
                          {loadingSets ? t.loadingSets : t.chooseSet}
                        </NativeSelectOption>
                        {pokemonSets.map((set) => (
                          <NativeSelectOption
                            key={set.groupId}
                            value={String(set.groupId)}
                          >
                            {set.name}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </label>
                  )}
                  <label className="field-label">
                    {form.itemType === 'card' && form.costSource === 'pulled'
                      ? t.packCost
                      : t.unitCost}
                    <Input
                      dir="ltr"
                      className="field-input bg-white text-start"
                      min="0"
                      step="0.01"
                      type="number"
                      placeholder="0.00"
                      value={form.unitCost}
                      onChange={(e) =>
                        setForm({ ...form, unitCost: e.target.value })
                      }
                    />
                    {form.itemType === 'card' &&
                      form.costSource === 'pulled' && (
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="truncate text-[11px] text-slate-500">
                            {lookingUpPack
                              ? t.lookingUpPackCost
                              : packMatch || t.packCostAutoHint}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 shrink-0 px-2 text-[11px]"
                            disabled={lookingUpPack || !getProductId(form.link)}
                            onClick={() => void lookupPackCost(form.link)}
                          >
                            {lookingUpPack && (
                              <LoaderCircle className="animate-spin" />
                            )}
                            {t.lookupPackCost}
                          </Button>
                        </div>
                      )}
                  </label>
                  <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
                    <Checkbox
                      checked={form.taxable}
                      onCheckedChange={(checked) =>
                        setForm({
                          ...form,
                          taxable: checked === true,
                          taxRate: checked === true ? form.taxRate : '',
                        })
                      }
                    />
                    {t.taxablePurchase}
                  </label>
                  {form.taxable && (
                    <label className="field-label mt-3">
                      {t.taxRate}
                      <div className="relative">
                        <Input
                          dir="ltr"
                          className="field-input bg-white pe-8 text-start"
                          min="0"
                          max="25"
                          step="0.001"
                          type="number"
                          placeholder="8.25"
                          value={form.taxRate}
                          onChange={(e) =>
                            setForm({ ...form, taxRate: e.target.value })
                          }
                        />
                        <span className="absolute end-3 top-1/2 mt-1 -translate-y-1/2 text-sm text-slate-400">
                          %
                        </span>
                      </div>
                    </label>
                  )}
                </div>
              )}
              <Button
                type="submit"
                className="h-11 w-full rounded-xl bg-[#f4ca47] font-bold text-[#191d27] hover:bg-[#ffda64]"
                disabled={adding}
              >
                {adding ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <PackagePlus />
                )}
                {form.itemType === 'merch' ? t.addOfficialPrice : t.addAndPrice}
              </Button>
            </form>
            <div className="mt-5 rounded-2xl border border-amber-200/70 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
              <span className="mb-2 flex items-center gap-2 font-bold">
                <Check className="size-3.5" />
                {t.tip}
              </span>
              {form.itemType === 'merch'
                ? t.merchTip
                : form.itemType === 'sealed'
                  ? t.sealedTip
                  : t.cardTip}
            </div>
          </aside>
          <section className="panel min-w-0">
            <div className="panel-heading gap-4 max-md:flex-col max-md:items-start">
              <div>
                <p className="eyebrow">{t.inventoryEyebrow}</p>
                <h2>{t.inventoryTitle}</h2>
              </div>
              <div className="flex w-full flex-1 items-center justify-end gap-2 md:w-auto">
                <div className="relative w-full max-w-64">
                  <Search
                    className={`absolute top-1/2 size-4 -translate-y-1/2 text-slate-400 ${rtl ? 'right-3' : 'left-3'}`}
                  />
                  <Input
                    aria-label={t.searchInventory}
                    className={`h-10 rounded-xl bg-slate-50 ${rtl ? 'pr-9' : 'pl-9'}`}
                    placeholder={t.searchPlaceholder}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <Button
                  aria-label={t.updateNow}
                  className="h-10 rounded-xl"
                  variant="outline"
                  onClick={() => refreshPrices(true)}
                  disabled={syncing || items.length === 0}
                >
                  <RefreshCw className={syncing ? 'animate-spin' : ''} />
                  <span className="hidden sm:inline">{t.updatePrices}</span>
                </Button>
              </div>
            </div>
            {message && (
              <output className="mb-4 block rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                {message}
              </output>
            )}
            {costEditor && (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                      {t.editCost}
                    </p>
                    <p className="mt-1 font-semibold text-slate-800">
                      {costEditor.name}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setCostEditor(null)}
                  >
                    <X />
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto]">
                  <label className="field-label">
                    {costEditor.itemType === 'card' &&
                    costEditor.costSource === 'pulled'
                      ? t.packCost
                      : t.unitCost}
                    <Input
                      dir="ltr"
                      className="field-input bg-white text-start"
                      min="0"
                      step="0.01"
                      type="number"
                      value={costEditor.unitCost}
                      onChange={(e) =>
                        setCostEditor({
                          ...costEditor,
                          unitCost: e.target.value,
                        })
                      }
                    />
                  </label>
                  {costEditor.itemType === 'card' && (
                    <label className="flex items-center gap-2 self-end pb-3 text-xs font-semibold text-slate-600">
                      <Checkbox
                        checked={costEditor.costSource === 'pulled'}
                        onCheckedChange={(checked) =>
                          setCostEditor({
                            ...costEditor,
                            costSource:
                              checked === true ? 'pulled' : 'purchase',
                          })
                        }
                      />
                      {t.pulledMyself}
                    </label>
                  )}
                  <label className="flex items-center gap-2 self-end pb-3 text-xs font-semibold text-slate-600">
                    <Checkbox
                      checked={costEditor.taxable}
                      onCheckedChange={(checked) =>
                        setCostEditor({
                          ...costEditor,
                          taxable: checked === true,
                          taxRate: checked === true ? costEditor.taxRate : '',
                        })
                      }
                    />
                    {t.taxablePurchase}
                  </label>
                  {costEditor.taxable ? (
                    <label className="field-label">
                      {t.taxRate}
                      <Input
                        dir="ltr"
                        className="field-input bg-white text-start"
                        min="0"
                        max="25"
                        step="0.001"
                        type="number"
                        value={costEditor.taxRate}
                        onChange={(e) =>
                          setCostEditor({
                            ...costEditor,
                            taxRate: e.target.value,
                          })
                        }
                      />
                    </label>
                  ) : (
                    <div />
                  )}
                  <Button
                    type="button"
                    className="h-11 self-end rounded-xl"
                    disabled={savingCost}
                    onClick={saveCost}
                  >
                    {savingCost ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <Save />
                    )}
                    {t.saveCost}
                  </Button>
                </div>
              </div>
            )}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <Table>
                <TableHeader className="bg-[#f7f8fa]">
                  <TableRow>
                    <TableHead className="ps-4">{t.product}</TableHead>
                    <TableHead>{t.typePrinting}</TableHead>
                    <TableHead className="text-center">{t.quantity}</TableHead>
                    <TableHead className="text-end">{t.unitPrice}</TableHead>
                    <TableHead className="text-end">
                      {t.referenceTotal}
                    </TableHead>
                    <TableHead className="bg-amber-50 text-end text-amber-900">
                      {t.cashValue80}
                    </TableHead>
                    <TableHead className="text-end">{t.cost}</TableHead>
                    <TableHead className="min-w-40 text-end">
                      {t.profitRoi}
                    </TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="h-40 text-center text-slate-400"
                      >
                        <LoaderCircle className="mx-auto mb-2 animate-spin" />
                        {t.loading}
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-48 text-center">
                        <WalletCards className="mx-auto mb-3 size-8 text-slate-300" />
                        <p className="font-semibold text-slate-600">
                          {items.length ? t.noMatches : t.emptyVault}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {t.addFirst}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((item) => {
                      const isMerch = item.itemType === 'merch',
                        total = (item.marketPrice || 0) * item.quantity,
                        cashRate = cashRateFor(item.itemType),
                        adjustedTotal = total * cashRate,
                        taxedUnitCost = afterTaxUnitCost(item),
                        costTotal = (taxedUnitCost || 0) * item.quantity,
                        hasRoi = taxedUnitCost != null && costTotal > 0,
                        marketProfit = total - costTotal,
                        adjustedProfit = adjustedTotal - costTotal,
                        href = isMerch
                          ? item.sourceUrl ||
                            `https://www.pokemoncenter.com/product/${item.sourceId}`
                          : `https://www.tcgplayer.com/product/${item.productId}`;
                      return (
                        <TableRow key={item.id} className="group">
                          <TableCell className="ps-4">
                            <div className="flex items-center gap-3">
                              {isMerch ? (
                                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600">
                                  <ShoppingBag className="size-6" />
                                </span>
                              ) : (
                                <img
                                  className={`rounded-md object-contain shadow-sm ${item.itemType === 'sealed' ? 'h-14 w-14 bg-white' : 'h-14 w-10'}`}
                                  src={`https://tcgplayer-cdn.tcgplayer.com/product/${item.productId}_200w.jpg`}
                                  alt=""
                                />
                              )}
                              <div dir="auto">
                                <a
                                  className="flex items-center gap-1 font-semibold text-[#182033] hover:text-blue-600"
                                  href={href}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {item.name}
                                  <ExternalLink className="size-3 opacity-50" />
                                </a>
                                <p
                                  dir="ltr"
                                  className="mt-1 font-mono text-[11px] text-slate-400"
                                >
                                  #{isMerch ? item.sourceId : item.productId}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs ${isMerch ? 'bg-rose-50 text-rose-700' : item.itemType === 'sealed' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}
                            >
                              {isMerch
                                ? t.merch
                                : item.itemType === 'sealed'
                                  ? t.sealed
                                  : item.printing}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div
                              dir="ltr"
                              className="mx-auto flex w-fit items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm"
                            >
                              <Button
                                type="button"
                                aria-label={tr('decrease', { name: item.name })}
                                title={
                                  item.quantity <= 1
                                    ? t.minQuantity
                                    : t.decreaseOne
                                }
                                variant="ghost"
                                size="icon-xs"
                                disabled={item.quantity <= 1}
                                onClick={() => changeQuantity(item.id, -1)}
                              >
                                <Minus />
                              </Button>
                              <span className="min-w-8 px-1 text-center font-semibold tabular-nums">
                                {number.format(item.quantity)}
                              </span>
                              <Button
                                type="button"
                                aria-label={tr('increase', { name: item.name })}
                                title={t.increaseOne}
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => changeQuantity(item.id, 1)}
                              >
                                <Plus />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell
                            dir="ltr"
                            className="text-end tabular-nums"
                          >
                            {item.marketPrice == null ? (
                              <span className="text-slate-400">
                                {t.pendingPrice}
                              </span>
                            ) : (
                              <>
                                <span className="block">
                                  {usd.format(item.marketPrice)}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {isMerch
                                    ? t.officialPriceSource
                                    : 'TCGplayer'}
                                </span>
                              </>
                            )}
                          </TableCell>
                          <TableCell
                            dir="ltr"
                            className="text-end font-semibold tabular-nums"
                          >
                            {usd.format(total)}
                          </TableCell>
                          <TableCell
                            dir="ltr"
                            className="bg-amber-50/60 text-end font-bold tabular-nums text-amber-900"
                          >
                            <span className="me-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                              {cashRate * 100}%
                            </span>
                            {usd.format(adjustedTotal)}
                          </TableCell>
                          <TableCell
                            dir="ltr"
                            className="min-w-32 text-end tabular-nums"
                          >
                            {isMerch ? (
                              <span className="text-slate-300">—</span>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <div>
                                  <span className="block font-semibold">
                                    {taxedUnitCost == null
                                      ? t.notSet
                                      : usd.format(taxedUnitCost)}
                                  </span>
                                  {item.unitCost != null && (
                                    <span className="block text-[10px] text-slate-400">
                                      {item.itemType === 'card' &&
                                      item.costSource === 'pulled'
                                        ? t.packCostBasis
                                        : t.purchaseCostBasis}
                                    </span>
                                  )}
                                  {item.taxable ? (
                                    <span className="text-[10px] text-slate-400">
                                      {tr('includesTax', {
                                        rate: item.taxRate,
                                      })}
                                    </span>
                                  ) : item.unitCost != null ? (
                                    <span className="text-[10px] text-slate-400">
                                      {t.noTax}
                                    </span>
                                  ) : null}
                                </div>
                                <Button
                                  type="button"
                                  aria-label={tr('editItemCost', {
                                    name: item.name,
                                  })}
                                  title={t.editCost}
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => editCost(item)}
                                >
                                  <Pencil />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                          <TableCell
                            dir="ltr"
                            className="min-w-40 text-end tabular-nums"
                          >
                            {isMerch || !hasRoi || item.marketPrice == null ? (
                              <span className="text-slate-300">—</span>
                            ) : (
                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="me-2 text-slate-400">
                                    {t.marketShort}
                                  </span>
                                  <span
                                    className={
                                      marketProfit >= 0
                                        ? 'text-base font-extrabold text-emerald-700'
                                        : 'text-base font-extrabold text-red-600'
                                    }
                                  >
                                    {usd.format(marketProfit)} ·{' '}
                                    {percent.format(
                                      (marketProfit / costTotal) * 100,
                                    )}
                                    %
                                  </span>
                                </div>
                                <div>
                                  <span className="me-2 text-slate-400">
                                    {t.adjustedShort}
                                  </span>
                                  <span
                                    className={
                                      adjustedProfit >= 0
                                        ? 'text-base font-extrabold text-emerald-700'
                                        : 'text-base font-extrabold text-red-600'
                                    }
                                  >
                                    {usd.format(adjustedProfit)} ·{' '}
                                    {percent.format(
                                      (adjustedProfit / costTotal) * 100,
                                    )}
                                    %
                                  </span>
                                </div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              aria-label={tr('deleteItem', { name: item.name })}
                              title={t.deleteTitle}
                              variant="ghost"
                              size="icon"
                              className="text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-500 focus:opacity-100"
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <p>{t.priceDisclaimer}</p>
              <button
                className="flex items-center gap-1.5 font-semibold text-slate-500 hover:text-slate-800"
                onClick={exportCsv}
              >
                <ArrowDownToLine className="size-3.5" />
                {t.exportCsv}
              </button>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
