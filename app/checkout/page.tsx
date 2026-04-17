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

type PaymentMethod = "PIX" | "DINHEIRO" | "DEBITO" | "CREDITO";

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);

  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [customerCep, setCustomerCep] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [customerComplement, setCustomerComplement] = useState("");
  const [customerNeighborhood, setCustomerNeighborhood] = useState("");
  const [customerCity, setCustomerCity] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PIX");
  const [changeFor, setChangeFor] = useState("");
  const [observation, setObservation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const subtotal = useMemo(() => {
    return cart.reduce(
      (acc, item) => acc + Number(item.price) * Number(item.quantity),
      0
    );
  }, [cart]);

  const deliveryFee = 0;
  const total = subtotal + deliveryFee;

  async function handleFinishOrder() {
    if (cart.length === 0) {
      alert("Seu carrinho está vazio.");
      return;
    }

    if (!customerName.trim()) {
      alert("Nome do cliente é obrigatório");
      return;
    }

    if (!customerWhatsapp.trim()) {
      alert("WhatsApp é obrigatório");
      return;
    }

    if (!customerCep.trim()) {
      alert("CEP é obrigatório");
      return;
    }

    if (!customerAddress.trim()) {
      alert("Endereço é obrigatório");
      return;
    }

    if (!customerNumber.trim()) {
      alert("Número é obrigatório");
      return;
    }

    if (!customerNeighborhood.trim()) {
      alert("Bairro é obrigatório");
      return;
    }

    if (!customerCity.trim()) {
      alert("Cidade é obrigatória");
      return;
    }

    let parsedChangeFor: string | null = null;

    if (paymentMethod === "DINHEIRO" && changeFor.trim()) {
      const troco = Number(changeFor.replace(",", "."));

      if (Number.isNaN(troco) || troco < total) {
        alert("O troco precisa ser maior ou igual ao valor total.");
        return;
      }

      parsedChangeFor = troco.toFixed(2);
    }

    try {
      setIsSubmitting(true);

      const payload = {
        customer: {
          name: customerName.trim(),
          whatsapp: customerWhatsapp.trim(),
          cep: customerCep.trim(),
          address: customerAddress.trim(),
          number: customerNumber.trim(),
          complement: customerComplement.trim() || null,
          neighborhood: customerNeighborhood.trim(),
          city: customerCity.trim(),
        },
        paymentMethod,
        changeFor: parsedChangeFor,
        observation: observation.trim() || null,
        totalAmount: Number(total.toFixed(2)),
        items: cart.map((item) => ({
          productId: item.productId || null,
          comboId: item.comboId || null,
          name: item.name || "Produto",
          price: Number(item.price || 0),
          quantity: Number(item.quantity || 1),
          isHalfHalf: !!item.isHalfHalf,
          isCombo: !!item.isCombo,
          flavorIds: item.flavorIds || [],
          flavorNames: item.flavorNames || [],
          comboSelectionsSummary: item.comboSelectionsSummary || [],
          additionalIds: item.additionalIds || [],
          additionalNames: item.additionalNames || [],
        })),
      };

      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        console.error("Erro API /api/orders/create:", data);
        alert(data?.error || "Erro ao criar pedido");
        return;
      }

      localStorage.removeItem("cart");
      alert("Pedido enviado com sucesso!");
      window.location.href = "/";
    } catch (error) {
      console.error("Erro ao finalizar pedido:", error);
      alert("Erro ao finalizar pedido");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-red-100 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-red-500">
              Finalização
            </p>

            <h2 className="mt-2 text-2xl font-bold text-gray-900 leading-tight">
              Revise seus dados e finalize seu pedido com segurança
            </h2>

            <p className="mt-2 text-base text-gray-600">
              Preencha todos os dados abaixo para concluir seu pedido
            </p>
          </div>

          <Link
            href="/carrinho"
            className="rounded-xl border border-red-200 bg-white px-4 py-2 font-semibold text-red-600 shadow-sm"
          >
            ← Voltar ao carrinho
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-red-100 bg-white p-6 shadow-sm">
              <h2 className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-black placeholder-gray-400>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-black placeholder-gray-400"
                />

                <input
                  type="text"
                  placeholder="WhatsApp"
                  value={customerWhatsapp}
                  onChange={(e) => setCustomerWhatsapp(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-black placeholder-gray-400"
                />

                <input
                  type="text"
                  placeholder="CEP"
                  value={customerCep}
                  onChange={(e) => setCustomerCep(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-black placeholder-gray-400"
                />

                <input
                  type="text"
                  placeholder="Endereço"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-black placeholder-gray-400"
                />

                <input
                  type="text"
                  placeholder="Número"
                  value={customerNumber}
                  onChange={(e) => setCustomerNumber(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-black placeholder-gray-400"
                />

                <input
                  type="text"
                  placeholder="Complemento"
                  value={customerComplement}
                  onChange={(e) => setCustomerComplement(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-black placeholder-gray-400"
                />

                <input
                  type="text"
                  placeholder="Bairro"
                  value={customerNeighborhood}
                  onChange={(e) => setCustomerNeighborhood(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-black placeholder-gray-400"
                />

                <input
                  type="text"
                  placeholder="Cidade"
                  value={customerCity}
                  onChange={(e) => setCustomerCity(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-black placeholder-gray-400"
                />
              </div>

              <div className="mt-4">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-black placeholder-gray-400"
                >
                  <option value="PIX">Pix</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="DEBITO">Cartão de débito</option>
                  <option value="CREDITO">Cartão de crédito</option>
                </select>
              </div>

              {paymentMethod === "DINHEIRO" && (
                <div className="mt-4">
                  <input
                    type="text"
                    placeholder="Troco para quanto?"
                    value={changeFor}
                    onChange={(e) => setChangeFor(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-black placeholder-gray-400"
                  />
                </div>
              )}

              <div className="mt-4">
                <textarea
                  placeholder="Observação do pedido"
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-black placeholder-gray-400"
                />
              </div>

              <button
                onClick={handleFinishOrder}
                disabled={isSubmitting || cart.length === 0}
                className="mt-6 w-full rounded-xl bg-red-600 px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Enviando pedido..." : "Finalizar pedido"}
              </button>
            </div>
          </section>

          <aside className="h-fit rounded-3xl border border-red-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">Resumo do pedido</h2>

            <div className="mt-4 space-y-4">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-red-100 bg-red-50 p-4"
                >
                  <p className="font-bold text-gray-900">
                    {item.isCombo
                      ? item.name
                      : item.isHalfHalf
                      ? "Meio a Meio: " + (item.flavorNames?.join(" + ") || item.name)
                      : item.name}
                  </p>

                  {item.isCombo &&
                    item.comboSelectionsSummary &&
                    item.comboSelectionsSummary.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {item.comboSelectionsSummary.map((line, index) => (
                          <p
                            key={`${item.id}-summary-${index}`}
                            className="text-sm text-gray-600"
                          >
                            {line}
                          </p>
                        ))}
                      </div>
                    )}

                  {item.additionalNames && item.additionalNames.length > 0 && (
                    <p className="mt-1 text-sm text-gray-600">
                      Adicionais: {item.additionalNames.join(", ")}
                    </p>
                  )}

                  <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
                    <span>
                      {item.quantity} x R$ {Number(item.price).toFixed(2)}
                    </span>
                    <span>
                      R$ {(Number(item.price) * Number(item.quantity)).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t pt-4 space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-700">
                <span>Subtotal</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-700">
                <span>Entrega</span>
                <span>R$ {deliveryFee.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-lg font-bold text-gray-900">
                <span>Total</span>
                <span className="text-red-600">R$ {total.toFixed(2)}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}