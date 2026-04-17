"use client";

import { useEffect, useState } from "react";

type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  type: "NORMAL" | "PIZZA_HALF_HALF";
  selectionRequired: boolean;
  active: boolean;
  sortOrder: number;
};

type CategoryForm = {
  name: string;
  description: string;
  type: "NORMAL" | "PIZZA_HALF_HALF";
  selectionRequired: boolean;
  active: boolean;
  sortOrder: string;
};

const initialForm: CategoryForm = {
  name: "",
  description: "",
  type: "NORMAL",
  selectionRequired: false,
  active: true,
  sortOrder: "0",
};

export default function CategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CategoryForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      setLoading(true);

      const res = await fetch("/api/categories", { cache: "no-store" });
      const data = await res.json().catch(() => []);

      if (Array.isArray(data)) {
        const ordered = [...data].sort(
          (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
        );
        setCategories(ordered);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      alert("Nome da categoria é obrigatório");
      return;
    }

    if (Number.isNaN(Number(form.sortOrder))) {
      alert("Ordem inválida");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        type: form.type,
        selectionRequired: Boolean(form.selectionRequired),
        active: Boolean(form.active),
        sortOrder: Number(form.sortOrder || 0),
      };

      const url = editingId ? `/api/categories/${editingId}` : "/api/categories";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.error || "Erro ao salvar categoria");
        return;
      }

      resetForm();
      await loadCategories();

      alert(editingId ? "Categoria atualizada com sucesso!" : "Categoria criada com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar categoria:", error);
      alert("Erro ao salvar categoria");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(category: Category) {
    setEditingId(category.id);
    setForm({
      name: category.name || "",
      description: category.description || "",
      type: category.type || "NORMAL",
      selectionRequired: Boolean(category.selectionRequired),
      active: Boolean(category.active),
      sortOrder: String(category.sortOrder ?? 0),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    const confirmed = confirm("Deseja excluir esta categoria?");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.error || "Erro ao excluir categoria");
        return;
      }

      await loadCategories();
      alert("Categoria excluída com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir categoria:", error);
      alert("Erro ao excluir categoria");
    }
  }

  return (
    <main className="p-10">
      <h1 className="mb-6 text-3xl font-bold">Admin • Categorias</h1>

      <div className="mb-8 rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">
          {editingId ? "Editar categoria" : "Criar categoria"}
        </h2>

        <div className="grid gap-3">
          <input
            type="text"
            placeholder="Nome da categoria"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded border px-3 py-2"
          />

          <textarea
            placeholder="Descrição"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded border px-3 py-2"
          />

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Tipo da categoria
              </label>

              <select
                value={form.type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    type: e.target.value as "NORMAL" | "PIZZA_HALF_HALF",
                  })
                }
                className="w-full rounded border px-3 py-2"
              >
                <option value="NORMAL">Categoria normal</option>
                <option value="PIZZA_HALF_HALF">Pizza meio a meio</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Ordem no cardápio
              </label>

              <input
                type="number"
                placeholder="Ordem"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                className="w-full rounded border px-3 py-2"
              />
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.selectionRequired}
              onChange={(e) =>
                setForm({ ...form, selectionRequired: e.target.checked })
              }
            />
            Exigir seleção
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) =>
                setForm({ ...form, active: e.target.checked })
              }
            />
            Categoria ativa
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              {saving
                ? editingId
                  ? "Salvando..."
                  : "Criando..."
                : editingId
                ? "Salvar edição"
                : "Criar categoria"}
            </button>

            {editingId && (
              <button
                type="button"
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
        <h2 className="mb-4 text-xl font-semibold">Categorias cadastradas</h2>

        {loading ? (
          <p className="text-gray-500">Carregando categorias...</p>
        ) : categories.length === 0 ? (
          <p className="text-gray-500">Nenhuma categoria cadastrada.</p>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex flex-col gap-3 rounded border p-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex-1">
                  <p className="font-semibold">{category.name}</p>

                  {category.description && (
                    <p className="text-sm text-gray-600">
                      {category.description}
                    </p>
                  )}

                  <p className="text-sm text-gray-500">
                    Tipo:{" "}
                    {category.type === "PIZZA_HALF_HALF"
                      ? "Pizza meio a meio"
                      : "Normal"}
                  </p>

                  <p className="text-sm text-gray-500">
                    Exigir seleção: {category.selectionRequired ? "Sim" : "Não"}
                  </p>

                  <p className="text-sm text-gray-500">
                    Ativa: {category.active ? "Sim" : "Não"}
                  </p>

                  <p className="text-sm text-gray-500">
                    Ordem: {Number(category.sortOrder || 0)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(category)}
                    className="rounded bg-yellow-600 px-3 py-1 text-white"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(category.id)}
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