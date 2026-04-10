"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string | null;
  active: boolean;
  inStock: boolean;
  categoryId: string;
};

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

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("TODOS");

  useEffect(() => {
    loadData();

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

  async function loadData() {
    try {
      const [c, p] = await Promise.all([
        fetch("/api/categories", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/products", { cache: "no-store" }).then((r) => r.json()),
      ]);

      setCategories(Array.isArray(c) ? c : []);
      setProducts(Array.isArray(p) ? p : []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setCategories([]);
      setProducts([]);
    }
  }

  function saveCart(nextCart: CartItem[]) {
    const normalized = normalizeCart(nextCart);
    setCart(normalized);
    localStorage.setItem("cart", JSON.stringify(normalized));
  }

  function addToCart(product: Product) {
    const exists = cart.find((i) => i.productId === product.id);

    if (exists) {
      const nextCart = cart.map((i) =>
        i.productId === product.id
          ? { ...i, quantity: Number(i.quantity) + 1 }
          : i
      );
      saveCart(nextCart);
      return;
    }

    const nextCart = [
      ...cart,
      {
        id: crypto.randomUUID(),
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: 1,
      },
    ];

    saveCart(nextCart);
  }

  function removeFromCart(productId: string) {
    const exists = cart.find((i) => i.productId === productId);

    if (!exists) return;

    if (Number(exists.quantity) <= 1) {
      const nextCart = cart.filter((i) => i.productId !== productId);
      saveCart(nextCart);
      return;
    }

    const nextCart = cart.map((i) =>
      i.productId === productId
        ? { ...i, quantity: Number(i.quantity) - 1 }
        : i
    );

    saveCart(nextCart);
  }

  function getProductQuantity(productId: string) {
    const item = cart.find((i) => i.productId === productId);
    return item ? Number(item.quantity) : 0;
  }

  const cartCount = cart.reduce((total, item) => {
    return total + Number(item.quantity);
  }, 0);

  const filteredProducts =
    selectedCategory === "TODOS"
      ? products
      : products.filter((p) => p.categoryId === selectedCategory);

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-red-600 text-black">
      <header className="sticky top-0 z-50 border-b border-white/20 bg-red-600/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl">
              🍕
            </div>
            <h1 className="text-lg font-bold text-white">Pizzaria KMCL</h1>
          </div>

          <Link
            href="/carrinho"
            className="rounded-xl bg-white px-4 py-2 font-bold text-red-600"
          >
            🛒 {cartCount}
          </Link>
        </div>
      </header>

      <div className="overflow-x-auto px-4 py-4">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedCategory("TODOS")}
            className={`rounded-xl px-4 py-2 ${
              selectedCategory === "TODOS"
                ? "bg-white text-red-600"
                : "bg-red-500 text-white"
            }`}
          >
            Todos
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 ${
                selectedCategory === cat.id
                  ? "bg-white text-red-600"
                  : "bg-red-500 text-white"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 px-4 pb-20">
        {filteredProducts.map((product) => {
          const quantity = getProductQuantity(product.id);

          return (
            <div
              key={product.id}
              className="flex items-center gap-4 rounded-2xl border border-red-200 bg-red-500/10 p-4"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white text-3xl">
                🍕
              </div>

              <div className="flex-1">
                <h2 className="text-lg font-bold text-black">{product.name}</h2>
                <p className="text-sm text-gray-700">{product.description}</p>
                <p className="mt-1 font-bold text-red-600">
                  R$ {Number(product.price).toFixed(2)}
                </p>
              </div>

              {quantity === 0 ? (
                <button
                  onClick={() => addToCart(product)}
                  className="rounded-xl bg-white px-4 py-2 font-bold text-red-600"
                >
                  +
                </button>
              ) : (
                <div className="flex items-center gap-2 rounded-xl bg-white px-2 py-2">
                  <button
                    onClick={() => removeFromCart(product.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 font-bold text-white"
                  >
                    -
                  </button>

                  <span className="min-w-[24px] text-center font-bold text-black">
                    {quantity}
                  </span>

                  <button
                    onClick={() => addToCart(product)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 font-bold text-white"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Link
        href="/carrinho"
        className="fixed bottom-5 right-5 rounded-full bg-white px-5 py-4 font-bold text-red-600 shadow-lg"
      >
        🛒 {cartCount}
      </Link>
    </main>
  );
}