import React, { useState } from 'react';
import { useChata } from '../../context/ChataContext';
import { ShoppingItem, Expense, InStoreCartItem } from '../../types';
import {
  ShoppingBag,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Calculator,
  Receipt,
  Camera,
  DollarSign,
  User,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Tag,
  Loader2,
  Barcode,
} from 'lucide-react';
import { ScanReceiptModal } from '../modals/ScanReceiptModal';
import { BarcodeScannerModal } from '../modals/BarcodeScannerModal';
import { EXPENSE_CATEGORIES } from '../../constants/categories';

export const ShoppingView: React.FC = () => {
  const {
    currentProfile,
    shoppingItems,
    expenses,
    pantryItems,
    budgetLimits,
    addShoppingItem,
    toggleShoppingItem,
    deleteShoppingItem,
    finishShoppingWithCart,
    addExpense,
    deleteExpense,
    addPantryItem,
    deletePantryItem,
    setBudgetLimit,
    showToast,
  } = useChata();

  const [activeTab, setActiveTab] = useState<'list' | 'calculator' | 'expenses' | 'pantry' | 'budget'>('list');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);

  // New shopping item form
  const [newItemName, setNewItemName] = useState('');
  const [newItemCat, setNewItemCat] = useState('Spożywcze');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  // In-Store Live Calculator State
  const [cartItems, setCartItems] = useState<InStoreCartItem[]>([]);
  const [calcInputName, setCalcInputName] = useState('');
  const [calcInputPrice, setCalcInputPrice] = useState('');
  const [calcInputQty, setCalcInputQty] = useState('1');
  const [isReceiptScanning, setIsReceiptScanning] = useState(false);

  // Manual Expense Form
  const [expAmount, setExpAmount] = useState('');
  const [expNote, setExpNote] = useState('');
  const [expCategory, setExpCategory] = useState('Spożywcze & Dom');

  const pendingItems = shoppingItems.filter(i => !i.isBought);
  const boughtItems = shoppingItems.filter(i => i.isBought);

  // Live cart total
  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Handle adding to shopping list
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    addShoppingItem(
      newItemName.trim(),
      newItemCat,
      newItemPrice ? parseFloat(newItemPrice) : undefined,
      newItemQty.trim() || undefined
    );
    setNewItemName('');
    setNewItemQty('');
    setNewItemPrice('');
  };

  // Add item into in-store cart
  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(calcInputPrice);
    if (isNaN(price) || price <= 0) {
      showToast('Wpisz poprawną cenę', 'Cena musi być większa od zera.', 'warning');
      return;
    }

    const qty = parseInt(calcInputQty) || 1;
    const name = calcInputName.trim() || `Produkt ${cartItems.length + 1}`;

    const newCartItem: InStoreCartItem = {
      id: 'cart-' + Date.now().toString(),
      name,
      price,
      quantity: qty,
      category: 'Spożywcze',
    };

    setCartItems(prev => [newCartItem, ...prev]);
    setCalcInputName('');
    setCalcInputPrice('');
    setCalcInputQty('1');
    showToast('Dodano do koszyka', `${name} (${qty}x ${price.toFixed(2)} zł)`, 'info');
  };

  const handleQuickAddFromList = (item: ShoppingItem) => {
    const price = item.estimatedPrice || 0;
    setCartItems(prev => [
      {
        id: 'cart-' + Date.now().toString(),
        name: item.name,
        price,
        quantity: 1,
        category: item.category,
      },
      ...prev,
    ]);
    toggleShoppingItem(item.id);
    showToast('Przeniesiono do koszyka', item.name, 'success');
  };

  const handleRemoveFromCart = (id: string) => {
    setCartItems(prev => prev.filter(c => c.id !== id));
  };

  const handleFinishShopping = () => {
    if (cartItems.length === 0 && cartTotal <= 0) {
      showToast('Koszyk jest pusty', 'Dodaj przynajmniej jeden produkt przed zakończeniem.', 'warning');
      return;
    }
    finishShoppingWithCart(cartItems, cartTotal);
    setCartItems([]);
    setActiveTab('expenses');
  };

  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsReceiptScanning(true);
    showToast('Skanowanie paragonu...', 'AI Gemini odczytuje sumę i pozycje ze sklepu', 'info');

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await fetch('/api/ai?action=scan-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mode: 'receipt' }),
        });
        const data = await res.json();

        if (data.amount) {
          addExpense({
            amount: parseFloat(data.amount) || 0,
            note: data.note || 'Paragon ze sklepu',
            category: data.category || 'Spożywcze & Dom',
            date: data.date || new Date().toISOString().split('T')[0],
            boughtById: currentProfile.id,
            boughtByName: currentProfile.name,
          });
          // Spiżarnia z paragonu
          if (Array.isArray(data.items) && data.items.length > 0) {
            data.items.forEach((it: any) => {
              addPantryItem({
                name: it.name || 'Produkt',
                category: it.category || data.category || 'Spożywcze',
                quantity: it.quantity || '1 szt.',
                unit: 'szt.',
                lowThreshold: 1,
              });
            });
            showToast('Spiżarnia', `Dodano ${data.items.length} produktów z paragonu`, 'success');
          }
          showToast('Zeskanowano paragon!', `Dodano wydatek ${data.amount} PLN (${data.note || 'Sklep'})`, 'success');
          setActiveTab('expenses');
        } else {
          showToast('Brak kwoty', 'Nie udało się jednoznacznie odczytać sumy z paragonu.', 'warning');
        }
      } catch {
        showToast('Błąd skanowania', 'Wystąpił problem z analizą paragonu.', 'error');
      } finally {
        setIsReceiptScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddManualExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expAmount);
    if (isNaN(amount) || amount <= 0) return;

    addExpense({
      amount,
      note: expNote.trim() || 'Zakupy domowe',
      category: expCategory,
      date: new Date().toISOString().split('T')[0],
      boughtById: currentProfile.id,
      boughtByName: currentProfile.name,
    });

    setExpAmount('');
    setExpNote('');
    showToast('Zapisano wydatek', `${amount.toFixed(2)} PLN`, 'success');
  };

  // Spending totals
  const totalSpentAll = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-5 pb-24 animate-in fade-in duration-150">
      {/* Top Header & Subtabs */}
      <div className="bg-white rounded-[32px] p-5 border border-[#78350F]/10 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-[#2D4F1E] flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#2D4F1E]" />
            Zakupy & Kalkulator w sklepie
          </h2>
          <p className="text-xs text-[#78350F]/70 mt-0.5">
            Wspólna lista zakupów dla Chaty, kalkulator w alejkach sklepowych i historia wydatków.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="bg-[#78350F]/5 p-1 rounded-full flex items-center border border-[#78350F]/10 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'list', label: 'Lista potrzeb', count: pendingItems.length },
            { id: 'calculator', label: '🛒 W sklepie', count: cartItems.length > 0 ? cartItems.length : undefined },
            { id: 'expenses', label: 'Wydatki' },
            { id: 'pantry', label: 'Spiżarnia', count: pantryItems.length },
            { id: 'budget', label: 'Limity' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === t.id
                  ? 'bg-[#2D4F1E] text-[#FDFCF0] shadow-xs'
                  : 'text-[#78350F] hover:text-[#2D4F1E]'
              }`}
            >
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  activeTab === t.id ? 'bg-white/20 text-white' : 'bg-[#2D4F1E]/10 text-[#2D4F1E]'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: SHOPPING LIST */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Add Item Bar */}
          <form onSubmit={handleAddItem} className="bg-white rounded-[32px] border border-[#78350F]/10 p-4 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <input
                type="text"
                required
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                placeholder="Co trzeba kupić? (np. Mleko 3.2%, Kora do ogrodu, Brykiet...)"
                className="sm:col-span-6 px-3.5 py-2.5 bg-[#FDFCF0] border border-[#78350F]/15 rounded-xl text-xs font-medium text-[#2D4F1E] focus:outline-none focus:ring-2 focus:ring-[#2D4F1E]/40"
              />

              <select
                value={newItemCat}
                onChange={e => setNewItemCat(e.target.value)}
                className="sm:col-span-3 px-3 py-2.5 bg-[#FDFCF0] border border-[#78350F]/15 rounded-xl text-xs font-semibold text-[#78350F] focus:outline-none focus:ring-2 focus:ring-[#2D4F1E]/40"
              >
                <option value="Spożywcze">🍞 Spożywcze</option>
                <option value="Chemia & Dom">🧼 Chemia & Dom</option>
                <option value="Ogród & Opał">🪵 Ogród & Opał</option>
                <option value="Warsztat & Narzędzia">🔧 Warsztat</option>
                <option value="Inne">📦 Inne</option>
              </select>

              <input
                type="text"
                value={newItemQty}
                onChange={e => setNewItemQty(e.target.value)}
                placeholder="Ilość (np. 2 szt, 1kg)"
                className="sm:col-span-2 px-3 py-2.5 bg-[#FDFCF0] border border-[#78350F]/15 rounded-xl text-xs text-[#2D4F1E] focus:outline-none focus:ring-2 focus:ring-[#2D4F1E]/40"
              />

              <button
                type="submit"
                className="sm:col-span-1 py-2.5 bg-[#2D4F1E] hover:bg-[#1f3715] text-[#FDFCF0] rounded-xl font-bold text-xs flex items-center justify-center transition-colors shadow-xs"
                title="Dodaj"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsBarcodeOpen(true)}
              className="mt-2 w-full py-2 bg-white border border-[#78350F]/15 hover:bg-[#FDFCF0] text-[#78350F] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Barcode className="w-4 h-4 text-[#D97706]" /> Skanuj kod kreskowy (dodaj produkt)
            </button>
          </form>

          {/* Pending Shopping Items */}
          <div className="bg-white rounded-[32px] border border-[#78350F]/10 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#78350F]/10 mb-3">
              <h3 className="text-sm font-bold text-[#2D4F1E] flex items-center gap-2">
                <span>Do kupienia</span>
                <span className="bg-[#D97706]/15 text-[#D97706] text-xs px-2 py-0.5 rounded-full font-mono font-bold">
                  {pendingItems.length}
                </span>
              </h3>

              {pendingItems.length > 0 && (
                <button
                  onClick={() => setActiveTab('calculator')}
                  className="text-xs font-bold text-[#D97706] hover:underline flex items-center gap-1"
                >
                  <span>Przejdź do trybu sklepowego</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-2">
              {pendingItems.length === 0 ? (
                <div className="py-8 text-center text-[#78350F]/60 text-xs">
                  Wszystko kupione! Lodówka i spiżarnia zaopatrzone. 🎉
                </div>
              ) : (
                pendingItems.map(item => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl border border-[#78350F]/10 bg-[#FDFCF0]/60 hover:bg-[#FDFCF0] transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => toggleShoppingItem(item.id)}
                        className="text-[#78350F]/40 hover:text-[#2D4F1E] transition-colors shrink-0"
                      >
                        <Circle className="w-5 h-5" />
                      </button>
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-[#2D4F1E] block truncate">
                          {item.name}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-[#78350F]/70">
                          <span className="bg-[#78350F]/10 px-1.5 py-0.2 rounded font-medium">{item.category}</span>
                          {item.quantity && <span>• {item.quantity}</span>}
                          <span>• dodał(a): {item.addedByName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleQuickAddFromList(item)}
                        className="px-3 py-1.5 bg-[#D97706]/15 hover:bg-[#D97706]/25 text-[#D97706] rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                        title="Dodaj do koszyka w sklepie"
                      >
                        + Koszyk
                      </button>
                      <button
                        onClick={() => deleteShoppingItem(item.id)}
                        className="p-1.5 text-[#78350F]/40 hover:text-red-600 rounded-lg transition-colors"
                        title="Usuń"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Already Bought Items Accordion */}
          {boughtItems.length > 0 && (
            <div className="bg-white/70 border border-[#78350F]/10 rounded-[28px] p-4">
              <h4 className="text-xs font-bold text-[#78350F]/70 uppercase tracking-wider mb-2">
                Kupione niedawno ({boughtItems.length})
              </h4>
              <div className="space-y-1.5">
                {boughtItems.slice(0, 5).map(item => (
                  <div
                    key={item.id}
                    className="p-2.5 px-3.5 rounded-xl bg-[#FDFCF0] border border-[#78350F]/10 flex items-center justify-between text-xs text-[#78350F]/60 line-through"
                  >
                    <span>{item.name} {item.boughtByName ? `(kupił: ${item.boughtByName})` : ''}</span>
                    <button
                      onClick={() => toggleShoppingItem(item.id)}
                      className="text-[#D97706] hover:underline text-[11px] font-medium no-underline"
                    >
                      Przywróć
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: IN-STORE LIVE CALCULATOR */}
      {activeTab === 'calculator' && (
        <div className="space-y-4">
          {/* Store Live Counter Hero Banner */}
          <div className="bg-[#2D4F1E] text-[#FDFCF0] rounded-[32px] p-6 shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block mb-0.5">
                  Tryb w sklepie: Koszyk na żywo
                </span>
                <h3 className="text-2xl sm:text-3xl font-display font-bold font-mono text-white">
                  {cartTotal.toFixed(2)} PLN
                </h3>
                <p className="text-xs text-[#FDFCF0]/80 mt-1">
                  Kupujący: <span className="font-bold underline">{currentProfile.name}</span> • Produktów w koszyku: {cartItems.length}
                </p>
              </div>

              <button
                onClick={handleFinishShopping}
                disabled={cartItems.length === 0}
                className="px-5 py-3 rounded-2xl bg-[#D97706] hover:bg-[#b45309] disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all active:scale-95"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Zakończ zakupy</span>
              </button>
            </div>
          </div>

          {/* Quick Input Keypad / Bar */}
          <form onSubmit={handleAddToCart} className="bg-white rounded-[32px] border border-[#78350F]/10 p-4 sm:p-5 shadow-xs">
            <div className="text-xs font-bold text-[#2D4F1E] mb-2 flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-[#2D4F1E]" />
              Wpisz produkt do koszyka w alejce:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <input
                type="text"
                value={calcInputName}
                onChange={e => setCalcInputName(e.target.value)}
                placeholder="Nazwa produktu (np. Masło, Pomidory, Ziemia)"
                className="sm:col-span-5 px-3.5 py-2.5 bg-[#FDFCF0] border border-[#78350F]/15 rounded-xl text-xs font-medium text-[#2D4F1E] focus:outline-none focus:ring-2 focus:ring-[#2D4F1E]/40"
              />

              <div className="sm:col-span-4 relative">
                <input
                  type="number"
                  step="0.01"
                  required
                  value={calcInputPrice}
                  onChange={e => setCalcInputPrice(e.target.value)}
                  placeholder="Cena (zł)"
                  className="w-full px-3.5 py-2.5 bg-[#FDFCF0] border border-[#78350F]/15 rounded-xl text-xs font-mono font-bold text-[#2D4F1E] focus:outline-none focus:ring-2 focus:ring-[#2D4F1E]/40 pr-8"
                />
                <span className="absolute right-3 top-2.5 text-xs text-[#78350F]/50 font-bold">zł</span>
              </div>

              <input
                type="number"
                min="1"
                value={calcInputQty}
                onChange={e => setCalcInputQty(e.target.value)}
                placeholder="Ilość"
                className="sm:col-span-2 px-3 py-2.5 bg-[#FDFCF0] border border-[#78350F]/15 rounded-xl text-xs text-[#2D4F1E] font-semibold focus:outline-none focus:ring-2 focus:ring-[#2D4F1E]/40"
              />

              <button
                type="submit"
                className="sm:col-span-1 py-2.5 bg-[#2D4F1E] hover:bg-[#1f3715] text-[#FDFCF0] rounded-xl font-bold text-xs flex items-center justify-center shadow-xs transition-colors"
                title="Dodaj"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Quick list checklist to tick items into cart */}
          {pendingItems.length > 0 && (
            <div className="glass-panel rounded-[28px] p-4 shadow-2xs">
              <h4 className="text-xs font-bold text-[#78350F] mb-2">
                Kliknij, aby wrzucić z listy do koszyka:
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {pendingItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleQuickAddFromList(item)}
                    className="px-3 py-1.5 bg-white hover:bg-[#D97706]/10 border border-[#D97706]/30 text-[#78350F] rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <span>+ {item.name}</span>
                    {item.quantity && <span className="text-[10px] text-[#78350F]/50 font-mono">({item.quantity})</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Current Cart Items List */}
          <div className="bg-white rounded-[32px] border border-[#78350F]/10 p-5 sm:p-6 shadow-xs">
            <h3 className="text-sm font-bold text-[#2D4F1E] mb-3">
              Pozycje w koszyku ({cartItems.length})
            </h3>

            {cartItems.length === 0 ? (
              <div className="py-8 text-center text-[#78350F]/60 text-xs">
                Koszyk jest pusty. Wpisuj ceny z półek lub klikaj pozycje z listy.
              </div>
            ) : (
              <div className="space-y-2">
                {cartItems.map(item => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-[#FDFCF0] border border-[#78350F]/10 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-[#2D4F1E] block truncate">
                        {item.name}
                      </span>
                      <span className="text-[11px] text-[#78350F]/70 font-mono">
                        {item.quantity} × {item.price.toFixed(2)} zł = {(item.quantity * item.price).toFixed(2)} zł
                      </span>
                    </div>

                    <button
                      onClick={() => handleRemoveFromCart(item.id)}
                      className="p-1.5 text-[#78350F]/40 hover:text-red-600 transition-colors"
                      title="Usuń"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: EXPENSES & OCR RECEIPTS */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Quick OCR Receipt Scan Banner */}
          <div className="bg-white rounded-[32px] border border-[#78350F]/10 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#D97706]/15 border border-[#D97706]/30 flex items-center justify-center text-[#D97706] shrink-0">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#2D4F1E]">
                  Inteligentny skaner paragonów Gemini AI
                </h3>
                <p className="text-xs text-[#78350F]/70">
                  Zrób zdjęcie paragonu ze sklepu — AI automatycznie odczyta kwotę, sklep i datę.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsScannerOpen(true)}
              className="px-4 py-2.5 rounded-full bg-[#2D4F1E] hover:bg-[#1f3715] text-[#FDFCF0] font-bold text-xs flex items-center gap-2 shadow-sm transition-all shrink-0"
            >
              <Camera className="w-4 h-4" />
              <span>Zrób zdjęcie paragonu</span>
            </button>
          </div>

          {/* Manual Expense Form */}
          <form onSubmit={handleAddManualExpense} className="bg-white rounded-[32px] border border-[#78350F]/10 p-4 sm:p-5 shadow-xs">
            <div className="text-xs font-bold text-[#2D4F1E] mb-2">
              Wpisz wydatek ręcznie:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-3 relative">
                <input
                  type="number"
                  step="0.01"
                  required
                  value={expAmount}
                  onChange={e => setExpAmount(e.target.value)}
                  placeholder="Kwota (PLN)"
                  className="w-full px-3.5 py-2.5 bg-[#FDFCF0] border border-[#78350F]/15 rounded-xl text-xs font-mono font-bold text-[#2D4F1E] focus:outline-none focus:ring-2 focus:ring-[#2D4F1E]/40"
                />
              </div>

              <input
                type="text"
                value={expNote}
                onChange={e => setExpNote(e.target.value)}
                placeholder="Opis (np. Opał, Biedronka, Castorama, Apteka...)"
                className="sm:col-span-5 px-3.5 py-2.5 bg-[#FDFCF0] border border-[#78350F]/15 rounded-xl text-xs text-[#2D4F1E] focus:outline-none focus:ring-2 focus:ring-[#2D4F1E]/40"
              />

              <select
                value={expCategory}
                onChange={e => setExpCategory(e.target.value)}
                className="sm:col-span-3 px-3 py-2.5 bg-[#FDFCF0] border border-[#78350F]/15 rounded-xl text-xs font-semibold text-[#78350F] focus:outline-none focus:ring-2 focus:ring-[#2D4F1E]/40"
              >
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>

              <button
                type="submit"
                className="sm:col-span-1 py-2.5 bg-[#2D4F1E] hover:bg-[#1f3715] text-[#FDFCF0] rounded-xl font-bold text-xs flex items-center justify-center shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Expenses History List */}
          <div className="bg-white rounded-[32px] border border-[#78350F]/10 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#78350F]/10 mb-3">
              <h3 className="text-sm font-bold text-[#2D4F1E]">
                Historia wydatków domowych
              </h3>
              <span className="text-xs font-bold text-[#78350F] font-mono">
                Łącznie: {totalSpentAll.toFixed(2)} PLN
              </span>
            </div>

            <div className="space-y-2">
              {expenses.length === 0 ? (
                <div className="py-6 text-center text-[#78350F]/60 text-xs">
                  Brak zapisanych wydatków.
                </div>
              ) : (
                expenses.map(exp => (
                  <div
                    key={exp.id}
                    className="p-3.5 rounded-2xl bg-[#FDFCF0] border border-[#78350F]/10 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#2D4F1E] truncate">
                          {exp.note}
                        </span>
                        <span className="text-[10px] bg-[#78350F]/10 text-[#78350F] px-1.5 py-0.2 rounded font-semibold">
                          {exp.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#78350F]/70 mt-0.5">
                        {exp.date} • Płacił(a): <strong className="text-[#2D4F1E]">{exp.boughtByName}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold font-mono text-[#2D4F1E]">
                        {exp.amount.toFixed(2)} zł
                      </span>
                      <button
                        onClick={() => deleteExpense(exp.id)}
                        className="p-1 text-[#78350F]/40 hover:text-red-600 transition-colors"
                        title="Usuń"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SPIŻARNIA — z paragonów */}
      {activeTab === 'pantry' && (
        <div className="space-y-4">
          <div className="bg-white rounded-[32px] border border-[#78350F]/10 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-[#2D4F1E] flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">🥫</span>
              Spiżarnia — co jest w domu
              <span className="text-[11px] font-normal text-[#78350F]/60">z paragonów + ręcznie</span>
            </h3>
            <p className="text-[11px] text-[#78350F]/70 mt-1">Produkty z paragonów trafiają tu automatycznie. Niski stan gdy &lt; próg.</p>
          </div>

          <div className="bg-white rounded-[32px] border border-[#78350F]/10 p-4 shadow-xs">
            <div className="flex gap-2 mb-3">
              <input
                id="pantry-name"
                placeholder="Produkt, np. Mleko"
                className="flex-1 px-3 py-2 bg-[#FDFCF0] border border-[#78350F]/15 rounded-xl text-xs"
              />
              <input id="pantry-qty" placeholder="Ilość, np. 2 szt." defaultValue="1 szt." className="w-28 px-3 py-2 bg-[#FDFCF0] border border-[#78350F]/15 rounded-xl text-xs" />
              <button
                onClick={() => {
                  const nameEl = document.getElementById('pantry-name') as HTMLInputElement;
                  const qtyEl = document.getElementById('pantry-qty') as HTMLInputElement;
                  if (!nameEl?.value.trim()) return;
                  addPantryItem({ name: nameEl.value.trim(), category: 'Spożywcze', quantity: qtyEl.value || '1 szt.' });
                  nameEl.value = '';
                }}
                className="px-4 py-2 bg-[#2D4F1E] text-white rounded-xl text-xs font-bold"
              >
                Dodaj
              </button>
            </div>
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {pantryItems.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#78350F]/60">Spiżarnia pusta — zeskanuj paragon lub dodaj ręcznie.</div>
              ) : (
                pantryItems.map(item => {
                  const isLow = parseInt(item.quantity) <= (item.lowThreshold || 1);
                  return (
                    <div key={item.id} className={`p-3 rounded-2xl border flex items-center justify-between gap-2 ${isLow ? 'bg-amber-50 border-amber-200' : 'bg-[#FDFCF0] border-[#78350F]/10'}`}>
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          {item.name} {isLow && <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full">Niski stan!</span>}
                        </div>
                        <div className="text-[11px] text-[#78350F]/60">{item.category} • {item.quantity} {item.expiryDate && `• ważne do ${item.expiryDate}`}</div>
                      </div>
                      <button onClick={() => deletePantryItem(item.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: LIMITY BUDŻETOWE — z paragonów */}
      {activeTab === 'budget' && (
        <div className="space-y-4">
          <div className="bg-white rounded-[32px] border border-[#78350F]/10 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-[#2D4F1E] flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">💰</span>
              Limity budżetowe per kategoria
            </h3>
            <p className="text-[11px] text-[#78350F]/70 mt-1">Ustaw miesięczny limit — pasek i alert gdy paragony go przekroczą.</p>
          </div>

          <div className="bg-white rounded-[32px] border border-[#78350F]/10 p-4 shadow-xs space-y-3">
            {EXPENSE_CATEGORIES.map(c => c.value).map(cat => {
              const limit = budgetLimits[cat]?.limit || 0;
              const spent = expenses.filter(e => e.category === cat && new Date(e.date).getMonth() === new Date().getMonth()).reduce((s, e) => s + e.amount, 0);
              const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
              const over = limit > 0 && spent > limit;
              return (
                <div key={cat} className={`p-3 rounded-2xl border ${over ? 'bg-red-50 border-red-200' : 'bg-[#FDFCF0] border-[#78350F]/10'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{cat}</span>
                    <span className="text-[11px] font-mono font-bold">{spent.toFixed(2)} / {limit || '—'} zł</span>
                  </div>
                  <div className="w-full h-2 bg-white border border-[#78350F]/10 rounded-full overflow-hidden">
                    <div className={`h-full ${over ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <input
                      type="number"
                      placeholder="Limit zł/mies."
                      defaultValue={limit || ''}
                      id={`budget-${cat}`}
                      className="flex-1 px-2 py-1.5 bg-white border border-[#78350F]/15 rounded-xl text-xs"
                    />
                    <button
                      onClick={() => {
                        const el = document.getElementById(`budget-${cat}`) as HTMLInputElement;
                        const v = parseFloat(el.value);
                        if (!isNaN(v) && v > 0) setBudgetLimit(cat, v);
                      }}
                      className="px-3 py-1.5 bg-[#2D4F1E] text-white rounded-xl text-xs font-bold"
                    >
                      Zapisz
                    </button>
                  </div>
                  {over && <div className="text-[11px] text-red-600 font-bold mt-1">⚠️ Przekroczono limit o {(spent - limit).toFixed(2)} zł!</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isScannerOpen && (
        <ScanReceiptModal
          onClose={() => setIsScannerOpen(false)}
          onReceiptParsed={(total, itemsCount, merchant) => {
            showToast('Zapisano z paragonu', `Zaksięgowano ${total.toFixed(2)} zł (${merchant})`, 'success');
          }}
        />
      )}

      {isBarcodeOpen && (
        <BarcodeScannerModal onClose={() => setIsBarcodeOpen(false)} />
      )}
    </div>
  );
};
