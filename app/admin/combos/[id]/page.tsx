"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Combo = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
};

type ComboGroup = {
  id: string;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  items?: {
    id: string;
    product?: {
      id: string;
      name: string;
    };
  }[];
};

type GroupForm = {
  name: string;
  required: boolean;
  minSelect: string;
  maxSelect: string;
  sortOrder: string;
};

const initialForm: GroupForm = {
  name: "",
  required: true,
  minSelect: "1",
  maxSelect: "1",
  sortOrder: "0",
};

export default function ComboGroupsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [comboId, setComboId] = useState("");
  const [combo, setCombo] = useState<Combo | null>(null);
  const [groups, setGroups] = useState<ComboGroup[]>([]);
  const [form, setForm] = useState<GroupForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function resolveParams() {
      const resolved = await params;
      setComboId(resolved.id);
    }

    resolveParams();
  }, [params]);

  useEffect(() => {
    if (!comboId) return;
    loadCombo();
    loadGroups();
  }, [comboId]);

  async function loadCombo() {
    try {
      const res = await fetch("/api/combos", { cache: "no-store" });
      const data = await res.json().catch(() => []);
      const found = Array.isArray(data)
        ? data.find((item: Combo) => item.id === comboId)
        : null;

      setCombo(found || null);
    } catch (error) {
      console.error("Erro ao carregar combo:", error);
      setCombo(null);
    }
  }

  async function loadGroups() {
    try {
      const res = await fetch(`/api/combos/${comboId}/groups`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => []);
      setGroups(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar grupos:", error);
      setGroups([]);
    }
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Nome do grupo é obrigatório");
      return;
    }

    if (
      Number.isNaN(Number(form.minSelect)) ||
      Number.isNaN(Number(form.maxSelect))
    ) {
      alert("Mínimo ou máximo inválido");
      return;
    }

    const payload = {
      name: form.name.trim(),
      required: Boolean(form.required),
      minSelect: Number(form.minSelect),
      maxSelect: Number(form.maxSelect),
      sortOrder: Number(form.sortOrder || 0),
    };

    try {
      setSaving(true);

      const url = editingId
        ? `/api/combo-groups/${editingId}`
        : `/api/combos/${comboId}/groups`;

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
        alert(data?.details || data?.error || "Erro ao salvar grupo");
        return;
      }

      resetForm();
      await loadGroups();
      alert(editingId ? "Grupo atualizado com sucesso!" : "Grupo criado com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar grupo:", error);
      alert("Erro ao salvar grupo");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(group: ComboGroup) {
    setEditingId(group.id);
    setForm({
      name: group.name || "",
      required: Boolean(group.required),
      minSelect: String(group.minSelect ?? 1),
      maxSelect: String(group.maxSelect ?? 1),
      sortOrder: String(group.sortOrder ?? 0),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    const confirmed = confirm("Deseja excluir este grupo?");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/combo-groups/${id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.details || data?.error || "Erro ao excluir grupo");
        return;
      }

      await loadGroups();
      alert("Grupo excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir grupo:", error);
      alert("Erro ao excluir grupo");
    }
  }

  return (
    <main className="p-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Grupos do Combo</h1>
          <p className="text-gray-600">
            {combo ? `Combo: ${combo.name}` : "Carregando combo..."}
          </p>
        </div>

        <Link
          href="/admin/combos"
          className="rounded bg-gray-700 px-4 py-2 text-white"
        >
          Voltar
        </Link>
      </div>

      <div className="mb-8 rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">
          {editingId ? "Editar grupo" : "Criar grupo"}
        </h2>

        <form onSubmit={handleSubmit} className="grid gap-3">
          <input
            type="text"
            placeholder="Nome do grupo"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded border px-3 py-2"
          />

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Mínimo de seleção
              </label>
              <input
                type="number"
                placeholder="Mínimo"
                value={form.minSelect}
                onChange={(e) => setForm({ ...form, minSelect: e.target.value })}
                className="w-full rounded border px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Máximo de seleção
              </label>
              <input
                type="number"
                placeholder="Máximo"
                value={form.maxSelect}
                onChange={(e) => setForm({ ...form, maxSelect: e.target.value })}
                className="w-full rounded border px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Ordem
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
              checked={form.required}
              onChange={(e) =>
                setForm({ ...form, required: e.target.checked })
              }
            />
            Grupo obrigatório
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              {saving
                ? editingId
                  ? "Salvando..."
                  : "Criando..."
                : editingId
                ? "Salvar grupo"
                : "Criar grupo"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded bg-gray-500 px-4 py-2 text-white"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Grupos cadastrados</h2>

        {groups.length === 0 ? (
          <p className="text-gray-500">Nenhum grupo cadastrado.</p>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <div
                key={group.id}
                className="rounded border p-3"
              >
                <p className="font-semibold">{group.name}</p>
                <p className="text-sm text-gray-500">
                  Obrigatório: {group.required ? "Sim" : "Não"}
                </p>
                <p className="text-sm text-gray-500">
                  Mínimo: {group.minSelect} • Máximo: {group.maxSelect}
                </p>
                <p className="text-sm text-gray-500">
                  Ordem: {group.sortOrder}
                </p>
                <p className="text-sm text-gray-500">
                  Itens no grupo: {group.items?.length || 0}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(group)}
                    className="rounded bg-yellow-600 px-3 py-1 text-white"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(group.id)}
                    className="rounded bg-red-600 px-3 py-1 text-white"
                  >
                    Excluir
                  </button>

                  <Link
                    href={`/admin/combo-groups/${group.id}/items`}
                    className="rounded bg-blue-600 px-3 py-1 text-white"
                  >
                    Configurar itens
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}