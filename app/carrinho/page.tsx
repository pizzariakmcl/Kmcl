"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CartItem = {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

function normalizeCart(items: CartItem[]) {
  const map = new Map<string, CartItem>();

  for (const item of items) {
    const existing = map.get(item.productId);

    if (existing) {
      existing.quantity += Number(item.quantity);
    } else {
      map.set(item.productId, {
        ...item,
        price: Number(item.price),
        quantity: Number(item.quantity),
      });
    }
  }

  return Array.from(map.values());
}

export default function CarrinhoPage() {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem("cart");

    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        const normalized = normalizeCart(Array.isArray(parsed) ? parsed : []);
        setCart(normalized);
        localStorage.setItem("cart", JSON.stringify(normalized));
      } catch {
        setCart([]);
      }
    }
  }, []);

  function saveCart(nextCart: CartItem[]) {
    const normalized = normalizeCart(nextCart);
    setCart(normalized);
    localStorage.setItem("cart", JSON.stringify(normalized));
  }

  function increaseQuantity(productId: string) {
    const nextCart = cart.map((item) =>
      item.productId === productId
        ? { ...item, quantity: Number(item.quantity) + 1 }
        : item
    );

    saveCart(nextCart);
  }

  function decreaseQuantity(productId: string) {
    const nextCart = cart
      .map((item) =>
        item.productId === productId
          ? { ...item, quantity: Number(item.quantity) - 1 }
          : item
      )
      .filter((item) => item.quantity > 0);

    saveCart(nextCart);
  }

  function removeItem(productId: string) {
    const nextCart = cart.filter((item) => item.productId !== productId);
    saveCart(nextCart);
  }

  function clearCart() {
    const confirmed = confirm("Deseja limpar todo o carrinho?");
    if (!confirmed) return;

    setCart([]);
    localStorage.removeItem("cart");
  }

  const totalItems = useMemo(() => {
    return cart.reduce((acc, item) => acc + Number(item.quantity), 0);
  }, [cart]);

  const totalPrice = useMemo(() => {
    return cart.reduce(
      (acc, item) => acc + Number(item.price) * Number(item.quantity),
      0
    );
  }, [cart]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-red-50 text-black">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-600">
              Seu pedido
            </p>
            <h1 className="text-3xl font-black">Carrinho</h1>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-red-200 bg-white px-4 py-2 font-bold text-red-600"
          >
            ← Voltar ao cardápio
          </Link>
        </header>

        {cart.length === 0 ? (
          <div className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
            <div className="mb-3 text-5xl">🛒</div>
            <h2 className="text-2xl font-bold">Seu carrinho está vazio</h2>
            <p className="mt-2 text-gray-600">
              Adicione produtos para continuar seu pedido.
            </p>

            <Link
              href="/"
              className="mt-6 inline-block rounded-2xl bg-red-600 px-5 py-3 font-bold text-white"
            >
              Ver cardápio
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <section className="space-y-4">
              {cart.map((item) => {
                const subtotal = Number(item.price) * Number(item.quantity);

                return (
                  <article
                    key={item.productId}
                    className="rounded-3xl border border-red-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-100 text-3xl">
                          🍕
                        </div>

                        <div>
                          <h2 className="text-lg font-bold">{item.name}</h2>
                          <p className="text-sm text-gray-500">
                            Unitário: R$ {Number(item.price).toFixed(2)}
                          </p>
                          <p className="mt-1 font-bold text-red-600">
                            Subtotal: R$ {subtotal.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => removeItem(item.productId)}
                        className="rounded-xl border border-red-200 px-3 py-2 text-sm font-bold text-red-600"
                      >
                        Remover
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-600">
                        Quantidade
                      </p>

                      <div className="flex items-center gap-3 rounded-2xl bg-red-50 px-3 py-2">
                        <button
                          onClick={() => decreaseQuantity(item.productId)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-lg font-bold text-white"
                        >
                          -
                        </button>

                        <span className="min-w-[24px] text-center text-lg font-bold">
                          {item.quantity}
                        </span>

                        <button
                          onClick={() => increaseQuantity(item.productId)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-lg font-bold text-white"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>

            <aside className="sticky top-4 h-fit rounded-3xl border border-red-100 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black">Resumo do pedido</h2>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>Itens</span>
                  <strong>{totalItems}</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span>Total</span>
                  <strong className="text-2xl text-red-600">
                    R$ {totalPrice.toFixed(2)}
                  </strong>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Link
                  href="/checkout"
                  className="block w-full rounded-2xl bg-red-600 px-4 py-3 text-center font-bold text-white"
                >
                  Ir para checkout
                </Link>

                <button
                  onClick={clearCart}
                  className="w-full rounded-2xl border border-red-200 px-4 py-3 font-bold text-red-600"
                >
                  Limpar carrinho
                </button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}