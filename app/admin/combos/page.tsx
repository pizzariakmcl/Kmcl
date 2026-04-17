"use client";

import Link from "next/link";
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
};

type ComboAdditionalConfig = {
  additionalId: string;
  required: boolean;
  sortOrder: number;
  additional?: Additional;
};

type Combo = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  active: boolean;
  sortOrder: number;
  comboAdditionalConfigs?: ComboAdditionalConfig[];
};

type ComboForm = {
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  active: boolean;
  sortOrder: string;
};

const initialForm: ComboForm = {
  name: "",
  description: "",
  price: "",
  imageUrl: "",
  active: true,
  sortOrder: "0",
};

export default function AdminCombosPage() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [additionals, setAdditionals] = useState<Additional[]>([]);
  const [form, setForm] = useState<ComboForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedAdditionalConfigs, setSelectedAdditionalConfigs] = useState<
    ComboAdditionalConfig[]
  >([]);
  const [additionalSearch, setAdditionalSearch] = useState("");

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      const [combosRes, additionalsRes] = await Promise.all([
        fetch("/api/combos", { cache: "no-store" }),
        fetch("/api/additionals", { cache: "no-store" }),
      ]);

      const combosData = await combosRes.json().catch(() => []);
      const additionalsData = await additionalsRes.json().catch(() => []);

      setCombos(Array.isArray(combosData) ? combosData : []);
      setAdditionals(
        Array.isArray(additionalsData)
          ? additionalsData.filter((item) => item?.active !== false)
          : []
      );
    } catch (error) {
      console.error("Erro ao carregar combos/adicionais:", error);
      setCombos([]);
      setAdditionals([]);
    }
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
    setSelectedAdditionalConfigs([]);
    setAdditionalSearch("");
  }

  async function handleUpload(file: File) {
    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.error || "Erro no upload da imagem");
        return;
      }

      setForm((prev) => ({
        ...prev,
        imageUrl: data?.url || "",
      }));
    } catch (error) {
      console.error("Erro ao enviar imagem:", error);
      alert("Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  }

  function isAdditionalSelected(additionalId: string) {
    return selectedAdditionalConfigs.some(
      (item) => item.additionalId === additionalId
    );
  }

  function toggleAdditional(additionalId: string) {
    setSelectedAdditionalConfigs((prev) => {
      const exists = prev.some((item) => item.additionalId === additionalId);

      if (exists) {
        return prev.filter((item) => item.additionalId !== additionalId);
      }

      return [
        ...prev,
        {
          additionalId,
          required: false,
          sortOrder: prev.length,
        },
      ];
    });
  }

  function toggleAdditionalRequired(additionalId: string) {
    setSelectedAdditionalConfigs((prev) =>
      prev.map((item) =>
        item.additionalId === additionalId
          ? { ...item, required: !item.required }
          : item
      )
    );
  }

  function handleEdit(combo: Combo) {
    setEditingId(combo.id);
    setForm({
      name: combo.name || "",
      description: combo.description || "",
      price: String(combo.price ?? ""),
      imageUrl: combo.imageUrl || "",
      active: Boolean(combo.active),
      sortOrder: String(combo.sortOrder ?? 0),
    });

    setSelectedAdditionalConfigs(
      (combo.comboAdditionalConfigs || []).map((config, index) => ({
        additionalId: config.additionalId,
        required: Boolean(config.required),
        sortOrder:
          config.sortOrder !== undefined ? Number(config.sortOrder) : index,
        additional: config.additional,
      }))
    );

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    const confirmed = confirm("Deseja excluir este combo?");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/combos/${id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.details || data?.error || "Erro ao excluir combo");
        return;
      }

      await loadInitialData();
      alert("Combo excluído com sucesso!");

      if (editingId === id) {
        resetForm();
      }
    } catch (error) {
      console.error("Erro ao excluir combo:", error);
      alert("Erro ao excluir combo");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Nome do combo é obrigatório");
      return;
    }

    if (form.price === "" || Number.isNaN(Number(form.price))) {
      alert("Preço inválido");
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
        price: Number(form.price),
        imageUrl: form.imageUrl.trim() || null,
        active: Boolean(form.active),
        sortOrder: Number(form.sortOrder || 0),
        comboAdditionalConfigs: selectedAdditionalConfigs.map((item, index) => ({
          additionalId: item.additionalId,
          required: Boolean(item.required),
          sortOrder: index,
        })),
      };

      const url = editingId ? `/api/combos/${editingId}` : "/api/combos";
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
        alert(data?.details || data?.error || "Erro ao salvar combo");
        return;
      }

      resetForm();
      await loadInitialData();
      alert(
        editingId
          ? "Combo atualizado com sucesso!"
          : "Combo criado com sucesso!"
      );
    } catch (error) {
      console.error("Erro ao salvar combo:", error);
      alert("Erro ao salvar combo");
    } finally {
      setSaving(false);
    }
  }

  const filteredAdditionals = useMemo(() => {
    const term = additionalSearch.trim().toLowerCase();
    if (!term) return additionals;

    return additionals.filter((additional) => {
      const name = additional.name?.toLowerCase() || "";
      const categoriesText =
        additional.categories?.map((category) => category.name.toLowerCase()).join(" ") || "";
      const slug = additional.slug?.toLowerCase() || "";

      return (
        name.includes(term) ||
        categoriesText.includes(term) ||
        slug.includes(term)
      );
    });
  }, [additionals, additionalSearch]);

  return (
    <main className="p-10">
      <h1 className="mb-6 text-3xl font-bold">Admin • Combos</h1>

      <div className="mb-8 rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">
          {editingId ? "Editar combo" : "Criar combo"}
        </h2>

        <form onSubmit={handleSubmit} className="grid gap-3">
          <input
            type="text"
            placeholder="Nome do combo"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded border px-3 py-2"
          />

          <textarea
            placeholder="Descrição do combo"
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

          <div className="space-y-2 rounded border p-3">
            <label className="block text-sm font-medium text-gray-700">
              Imagem do combo
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleUpload(file);
                }
              }}
              className="rounded border px-3 py-2"
            />

            {uploading && (
              <p className="text-sm text-gray-500">Enviando imagem...</p>
            )}

            {form.imageUrl && (
              <div className="pt-2">
                <img
                  src={form.imageUrl}
                  alt="Preview do combo"
                  className="h-24 w-24 rounded border object-cover"
                />
              </div>
            )}
          </div>

          <input
            type="number"
            placeholder="Ordem"
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
            className="rounded border px-3 py-2"
          />

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Combo ativo
          </label>

          <div className="rounded border p-4">
            <div className="mb-3">
              <h3 className="font-semibold text-gray-900">
                Adicionais do combo
              </h3>
              <p className="text-sm text-gray-500">
                Selecione os adicionais que podem ser usados neste combo.
              </p>
            </div>

            <input
              type="text"
              placeholder="Buscar adicional"
              value={additionalSearch}
              onChange={(e) => setAdditionalSearch(e.target.value)}
              className="mb-4 w-full rounded border px-3 py-2"
            />

            {filteredAdditionals.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nenhum adicional encontrado.
              </p>
            ) : (
              <div className="space-y-3">
                {filteredAdditionals.map((additional) => {
                  const selected = isAdditionalSelected(additional.id);

                  return (
                    <div
                      key={additional.id}
                      className="rounded border p-3"
                    >
                      <label className="flex items-center gap-2 font-medium text-gray-900">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleAdditional(additional.id)}
                        />
                        {additional.name} — R$ {Number(additional.price).toFixed(2)}
                      </label>

                      <p className="mt-1 text-sm text-gray-500">
                        Categorias:{" "}
                        {additional.categories && additional.categories.length > 0
                          ? additional.categories.map((category) => category.name).join(", ")
                          : "Sem categoria"}
                      </p>

                      {additional.description && (
                        <p className="mt-1 text-sm text-gray-500">
                          {additional.description}
                        </p>
                      )}

                      {selected && (
                        <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={
                              selectedAdditionalConfigs.find(
                                (item) => item.additionalId === additional.id
                              )?.required || false
                            }
                            onChange={() =>
                              toggleAdditionalRequired(additional.id)
                            }
                          />
                          Obrigatório neste combo
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || uploading}
              className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              {saving
                ? editingId
                  ? "Salvando..."
                  : "Criando..."
                : editingId
                ? "Salvar edição"
                : "Criar combo"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="rounded bg-gray-500 px-4 py-2 text-white"
            >
              {editingId ? "Cancelar edição" : "Limpar"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Combos cadastrados</h2>

        {combos.length === 0 ? (
          <p className="text-gray-500">Nenhum combo cadastrado.</p>
        ) : (
          <div className="space-y-3">
            {combos.map((combo) => (
              <div
                key={combo.id}
                className="rounded border p-3"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded border bg-gray-50">
                    {combo.imageUrl ? (
                      <img
                        src={combo.imageUrl}
                        alt={combo.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">🍕</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="font-semibold">{combo.name}</p>

                    {combo.description && (
                      <p className="text-sm text-gray-600">{combo.description}</p>
                    )}

                    <p className="text-sm text-gray-500">
                      Preço: R$ {Number(combo.price).toFixed(2)}
                    </p>

                    <p className="text-sm text-gray-500">
                      Ativo: {combo.active ? "Sim" : "Não"}
                    </p>

                    <p className="text-sm text-gray-500">
                      Ordem: {combo.sortOrder}
                    </p>

                    {combo.comboAdditionalConfigs &&
                      combo.comboAdditionalConfigs.length > 0 && (
                        <p className="mt-1 text-sm text-gray-500">
                          Adicionais:{" "}
                          {combo.comboAdditionalConfigs
                            .map((config) =>
                              config.required
                                ? `${config.additional?.name || config.additionalId} (obrigatório)`
                                : config.additional?.name || config.additionalId
                            )
                            .join(", ")}
                        </p>
                      )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(combo)}
                        className="rounded bg-yellow-600 px-3 py-2 text-white"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(combo.id)}
                        className="rounded bg-red-600 px-3 py-2 text-white"
                      >
                        Excluir
                      </button>

                      <Link
                        href={`/admin/combos/${combo.id}`}
                        className="rounded bg-blue-600 px-3 py-2 text-white"
                      >
                        Configurar grupos
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}