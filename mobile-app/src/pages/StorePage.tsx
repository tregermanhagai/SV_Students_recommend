import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocale } from '@/hooks/useLocale'

interface Product {
  id: string
  name: string
  price: number
  emoji: string
  testId: string
}

const PRODUCTS: Product[] = [
  { id: 'tshirt', name: 'T-Shirt with SV College Logo', price: 50, emoji: '👕', testId: 'product-card-tshirt' },
  { id: 'cup',    name: 'Cup with SV College Logo',     price: 20, emoji: '☕', testId: 'product-card-cup'    },
]

export default function StorePage() {
  const navigate = useNavigate()
  useLocale()
  const [cart, setCart] = useState<Record<string, number>>({})
  const [added, setAdded] = useState<string | null>(null)

  function addToCart(id: string) {
    setCart(c => ({ ...c, [id]: (c[id] ?? 0) + 1 }))
    setAdded(id)
    setTimeout(() => setAdded(null), 1200)
  }

  const total = Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = PRODUCTS.find(p => p.id === id)
    return sum + (p?.price ?? 0) * qty
  }, 0)

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24">
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-slate-400 text-xl">←</button>
          <h1 className="text-white text-xl font-bold">SV College Store</h1>
        </div>
        <p className="text-slate-400 text-sm">Practice checkout flow for branded college merchandise.</p>

        <div className="grid grid-cols-2 gap-3">
          {PRODUCTS.map(p => (
            <div key={p.id} className="card-surface overflow-hidden" data-test={p.testId}>
              <div className="aspect-square bg-white/5 flex items-center justify-center text-6xl">
                {p.emoji}
              </div>
              <div className="p-3 space-y-2">
                <p className="text-white text-sm font-medium leading-tight">{p.name}</p>
                <p className="text-accent font-bold">{p.price} ₪</p>
                {cart[p.id] ? (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs">In cart: {cart[p.id]}</span>
                    <button
                      onClick={() => addToCart(p.id)}
                      className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-xl"
                    >
                      + Add
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => addToCart(p.id)}
                    className={`w-full text-sm rounded-xl py-2 font-medium transition-all ${
                      added === p.id
                        ? 'bg-green-600/30 text-green-400'
                        : 'bg-accent/20 text-accent'
                    }`}
                  >
                    {added === p.id ? '✓ Added' : 'Add to cart'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {total > 0 && (
          <div className="card-surface p-4 space-y-3">
            <h2 className="text-white font-semibold">Cart</h2>
            {Object.entries(cart).map(([id, qty]) => {
              const p = PRODUCTS.find(p => p.id === id)!
              return (
                <div key={id} className="flex justify-between text-sm">
                  <span className="text-slate-300">{p.emoji} {p.name} × {qty}</span>
                  <span className="text-white">{p.price * qty} ₪</span>
                </div>
              )
            })}
            <div className="border-t border-white/10 pt-3 flex justify-between font-bold">
              <span className="text-white">Total</span>
              <span className="text-accent">{total} ₪</span>
            </div>
            <button className="btn-accent w-full">Checkout (demo)</button>
          </div>
        )}
      </div>
    </div>
  )
}
