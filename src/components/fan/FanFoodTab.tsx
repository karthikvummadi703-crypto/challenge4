import React from 'react';
import { ShoppingCart, Minus, Plus } from 'lucide-react';

const FOOD_MENU = [
  { id: 'item-1', name: 'Veg Burger',     price: 6.99, category: 'Burgers',   image: '🍔' },
  { id: 'item-2', name: 'Chicken Burger', price: 7.99, category: 'Burgers',   image: '🍔' },
  { id: 'item-3', name: 'French Fries',   price: 3.49, category: 'Snacks',    image: '🍟' },
  { id: 'item-4', name: 'Coke',           price: 2.49, category: 'Beverages', image: '🥤' },
] as const;

export { FOOD_MENU };

interface FanFoodTabProps {
  seatNumber: string;
  cart: Record<string, number>;
  onUpdateCartQty: (id: string, delta: number) => void;
  onPlaceOrder: (e: React.FormEvent) => void;
  orderSuccess: boolean;
}

export default function FanFoodTab({ seatNumber, cart, onUpdateCartQty, onPlaceOrder, orderSuccess }: FanFoodTabProps) {
  const cartSubtotal = (Object.entries(cart) as [string, number][]).reduce((sum, [id, qty]) => {
    const item = FOOD_MENU.find(f => f.id === id);
    return sum + (item ? Number(item.price) * Number(qty) : 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-widest">Beverage &amp; Food Delivery</span>
        <h2 className="text-2xl font-black text-white tracking-wide uppercase">In-Seat Catering</h2>
        <p className="text-xs text-slate-500">Delivered directly to seat <strong>{seatNumber}</strong></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Menu */}
        <div className="md:col-span-3 space-y-4">
          <h3 className="font-sans font-bold text-sm text-slate-300 uppercase">Available Menu</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FOOD_MENU.map((item) => {
              const qty = cart[item.id] || 0;
              return (
                <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3.5">
                    <span className="text-2xl filter saturate-100">{item.image}</span>
                    <div>
                      <h4 className="font-bold text-sm text-white">{item.name}</h4>
                      <span className="text-xs text-emerald-400 font-mono font-bold">${item.price}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <button type="button" aria-label={`Remove one ${item.name}`} onClick={() => onUpdateCartQty(item.id, -1)}
                      className="p-1 rounded-md bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white cursor-pointer">
                      <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <span className="text-sm font-bold font-mono text-white w-4 text-center" aria-label={`${qty} ${item.name} in cart`}>{qty}</span>
                    <button type="button" aria-label={`Add one ${item.name}`} onClick={() => onUpdateCartQty(item.id, 1)}
                      className="p-1 rounded-md bg-slate-950 border border-slate-800 hover:border-slate-750 text-slate-400 hover:text-white cursor-pointer">
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cart */}
        <div className="md:col-span-2">
          <form onSubmit={onPlaceOrder} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="font-sans font-bold text-sm text-white uppercase border-b border-slate-800 pb-2 flex items-center space-x-2">
              <ShoppingCart className="h-4 w-4 text-emerald-400" />
              <span>Your Catering Order</span>
            </h3>

            <div className="space-y-3">
              {(Object.entries(cart) as [string, number][]).filter(([_, q]) => Number(q) > 0).map(([id, qty]) => {
                const item = FOOD_MENU.find(f => f.id === id);
                if (!item) return null;
                return (
                  <div key={id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{item.name} <strong className="text-emerald-400 font-mono">x{qty}</strong></span>
                    <span className="text-white font-mono">${(Number(item.price) * Number(qty)).toFixed(2)}</span>
                  </div>
                );
              })}
              {(Object.values(cart) as number[]).reduce((a, b) => Number(a) + Number(b), 0) === 0 && (
                <p className="text-xs text-slate-500 text-center py-6">Your catering tray is empty. Add food items to begin.</p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800/60 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Delivery location:</span>
                <strong className="text-white font-mono uppercase">Seat {seatNumber}</strong>
              </div>
              <div className="flex justify-between text-base font-bold pt-1">
                <span>Total Price:</span>
                <strong className="text-emerald-400 font-mono">${cartSubtotal.toFixed(2)}</strong>
              </div>
            </div>

            {orderSuccess && (
              <div role="status" aria-live="polite" className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl text-center font-medium">
                Order Placed! Delivery is en-route.
              </div>
            )}

            <button type="submit" disabled={cartSubtotal === 0}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-900 text-black font-sans font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md">
              Place Catering Order
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
