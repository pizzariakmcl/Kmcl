"use client";

import { useEffect, useState } from "react";

type Category = {
  id: string;
  name: string;
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
  category?: {
    name: string;
  };
};

type ProductForm = {
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  categoryId: string;
  active: boolean;
  inStock: boolean;
};

const initialForm: ProductForm = {
  name: "",
  description: "",
  price: "",
  imageUrl: "",
  categoryId: "",
  active: true,
  inStock: true,
};

export default function ProdutosPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, []);

  async function loadCategories() {
    try {
      const res = await fetch("/api/categories", { cache: "no-store" });
      const data = await res.json();

      if (Array.isArray(data)) {
        setCategories(data);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error(error);
      setCategories([]);
    }
  }

  async function loadProducts() {
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      const data = await res.json();

      if (Array.isArray(data)) {
        setProducts(data);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error(error);
      setProducts([]);
    }
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  async function handleSubmit() {
    if (
      !form.name.trim() ||
      !form.description.trim() ||
      !form.price ||
      !form.categoryId
    ) {
      alert("Preencha os campos obrigatórios");
      return;
    }

    const payload = {
      ...form,
      price: Number(form.price),
    };

    const url = editingId ? `/api/products/${editingId}` : "/api/products";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Erro ao salvar produto");
      return;
    }

    resetForm();
    loadProducts();
  }

  function handleEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      imageUrl: product.imageUrl || "",
      categoryId: product.categoryId,
      active: product.active,
      inStock: product.inStock,
    });
  }

  async function handleDelete(id: string) {
    const confirmed = confirm("Deseja excluir este produto?");
    if (!confirmed) return;

    const res = await fetch(`/api/products/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Erro ao excluir produto");
      return;
    }

    loadProducts();
  }

  return (
    <main className="p-10">
      <h1 className="mb-6 text-3xl font-bold">Admin • Produtos</h1>

      <div className="mb-8 rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">
          {editingId ? "Editar produto" : "Criar produto"}
        </h2>

        <div className="grid gap-3">
          <input
            type="text"
            placeholder="Nome do produto"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded border px-3 py-2"
          />

          <textarea
            placeholder="Descrição"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            className="rounded border px-3 py-2"
          />

          <input
            type="number"
            step="0.01"
            placeholder="Preço"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="rounded border px-3 py-2"
          />

          <input
            type="text"
            placeholder="URL da imagem"
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            className="rounded border px-3 py-2"
          />

          <select
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            className="rounded border px-3 py-2"
          >
            <option value="">Selecione uma categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) =>
                setForm({ ...form, active: e.target.checked })
              }
            />
            Produto ativo
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.inStock}
              onChange={(e) =>
                setForm({ ...form, inStock: e.target.checked })
              }
            />
            Em estoque
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSubmit}
              className="rounded bg-black px-4 py-2 text-white"
            >
              {editingId ? "Salvar edição" : "Criar produto"}
            </button>

            {editingId && (
              <button
                onClick={resetForm}
                className="rounded bg-gray-500 px-4 py-2 text-white"
              >
                Cancelar edição
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Produtos cadastrados</h2>

        {products.length === 0 ? (
          <p className="text-gray-500">Nenhum produto cadastrado.</p>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex flex-col gap-3 rounded border p-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex-1">
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-sm text-gray-600">
                    {product.description}
                  </p>
                  <p className="text-sm text-gray-500">
                    Categoria: {product.category?.name || "Sem categoria"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Preço: R$ {Number(product.price).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">
                    Ativo: {product.active ? "Sim" : "Não"} • Estoque:{" "}
                    {product.inStock ? "Sim" : "Não"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleEdit(product)}
                    className="rounded bg-yellow-600 px-3 py-1 text-white"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="rounded bg-red-600 px-3 py-1 text-white"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}