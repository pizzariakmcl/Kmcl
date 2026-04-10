"use client";

import { useEffect, useState } from "react";

type Category = {
  id: string;
  name: string;
  slug: string;
};

export default function CategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    loadCategories();
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

  async function handleCreate() {
    if (!name.trim()) {
      alert("Digite o nome da categoria");
      return;
    }

    const res = await fetch("/api/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Erro ao criar categoria");
      return;
    }

    setName("");
    loadCategories();
  }

  async function handleDelete(id: string) {
    const confirmed = confirm("Deseja excluir esta categoria?");
    if (!confirmed) return;

    const res = await fetch(`/api/categories/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Erro ao excluir categoria");
      return;
    }

    loadCategories();
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setEditingName(category.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName("");
  }

  async function saveEdit(id: string) {
    if (!editingName.trim()) {
      alert("Digite o nome da categoria");
      return;
    }

    const res = await fetch(`/api/categories/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: editingName }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Erro ao editar categoria");
      return;
    }

    cancelEdit();
    loadCategories();
  }

  return (
    <main className="p-10">
      <h1 className="mb-6 text-3xl font-bold">Admin • Categorias</h1>

      <div className="mb-8 rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-xl font-semibold">Criar categoria</h2>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nome da categoria"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />

          <button
            onClick={handleCreate}
            className="rounded bg-black px-4 py-2 text-white"
          >
            Criar
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Categorias cadastradas</h2>

        {categories.length === 0 ? (
          <p className="text-gray-500">Nenhuma categoria cadastrada.</p>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex flex-col gap-3 rounded border p-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex-1">
                  {editingId === category.id ? (
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="w-full rounded border px-3 py-2"
                    />
                  ) : (
                    <>
                      <p className="font-semibold">{category.name}</p>
                      <p className="text-sm text-gray-500">
                        slug: {category.slug}
                      </p>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {editingId === category.id ? (
                    <>
                      <button
                        onClick={() => saveEdit(category.id)}
                        className="rounded bg-blue-600 px-3 py-1 text-white"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="rounded bg-gray-500 px-3 py-1 text-white"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(category)}
                        className="rounded bg-yellow-600 px-3 py-1 text-white"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="rounded bg-red-600 px-3 py-1 text-white"
                      >
                        Excluir
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}