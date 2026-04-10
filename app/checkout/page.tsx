"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [observacao, setObservacao] = useState("");
  const [loading, setLoading] = useState(false);

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

  const totalPrice = cart.reduce(
    (acc, item) => acc + Number(item.price) * Number(item.quantity),
    0
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (cart.length === 0) {
      alert("Seu carrinho está vazio");
      return;
    }

    if (
      !nome.trim() ||
      !whatsapp.trim() ||
      !cep.trim() ||
      !endereco.trim() ||
      !numero.trim() ||
      !bairro.trim() ||
      !cidade.trim()
    ) {
      alert("Preencha os campos obrigatórios");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer: {
            nome,
            whatsapp,
            cep,
            endereco,
            numero,
            complemento,
            bairro,
            cidade,
          },
          items: cart,
          totalAmount: totalPrice,
          paymentMethod,
          observacao,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Erro ao finalizar pedido");
        return;
      }

      alert(`Pedido enviado com sucesso! Nº ${data.orderNumber || ""}`);
      localStorage.removeItem("cart");
      window.location.href = "/";
    } catch (error) {
      console.error(error);
      alert("Erro ao finalizar pedido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-red-50 text-black">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-600">
              Finalização
            </p>
            <h1 className="text-3xl font-black">Checkout</h1>
          </div>

          <Link
            href="/carrinho"
            className="rounded-xl border border-red-200 bg-white px-4 py-2 font-bold text-red-600"
          >
            ← Voltar ao carrinho
          </Link>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-red-100 bg-white p-5 shadow-sm"
          >
            <h2 className="mb-5 text-xl font-black">Dados do cliente</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="text"
                placeholder="Nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="rounded-2xl border border-red-100 px-4 py-3 outline-none focus:border-red-400 md:col-span-2"
              />

              <input
                type="text"
                placeholder="WhatsApp"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="rounded-2xl border border-red-100 px-4 py-3 outline-none focus:border-red-400"
              />

              <input
                type="text"
                placeholder="CEP"
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                className="rounded-2xl border border-red-100 px-4 py-3 outline-none focus:border-red-400"
              />

              <input
                type="text"
                placeholder="Endereço"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                className="rounded-2xl border border-red-100 px-4 py-3 outline-none focus:border-red-400 md:col-span-2"
              />

              <input
                type="text"
                placeholder="Número"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="rounded-2xl border border-red-100 px-4 py-3 outline-none focus:border-red-400"
              />

              <input
                type="text"
                placeholder="Complemento"
                value={complemento}
                onChange={(e) => setComplemento(e.target.value)}
                className="rounded-2xl border border-red-100 px-4 py-3 outline-none focus:border-red-400"
              />

              <input
                type="text"
                placeholder="Bairro"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                className="rounded-2xl border border-red-100 px-4 py-3 outline-none focus:border-red-400"
              />

              <input
                type="text"
                placeholder="Cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                className="rounded-2xl border border-red-100 px-4 py-3 outline-none focus:border-red-400"
              />

              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="rounded-2xl border border-red-100 px-4 py-3 outline-none focus:border-red-400 md:col-span-2"
              >
                <option value="PIX">Pix</option>
                <option value="DINHEIRO">Dinheiro</option>
                <option value="CARTAO">Cartão</option>
              </select>

              <textarea
                placeholder="Observação do pedido"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                className="min-h-[120px] rounded-2xl border border-red-100 px-4 py-3 outline-none focus:border-red-400 md:col-span-2"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-2xl bg-red-600 px-4 py-4 font-bold text-white disabled:opacity-60"
            >
              {loading ? "Enviando pedido..." : "Finalizar pedido"}
            </button>
          </form>

          <aside className="sticky top-4 h-fit rounded-3xl border border-red-100 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black">Resumo do pedido</h2>

            <div className="mt-4 space-y-3">
              {cart.length === 0 ? (
                <p className="text-gray-500">Seu carrinho está vazio.</p>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-red-50 px-4 py-3"
                  >
                    <div>
                      <p className="font-bold">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        {item.quantity}x • R$ {Number(item.price).toFixed(2)}
                      </p>
                    </div>

                    <strong className="text-red-600">
                      R$ {(Number(item.price) * Number(item.quantity)).toFixed(2)}
                    </strong>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 border-t border-red-100 pt-4">
              <div className="flex items-center justify-between text-lg">
                <span className="font-medium">Total</span>
                <strong className="text-2xl text-red-600">
                  R$ {totalPrice.toFixed(2)}
                </strong>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}