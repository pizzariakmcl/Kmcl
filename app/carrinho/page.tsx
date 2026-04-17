"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CartItem = {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  isHalfHalf?: boolean;
  isCombo?: boolean;
  comboId?: string;
  comboSelectionsSummary?: string[];
  flavorIds?: string[];
  flavorNames?: string[];
  additionalIds?: string[];
  additionalNames?: string[];
};

export default function CarrinhoPage() {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem("cart");

    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        setCart(Array.isArray(parsed) ? parsed : []);
      } catch {
        setCart([]);
      }
    }
  }, []);

  function saveCart(nextCart: CartItem[]) {
    setCart(nextCart);
    localStorage.setItem("cart", JSON.stringify(nextCart));
  }

  function increaseQuantity(itemId: string) {
    const nextCart = cart.map((item) =>
      item.id === itemId
        ? { ...item, quantity: Number(item.quantity) + 1 }
        : item
    );

    saveCart(nextCart);
  }

  function decreaseQuantity(itemId: string) {
    const current = cart.find((item) => item.id === itemId);
    if (!current) return;

    if (Number(current.quantity) <= 1) {
      removeItem(itemId);
      return;
    }

    const nextCart = cart.map((item) =>
      item.id === itemId
        ? { ...item, quantity: Number(item.quantity) - 1 }
        : item
    );

    saveCart(nextCart);
  }

  function removeItem(itemId: string) {
    const nextCart = cart.filter((item) => item.id !== itemId);
    saveCart(nextCart);
  }

  function clearCart() {
    saveCart([]);
  }

  const totalItems = useMemo(
    () => cart.reduce((acc, item) => acc + Number(item.quantity), 0),
    [cart]
  );

  const totalPrice = useMemo(
    () =>
      cart.reduce(
        (acc, item) => acc + Number(item.price) * Number(item.quantity),
        0
      ),
    [cart]
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-red-100 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-red-500">
              Seu pedido
            </p>
            <h1 className="text-4xl font-bold text-gray-900">Carrinho</h1>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-red-200 bg-white px-4 py-2 font-semibold text-red-600 shadow-sm"
          >
            ← Voltar ao cardápio
          </Link>
        </div>

        {cart.length === 0 ? (
          <div className="rounded-3xl border border-red-100 bg-white p-10 text-center shadow-sm">
            <div className="mb-3 text-5xl">🛒</div>
            <h2 className="text-2xl font-bold text-gray-900">
              Seu carrinho está vazio
            </h2>
            <p className="mt-2 text-gray-600">
              Adicione pizzas, produtos ou combos para continuar.
            </p>

            <Link
              href="/"
              className="mt-6 inline-block rounded-xl bg-red-600 px-5 py-3 font-bold text-white"
            >
              Ir para o cardápio
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.5fr_0.8fr]">
            <div className="space-y-4">
              {cart.map((item) => {
                const subtotal = Number(item.price) * Number(item.quantity);

                return (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-red-100 bg-white p-5 shadow-sm"
                  >
                    <div className="flex gap-4">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-3xl">
                        {item.isCombo ? "🎁" : "🍕"}
                      </div>

                      <div className="flex flex-1 flex-col gap-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">
                              {item.isCombo
                                ? item.name
                                : item.isHalfHalf
                                ? "Pizza Meio a Meio"
                                : item.name}
                            </h3>

                            {item.isHalfHalf && item.flavorNames?.length ? (
                              <p className="mt-1 text-sm text-gray-600">
                                Sabores: {item.flavorNames.join(" + ")}
                              </p>
                            ) : null}

                            {!item.isHalfHalf && !item.isCombo && (
                              <p className="mt-1 text-sm text-gray-600">
                                Produto individual
                              </p>
                            )}

                            {item.isCombo &&
                              item.comboSelectionsSummary &&
                              item.comboSelectionsSummary.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {item.comboSelectionsSummary.map(
                                    (line, index) => (
                                      <p
                                        key={`${item.id}-combo-${index}`}
                                        className="text-sm text-gray-600"
                                      >
                                        {line}
                                      </p>
                                    )
                                  )}
                                </div>
                              )}

                            {item.additionalNames &&
                              item.additionalNames.length > 0 && (
                                <p className="mt-1 text-sm text-gray-600">
                                  Adicionais: {item.additionalNames.join(", ")}
                                </p>
                              )}

                            <p className="mt-2 text-sm text-gray-600">
                              Unitário: R$ {Number(item.price).toFixed(2)}
                            </p>

                            <p className="font-bold text-red-600">
                              Subtotal: R$ {subtotal.toFixed(2)}
                            </p>
                          </div>

                          <button
                            onClick={() => removeItem(item.id)}
                            className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600"
                          >
                            Remover
                          </button>
                        </div>

                        <div>
                          <p className="mb-2 text-sm text-gray-500">Quantidade</p>

                          <div className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-3 py-2">
                            <button
                              onClick={() => decreaseQuantity(item.id)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 font-bold text-white"
                            >
                              -
                            </button>

                            <span className="min-w-[24px] text-center font-bold text-gray-900">
                              {item.quantity}
                            </span>

                            <button
                              onClick={() => increaseQuantity(item.id)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 font-bold text-white"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <aside className="h-fit rounded-3xl border border-red-100 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">Resumo do pedido</h2>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between text-gray-600">
                  <span>Itens</span>
                  <span>{totalItems}</span>
                </div>

                <div className="flex items-center justify-between border-t pt-3 text-lg font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-red-600">R$ {totalPrice.toFixed(2)}</span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="mt-6 block rounded-xl bg-red-600 px-4 py-3 text-center font-bold text-white"
              >
                Ir para checkout
              </Link>

              <button
                onClick={clearCart}
                className="mt-3 w-full rounded-xl border border-red-200 px-4 py-3 font-semibold text-red-600"
              >
                Limpar carrinho
              </button>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}