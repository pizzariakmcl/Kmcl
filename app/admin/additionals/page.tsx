"use client";

import { useEffect, useMemo, useState } from "react";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Additional = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  required: boolean;
  active: boolean;
  sortOrder: number;
  categoryIds?: string[];
  categories?: Category[];
  category?: Category | null;
  categoryId?: string;
};

type AdditionalForm = {
  name: string;
  description: string;
  price: string;
  categoryIds: string[];
  required: boolean;
  active: boolean;
  sortOrder: string;
};

const initialForm: AdditionalForm = {
  name: "",
  description: "",
  price: "",
  categoryIds: [],
  required: false,
  active: true,
  sortOrder: "0",
};

export default function AdminAdditionalsPage() {
  const [additionals, setAdditionals] = useState<Additional[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<AdditionalForm>(initialForm);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      setLoading(true);

      const [additionalsRes, categoriesRes] = await Promise.all([
        fetch("/api/additionals", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
      ]);

      const additionalsData = await additionalsRes.json().catch(() => []);
      const categoriesData = await categoriesRes.json().catch(() => []);

      setAdditionals(Array.isArray(additionalsData) ? additionalsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      alert("Erro ao carregar adicionais e categorias");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function handleChange(
    field: keyof AdditionalForm,
    value: string | boolean | string[]
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function toggleCategory(categoryId: string) {
    setForm((prev) => {
      const currentCategoryIds = Array.isArray(prev.categoryIds)
        ? prev.categoryIds
        : [];

      const exists = currentCategoryIds.includes(categoryId);

      return {
        ...prev,
        categoryIds: exists
          ? currentCategoryIds.filter((id) => id !== categoryId)
          : [...currentCategoryIds, categoryId],
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Nome do adicional é obrigatório");
      return;
    }

    if (!Array.isArray(form.categoryIds) || form.categoryIds.length === 0) {
      alert("Selecione pelo menos uma categoria");
      return;
    }

    if (form.price === "" || Number.isNaN(Number(form.price))) {
      alert("Preço inválido");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        categoryIds: form.categoryIds,
        required: Boolean(form.required),
        active: Boolean(form.active),
        sortOrder: Number(form.sortOrder || 0),
      };

      const url = editingId
        ? `/api/additionals/${editingId}`
        : "/api/additionals";

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
        alert(data?.details || data?.error || "Erro ao salvar adicional");
        return;
      }

      await loadInitialData();
      resetForm();

      alert(
        editingId
          ? "Adicional atualizado com sucesso!"
          : "Adicional criado com sucesso!"
      );
    } catch (error) {
      console.error("Erro ao salvar adicional:", error);
      alert(error instanceof Error ? error.message : "Erro ao salvar adicional");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(additional: Additional) {
    const normalizedCategoryIds =
      Array.isArray(additional.categoryIds) && additional.categoryIds.length > 0
        ? additional.categoryIds
        : additional.categoryId
        ? [additional.categoryId]
        : [];

    setEditingId(additional.id);
    setForm({
      name: additional.name || "",
      description: additional.description || "",
      price: String(additional.price ?? ""),
      categoryIds: normalizedCategoryIds,
      required: Boolean(additional.required),
      active: Boolean(additional.active),
      sortOrder: String(additional.sortOrder ?? 0),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    const confirmed = confirm("Tem certeza que deseja excluir este adicional?");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/additionals/${id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.error || "Erro ao excluir adicional");
        return;
      }

      await loadInitialData();
      alert("Adicional excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir adicional:", error);
      alert("Erro ao excluir adicional");
    }
  }

  const filteredAdditionals = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return additionals;

    return additionals.filter((additional) => {
      const name = additional.name?.toLowerCase() || "";
      const categoriesText =
        additional.categories
          ?.map((category) => category.name.toLowerCase())
          .join(" ") || "";
      const slug = additional.slug?.toLowerCase() || "";

      return (
        name.includes(term) ||
        categoriesText.includes(term) ||
        slug.includes(term)
      );
    });
  }, [additionals, search]);

  const safeCategoryIds = Array.isArray(form.categoryIds) ? form.categoryIds : [];

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Admin • Adicionais
          </h1>
          <p className="text-gray-600">
            Crie, edite e organize os adicionais dos produtos.
          </p>
        </div>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-gray-900">
            {editingId ? "Editar adicional" : "Criar adicional"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Nome do adicional"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full rounded border px-4 py-3 outline-none"
            />

            <textarea
              placeholder="Descrição"
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={3}
              className="w-full rounded border px-4 py-3 outline-none"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="number"
                step="0.01"
                placeholder="Preço"
                value={form.price}
                onChange={(e) => handleChange("price", e.target.value)}
                className="w-full rounded border px-4 py-3 outline-none"
              />

              <input
                type="number"
                placeholder="Ordem"
                value={form.sortOrder}
                onChange={(e) => handleChange("sortOrder", e.target.value)}
                className="w-full rounded border px-4 py-3 outline-none"
              />
            </div>

            <div className="rounded-xl border p-4">
              <p className="mb-3 font-semibold text-gray-900">
                Categorias do adicional
              </p>

              <div className="grid gap-2 md:grid-cols-2">
                {categories.map((category) => {
                  const checked = safeCategoryIds.includes(category.id);

                  return (
                    <label
                      key={category.id}
                      className="flex items-center gap-2 rounded border px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCategory(category.id)}
                      />
                      <span>{category.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={form.required}
                  onChange={(e) => handleChange("required", e.target.checked)}
                />
                Obrigatório
              </label>

              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => handleChange("active", e.target.checked)}
                />
                Ativo
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded bg-black px-5 py-3 font-semibold text-white disabled:opacity-50"
              >
                {saving
                  ? editingId
                    ? "Salvando..."
                    : "Criando..."
                  : editingId
                  ? "Salvar alterações"
                  : "Criar adicional"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded border px-5 py-3 font-semibold"
                >
                  Cancelar edição
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              Adicionais cadastrados
            </h2>

            <input
              type="text"
              placeholder="Buscar adicional"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded border px-4 py-3 outline-none md:max-w-sm"
            />
          </div>

          {loading ? (
            <div className="rounded border border-dashed p-6 text-sm text-gray-500">
              Carregando adicionais...
            </div>
          ) : filteredAdditionals.length === 0 ? (
            <div className="rounded border border-dashed p-6 text-sm text-gray-500">
              Nenhum adicional encontrado.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAdditionals.map((additional) => (
                <div
                  key={additional.id}
                  className="rounded-xl border p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {additional.name}
                      </h3>

                      <p className="text-sm text-gray-600">
                        Categorias:{" "}
                        {additional.categories && additional.categories.length > 0
                          ? additional.categories.map((category) => category.name).join(", ")
                          : "Sem categoria"}
                      </p>

                      <p className="text-sm text-gray-600">
                        Preço: R$ {Number(additional.price).toFixed(2)}
                      </p>

                      <p className="text-sm text-gray-600">
                        Ativo: {additional.active ? "Sim" : "Não"} • Obrigatório:{" "}
                        {additional.required ? "Sim" : "Não"}
                      </p>

                      <p className="text-sm text-gray-600">
                        Ordem: {additional.sortOrder}
                      </p>

                      {additional.description && (
                        <p className="mt-2 text-sm text-gray-700">
                          {additional.description}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(additional)}
                        className="rounded bg-yellow-500 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(additional.id)}
                        className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}