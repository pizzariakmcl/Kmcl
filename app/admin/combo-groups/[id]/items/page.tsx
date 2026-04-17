"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  category?: {
    name: string;
  };
  price: number;
  active: boolean;
  inStock: boolean;
};

type Group = {
  id: string;
  name: string;
  comboId: string;
};

type GroupItem = {
  id: string;
  productId: string;
  sortOrder: number;
  product?: Product;
};

export default function ComboGroupItemsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [groupId, setGroupId] = useState("");
  const [group, setGroup] = useState<Group | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function resolveParams() {
      const resolved = await params;
      setGroupId(resolved.id);
    }

    resolveParams();
  }, [params]);

  useEffect(() => {
    if (!groupId) return;
    loadGroup();
    loadProducts();
    loadItems();
  }, [groupId]);

  async function loadGroup() {
    try {
      const res = await fetch(`/api/combo-groups/${groupId}`, {
        cache: "no-store",
      });

      if (!res.ok) return;

      const data = await res.json().catch(() => null);
      setGroup(data);
    } catch (error) {
      console.error("Erro ao carregar grupo:", error);
      setGroup(null);
    }
  }

  async function loadProducts() {
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      const data = await res.json().catch(() => []);
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      setProducts([]);
    }
  }

  async function loadItems() {
    try {
      const res = await fetch(`/api/combo-groups/${groupId}/items`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => []);
      const items = Array.isArray(data) ? data : [];

      setSelectedProductIds(items.map((item: GroupItem) => item.productId));
    } catch (error) {
      console.error("Erro ao carregar itens:", error);
      setSelectedProductIds([]);
    }
  }

  function toggleProduct(productId: string) {
    setSelectedProductIds((prev) => {
      const exists = prev.includes(productId);

      if (exists) {
        return prev.filter((id) => id !== productId);
      }

      return [...prev, productId];
    });
  }

  const availableProducts = useMemo(() => {
    return products.filter((product) => product.active && product.inStock);
  }, [products]);

  async function handleSave() {
    try {
      setSaving(true);

      const payload = {
        items: selectedProductIds.map((productId, index) => ({
          productId,
          sortOrder: index,
        })),
      };

      const res = await fetch(`/api/combo-groups/${groupId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.details || data?.error || "Erro ao salvar itens");
        return;
      }

      alert("Itens do grupo salvos com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar itens:", error);
      alert("Erro ao salvar itens");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="p-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Itens do Grupo</h1>
          <p className="text-gray-600">
            {group ? `Grupo: ${group.name}` : "Carregando grupo..."}
          </p>
        </div>

        <Link
          href={group ? `/admin/combos/${group.comboId}` : "/admin/combos"}
          className="rounded bg-gray-700 px-4 py-2 text-white"
        >
          Voltar
        </Link>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Produtos disponíveis</h2>

        {availableProducts.length === 0 ? (
          <p className="text-gray-500">Nenhum produto disponível.</p>
        ) : (
          <div className="space-y-3">
            {availableProducts.map((product) => {
              const selected = selectedProductIds.includes(product.id);

              return (
                <label
                  key={product.id}
                  className="flex items-center gap-3 rounded border p-3"
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleProduct(product.id)}
                  />

                  <div>
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-sm text-gray-500">
                      Categoria: {product.category?.name || "Sem categoria"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Preço: R$ {Number(product.price).toFixed(2)}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <div className="mt-6">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar itens do grupo"}
          </button>
        </div>
      </div>
    </main>
  );
}