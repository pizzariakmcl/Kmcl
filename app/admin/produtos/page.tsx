"use client";

import { useEffect, useMemo, useState } from "react";

type Category = {
  id: string;
  name: string;
};

type Additional = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  required: boolean;
  active: boolean;
  sortOrder: number;
  categoryId: string;
};

type ProductAdditionalConfig = {
  additionalId: string;
  required: boolean;
  sortOrder: number;
};

type CategoryPrice = {
  categoryId: string;
  customPrice: string;
};

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string | null;
  active: boolean;
  inStock: boolean;
  categories?: {
    categoryId: string;
    sortOrder: number;
    customPrice?: number | null;
    category: {
      id: string;
      name: string;
    };
  }[];
  productAdditionalConfigs?: {
    additionalId: string;
    required: boolean;
    sortOrder: number;
    additional: Additional;
  }[];
};

type ProductForm = {
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  categoryIds: string[];
  active: boolean;
  inStock: boolean;
};

const initialForm: ProductForm = {
  name: "",
  description: "",
  price: "",
  imageUrl: "",
  categoryIds: [],
  active: true,
  inStock: true,
};

export default function ProdutosPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [additionals, setAdditionals] = useState<Additional[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedConfigs, setSelectedConfigs] = useState<ProductAdditionalConfig[]>([]);
  const [categoryPrices, setCategoryPrices] = useState<CategoryPrice[]>([]);

  const primaryCategoryId = form.categoryIds[0] || "";

  useEffect(() => {
    loadCategories();
    loadAdditionals();
    loadProducts();
  }, []);

  async function loadCategories() {
    try {
      const res = await fetch("/api/categories", { cache: "no-store" });
      const data = await res.json().catch(() => []);
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
      setCategories([]);
    }
  }

  async function loadAdditionals() {
    try {
      const res = await fetch("/api/additionals", { cache: "no-store" });
      const data = await res.json().catch(() => []);
      setAdditionals(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar adicionais:", error);
      setAdditionals([]);
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

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
    setSelectedConfigs([]);
    setCategoryPrices([]);
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

  const categoryAdditionals = useMemo(() => {
    return additionals
      .filter(
        (additional) =>
          additional.categoryId === primaryCategoryId && additional.active
      )
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
  }, [additionals, primaryCategoryId]);

  function isSelectedAdditional(additionalId: string) {
    return selectedConfigs.some((item) => item.additionalId === additionalId);
  }

  function toggleProductAdditional(additionalId: string) {
    setSelectedConfigs((prev) => {
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

  function toggleProductAdditionalRequired(additionalId: string) {
    setSelectedConfigs((prev) =>
      prev.map((item) =>
        item.additionalId === additionalId
          ? { ...item, required: !item.required }
          : item
      )
    );
  }

  function handleCategoryToggle(categoryId: string) {
    setForm((prev) => {
      const exists = prev.categoryIds.includes(categoryId);

      const nextCategoryIds = exists
        ? prev.categoryIds.filter((id) => id !== categoryId)
        : [...prev.categoryIds, categoryId];

      return {
        ...prev,
        categoryIds: nextCategoryIds,
      };
    });

    setCategoryPrices((prev) => {
      const exists = prev.some((item) => item.categoryId === categoryId);

      if (exists) {
        return prev.filter((item) => item.categoryId !== categoryId);
      }

      return [...prev, { categoryId, customPrice: "" }];
    });
  }

  function getCategoryCustomPrice(categoryId: string) {
    return categoryPrices.find((item) => item.categoryId === categoryId)?.customPrice || "";
  }

  function setCategoryCustomPrice(categoryId: string, value: string) {
    setCategoryPrices((prev) => {
      const exists = prev.some((item) => item.categoryId === categoryId);

      if (!exists) {
        return [...prev, { categoryId, customPrice: value }];
      }

      return prev.map((item) =>
        item.categoryId === categoryId ? { ...item, customPrice: value } : item
      );
    });
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.description.trim() || !form.price || !form.categoryIds.length) {
      alert("Preencha os campos obrigatórios");
      return;
    }

    if (Number.isNaN(Number(form.price)) || Number(form.price) < 0) {
      alert("Preço base inválido");
      return;
    }

    for (const item of categoryPrices) {
      if (!form.categoryIds.includes(item.categoryId)) continue;
      if (item.customPrice.trim() === "") continue;

      const parsed = Number(item.customPrice);
      if (Number.isNaN(parsed) || parsed < 0) {
        alert("Um dos preços por categoria está inválido");
        return;
      }
    }

    try {
      setSaving(true);

      const payload = {
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        imageUrl: form.imageUrl.trim() || null,
        categoryIds: form.categoryIds,
        categoryPrices: form.categoryIds.map((categoryId) => ({
  categoryId,
  customPrice: getCategoryCustomPrice(categoryId),
})),
        productAdditionalConfigs: selectedConfigs.map((item, index) => ({
          additionalId: item.additionalId,
          required: item.required,
          sortOrder: index,
        })),
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

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.error || "Erro ao salvar produto");
        return;
      }

      resetForm();
      await loadProducts();

      alert(editingId ? "Produto atualizado com sucesso!" : "Produto criado com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      alert("Erro ao salvar produto");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(product: Product) {
    setEditingId(product.id);

    const productCategoryIds = (product.categories || []).map((item) => item.categoryId);

    setForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      imageUrl: product.imageUrl || "",
      categoryIds: productCategoryIds,
      active: product.active,
      inStock: product.inStock,
    });

    setCategoryPrices(
      (product.categories || []).map((item) => ({
        categoryId: item.categoryId,
        customPrice:
          item.customPrice !== undefined && item.customPrice !== null
            ? String(item.customPrice)
            : "",
      }))
    );

    setSelectedConfigs(
      (product.productAdditionalConfigs || []).map((config, index) => ({
        additionalId: config.additionalId,
        required: Boolean(config.required),
        sortOrder:
          config.sortOrder !== undefined ? Number(config.sortOrder) : index,
      }))
    );

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    const confirmed = confirm("Deseja excluir este produto?");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.error || "Erro ao excluir produto");
        return;
      }

      await loadProducts();
      alert("Produto excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
      alert("Erro ao excluir produto");
    }
  }

  return (
    <main className="p-4 text-black md:p-10">
      <h1 className="mb-6 text-2xl font-bold md:text-3xl">Admin • Produtos</h1>

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
            className="rounded border px-3 py-2 text-black"
          />

          <textarea
            placeholder="Descrição"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded border px-3 py-2 text-black"
          />

          <input
            type="number"
            step="0.01"
            placeholder="Preço base do produto"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="rounded border px-3 py-2 text-black"
          />

          <div className="space-y-2 rounded border p-3">
            <label className="block text-sm font-medium text-black">
              Imagem do produto
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
                  alt="Preview do produto"
                  className="h-24 w-24 rounded border object-cover"
                />
              </div>
            )}
          </div>

          <div className="rounded border p-3">
            <p className="mb-3 font-medium text-black">Categorias do produto</p>

            <div className="space-y-3">
              {categories.map((category) => {
                const checked = form.categoryIds.includes(category.id);

                return (
                  <div key={category.id} className="rounded border p-3">
                    <label className="mb-2 flex items-center gap-2 font-medium text-black">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleCategoryToggle(category.id)}
                      />
                      {category.name}
                    </label>

                    {checked && (
                      <div className="mt-2">
                        <label className="mb-1 block text-sm text-gray-700">
                          Preço nesta categoria
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Deixe vazio para usar o preço base"
                          value={getCategoryCustomPrice(category.id)}
                          onChange={(e) =>
                            setCategoryCustomPrice(category.id, e.target.value)
                          }
                          className="w-full rounded border px-3 py-2 text-black"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Se não preencher, o sistema usa o preço base do produto.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Agora o mesmo produto pode ter preços diferentes por categoria.
            </p>
          </div>

          <div className="rounded border p-3">
            <p className="mb-3 font-medium text-black">
              Adicionais do produto
            </p>

            {primaryCategoryId ? (
              categoryAdditionals.length > 0 ? (
                <div className="space-y-3">
                  {categoryAdditionals.map((additional) => {
                    const selected = isSelectedAdditional(additional.id);

                    return (
                      <div
                        key={additional.id}
                        className="rounded border p-3"
                      >
                        <label className="flex items-center gap-2 font-medium text-black">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleProductAdditional(additional.id)}
                          />
                          {additional.name} — R$ {Number(additional.price).toFixed(2)}
                        </label>

                        {additional.description && (
                          <p className="mt-1 text-sm text-gray-500">
                            {additional.description}
                          </p>
                        )}

                        <p className="mt-1 text-xs text-gray-500">
                          Padrão da categoria:{" "}
                          {additional.required ? "Obrigatório" : "Opcional"}
                        </p>

                        {selected && (
                          <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={
                                selectedConfigs.find(
                                  (item) => item.additionalId === additional.id
                                )?.required || false
                              }
                              onChange={() =>
                                toggleProductAdditionalRequired(additional.id)
                              }
                            />
                            Obrigatório neste produto
                          </label>
                        )}
                      </div>
                    );
                  })}

                  <p className="text-xs text-gray-500">
                    Os adicionais estão sendo carregados pela primeira categoria selecionada.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Essa categoria não possui adicionais cadastrados.
                </p>
              )
            ) : (
              <p className="text-sm text-gray-500">
                Selecione pelo menos uma categoria para configurar os adicionais do produto.
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 text-black">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) =>
                setForm({ ...form, active: e.target.checked })
              }
            />
            Produto ativo
          </label>

          <label className="flex items-center gap-2 text-black">
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
              type="button"
              onClick={handleSubmit}
              disabled={saving || uploading}
              className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              {saving
                ? editingId
                  ? "Salvando..."
                  : "Criando..."
                : editingId
                ? "Salvar edição"
                : "Criar produto"}
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
                <div className="flex items-start gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded border bg-gray-50">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">🍕</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="font-semibold text-black">{product.name}</p>
                    <p className="text-sm text-gray-600">
                      {product.description}
                    </p>
                    <p className="text-sm text-gray-500">
                      Categorias:{" "}
                      {product.categories && product.categories.length > 0
                        ? product.categories
                            .map((item) => {
                              const custom =
                                item.customPrice !== undefined && item.customPrice !== null
                                  ? ` (R$ ${Number(item.customPrice).toFixed(2)})`
                                  : "";
                              return `${item.category.name}${custom}`;
                            })
                            .join(", ")
                        : "Sem categoria"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Preço base: R$ {Number(product.price).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Ativo: {product.active ? "Sim" : "Não"} • Estoque:{" "}
                      {product.inStock ? "Sim" : "Não"}
                    </p>

                    {product.productAdditionalConfigs &&
                      product.productAdditionalConfigs.length > 0 && (
                        <p className="mt-1 text-sm text-gray-500">
                          Adicionais do produto:{" "}
                          {product.productAdditionalConfigs
                            .map((config) =>
                              config.required
                                ? `${config.additional.name} (obrigatório)`
                                : config.additional.name
                            )
                            .join(", ")}
                        </p>
                      )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(product)}
                    className="rounded bg-yellow-600 px-3 py-1 text-white"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
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