"use client";

import { useEffect, useMemo, useState } from "react";

type Additional = {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  price: number;
  required: boolean;
  active: boolean;
  sortOrder: number;
};

type ProductAdditionalConfig = {
  additionalId: string;
  required: boolean;
  sortOrder: number;
  additional: Additional;
};

type Product = {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  active: boolean;
  inStock: boolean;
  productAdditionalConfigs?: ProductAdditionalConfig[];
};

type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  type?: string | null;
  selectionRequired?: boolean;
  active?: boolean;
  additionals?: Additional[];
  products: Product[];
};

type Combo = {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  active: boolean;
  sortOrder: number;
};

type Customer = {
  id: string;
  name: string;
  cpf?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  cep?: string | null;
  address?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
};

type CartItem = {
  id: string;
  type: "PRODUCT" | "COMBO" | "HALF_HALF";
  refId: string;
  productId?: string | null;
  comboId?: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
  notes?: string;
  additionalIds?: string[];
  additionalNames?: string[];
  flavorIds?: string[];
  flavorNames?: string[];
};

type SelectedTarget =
  | {
      type: "PRODUCT";
      product: Product;
      category: Category | null;
    }
  | {
      type: "HALF_HALF";
      category: Category;
      flavorIds: string[];
      flavorNames: string[];
      basePrice: number;
      name: string;
      productId: string;
    };

function toBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export default function PDVPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const [customerSearch, setCustomerSearch] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [customerForm, setCustomerForm] = useState({
    name: "",
    cpf: "",
    whatsapp: "",
    email: "",
    cep: "",
    address: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
  });

  const [orderType, setOrderType] = useState<"DELIVERY" | "PICKUP" | "DINE_IN">(
    "DELIVERY"
  );
  const [paymentMethod, setPaymentMethod] = useState<
    "PIX" | "DINHEIRO" | "DEBITO" | "CREDITO"
  >("PIX");
  const [observation, setObservation] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [changeFor, setChangeFor] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  const [selectedFlavors, setSelectedFlavors] = useState<Product[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<SelectedTarget | null>(null);
  const [selectedAdditionals, setSelectedAdditionals] = useState<Additional[]>([]);

  const [loadingSearch, setLoadingSearch] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchCustomers();
    }, 300);

    return () => clearTimeout(timer);
  }, [customerSearch]);

  async function loadData() {
    try {
      const [menuRes, combosRes] = await Promise.all([
        fetch("/api/menu"),
        fetch("/api/combos"),
      ]);

      const [menuData, combosData] = await Promise.all([
        menuRes.json().catch(() => []),
        combosRes.json().catch(() => []),
      ]);

      const safeCategories = Array.isArray(menuData) ? menuData : [];
      const safeCombos = Array.isArray(combosData)
        ? combosData.filter((combo) => combo?.active !== false)
        : [];

      setCategories(safeCategories);
      setCombos(safeCombos);

      const firstCategory = safeCategories.find((category) => category.active !== false);
      if (firstCategory) {
        setSelectedCategoryId(firstCategory.id);
      }
    } catch (error) {
      console.error("Erro ao carregar PDV:", error);
      setCategories([]);
      setCombos([]);
    }
  }

  async function searchCustomers() {
    const q = customerSearch.trim();

    if (!q || q.length < 2) {
      setResults([]);
      return;
    }

    try {
      setLoadingSearch(true);
      const res = await fetch(`/api/customers/search?q=${encodeURIComponent(q)}`);
      const data = await res.json().catch(() => []);
      setResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      setResults([]);
    } finally {
      setLoadingSearch(false);
    }
  }

  function applyCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    setResults([]);
    setCustomerSearch(customer.name || "");

    setCustomerForm({
      name: customer.name || "",
      cpf: customer.cpf || "",
      whatsapp: customer.whatsapp || "",
      email: customer.email || "",
      cep: customer.cep || "",
      address: customer.address || "",
      number: customer.number || "",
      complement: customer.complement || "",
      neighborhood: customer.neighborhood || "",
      city: customer.city || "",
    });
  }

  function resetCustomer() {
    setSelectedCustomer(null);
    setCustomerSearch("");
    setResults([]);
    setCustomerForm({
      name: "",
      cpf: "",
      whatsapp: "",
      email: "",
      cep: "",
      address: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
    });
  }

  async function saveCustomer() {
    if (!customerForm.name.trim()) {
      alert("Preencha o nome do cliente.");
      return null;
    }

    if (!customerForm.whatsapp.trim()) {
      alert("Preencha o WhatsApp do cliente.");
      return null;
    }

    try {
      setSavingCustomer(true);

      const payload = {
  name: customerForm.name.trim(),
  cpf: onlyDigits(customerForm.cpf),
  whatsapp: onlyDigits(customerForm.whatsapp),
  email: customerForm.email.trim() || null,
  cep: onlyDigits(customerForm.cep),
  address: customerForm.address.trim() || null,
  number: customerForm.number.trim() || null,
  complement: customerForm.complement.trim() || null,
  neighborhood: customerForm.neighborhood.trim() || null,
  city: customerForm.city.trim() || null,
};

      const url = selectedCustomer
        ? `/api/customers/${selectedCustomer.id}`
        : "/api/customers";

      const method = selectedCustomer ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.error || "Erro ao criar cliente");
        return null;
      }

      applyCustomer(data);
      return data;
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      alert("Erro ao salvar cliente");
      return null;
    } finally {
      setSavingCustomer(false);
    }
  }

  const selectedCategory = useMemo(() => {
    return categories.find((category) => category.id === selectedCategoryId) || null;
  }, [categories, selectedCategoryId]);

  const isHalfHalfCategory = useMemo(() => {
    if (!selectedCategory) return false;

    const categoryName = String(selectedCategory.name || "").toLowerCase();
    const categorySlug = String(selectedCategory.slug || "").toLowerCase();
    const categoryType = String(selectedCategory.type || "").toUpperCase();

    return (
      categoryType === "PIZZA_HALF_HALF" ||
      categorySlug.includes("meio-a-meio") ||
      categoryName.includes("meio a meio")
    );
  }, [selectedCategory]);

  const filteredProducts = useMemo(() => {
    const products = selectedCategory?.products || [];
    const q = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matches =
        !q ||
        product.name.toLowerCase().includes(q) ||
        String(product.description || "").toLowerCase().includes(q);

      return product.active && product.inStock && matches;
    });
  }, [selectedCategory, searchTerm]);

  const filteredCombos = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return combos.filter((combo) => {
      const matches =
        !q ||
        String(combo.name || "").toLowerCase().includes(q) ||
        String(combo.description || "").toLowerCase().includes(q);

      return combo.active && matches;
    });
  }, [combos, searchTerm]);

  function getProductAdditionals(product: Product, category?: Category | null) {
    const customConfigs = product.productAdditionalConfigs || [];

    if (customConfigs.length > 0) {
      return customConfigs
        .filter((config) => config.additional?.active !== false)
        .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
        .map((config) => ({
          ...config.additional,
          required: Boolean(config.required),
          sortOrder: Number(config.sortOrder || 0),
        }));
    }

    return category?.additionals || [];
  }

  function hasAdditionalsForProduct(product: Product, category?: Category | null) {
    return Boolean(getProductAdditionals(product, category).length);
  }

  function addPlainProductToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find(
        (item) =>
          item.type === "PRODUCT" &&
          item.refId === product.id &&
          (!item.additionalIds || item.additionalIds.length === 0)
      );

      if (existing) {
        return prev.map((item) =>
          item.type === "PRODUCT" &&
          item.refId === product.id &&
          (!item.additionalIds || item.additionalIds.length === 0)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: "PRODUCT",
          refId: product.id,
          productId: product.id,
          name: product.name,
          unitPrice: Number(product.price),
          quantity: 1,
          notes: "",
          additionalIds: [],
          additionalNames: [],
        },
      ];
    });
  }

  function openProductOptions(product: Product, category: Category | null) {
    setSelectedTarget({
      type: "PRODUCT",
      product,
      category,
    });
    setSelectedAdditionals([]);
  }

  function addToCart(product: Product, category?: Category | null) {
    if (hasAdditionalsForProduct(product, category)) {
      openProductOptions(product, category || null);
      return;
    }

    addPlainProductToCart(product);
  }

  function addCombo(combo: Combo) {
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.type === "COMBO" && item.refId === combo.id
      );

      if (existing) {
        return prev.map((item) =>
          item.type === "COMBO" && item.refId === combo.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: "COMBO",
          refId: combo.id,
          comboId: combo.id,
          name: combo.name,
          unitPrice: Number(combo.price),
          quantity: 1,
          notes: "",
        },
      ];
    });
  }

  function toggleFlavor(product: Product) {
    setSelectedFlavors((prev) => {
      const exists = prev.find((item) => item.id === product.id);

      if (exists) {
        return prev.filter((item) => item.id !== product.id);
      }

      if (prev.length >= 2) {
        alert("Só pode escolher 2 sabores.");
        return prev;
      }

      return [...prev, product];
    });
  }

  function isFlavorSelected(productId: string) {
    return selectedFlavors.some((product) => product.id === productId);
  }

  function getHalfHalfPrice() {
    if (selectedFlavors.length === 0) return 0;
    if (selectedFlavors.length === 1) return Number(selectedFlavors[0].price);

    return Math.max(
      Number(selectedFlavors[0].price),
      Number(selectedFlavors[1].price)
    );
  }

  function addHalfHalfToCart() {
    if (!selectedCategory) return;

    if (selectedFlavors.length !== 2) {
      alert("Selecione 2 sabores para montar a pizza meio a meio.");
      return;
    }

    const flavor1 = selectedFlavors[0];
    const flavor2 = selectedFlavors[1];
    const price = getHalfHalfPrice();

    if (selectedCategory?.additionals?.length) {
      setSelectedTarget({
        type: "HALF_HALF",
        category: selectedCategory,
        flavorIds: [flavor1.id, flavor2.id],
        flavorNames: [flavor1.name, flavor2.name],
        basePrice: price,
        name: `Meio a Meio: ${flavor1.name} + ${flavor2.name}`,
        productId: `half-half-${flavor1.id}-${flavor2.id}`,
      });
      setSelectedAdditionals([]);
      return;
    }

    setCart((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "HALF_HALF",
        refId: `half-half-${flavor1.id}-${flavor2.id}`,
        productId: `half-half-${flavor1.id}-${flavor2.id}`,
        name: `Meio a Meio: ${flavor1.name} + ${flavor2.name}`,
        unitPrice: price,
        quantity: 1,
        notes: "",
        flavorIds: [flavor1.id, flavor2.id],
        flavorNames: [flavor1.name, flavor2.name],
        additionalIds: [],
        additionalNames: [],
      },
    ]);

    setSelectedFlavors([]);
  }

  function closeOptionsModal() {
    setSelectedTarget(null);
    setSelectedAdditionals([]);
  }

  function toggleAdditional(additional: Additional) {
    setSelectedAdditionals((prev) => {
      const exists = prev.some((item) => item.id === additional.id);

      if (exists) {
        return prev.filter((item) => item.id !== additional.id);
      }

      return [...prev, additional];
    });
  }

  function isAdditionalSelected(additionalId: string) {
    return selectedAdditionals.some((item) => item.id === additionalId);
  }

  const currentAdditionals = useMemo(() => {
    if (!selectedTarget) return [];

    if (selectedTarget.type === "PRODUCT") {
      return getProductAdditionals(
        selectedTarget.product,
        selectedTarget.category
      );
    }

    return selectedTarget.category?.additionals || [];
  }, [selectedTarget]);

  const currentBasePrice = useMemo(() => {
    if (!selectedTarget) return 0;

    if (selectedTarget.type === "PRODUCT") {
      return Number(selectedTarget.product.price || 0);
    }

    return Number(selectedTarget.basePrice || 0);
  }, [selectedTarget]);

  const additionalTotal = useMemo(() => {
    return selectedAdditionals.reduce(
      (acc, item) => acc + Number(item.price || 0),
      0
    );
  }, [selectedAdditionals]);

  const finalModalPrice = currentBasePrice + additionalTotal;

  function validateRequiredAdditionals() {
    const requiredAdditionals = currentAdditionals.filter((item) => item.required);

    if (requiredAdditionals.length === 0) return true;

    const missing = requiredAdditionals.some(
      (requiredItem) =>
        !selectedAdditionals.some((selected) => selected.id === requiredItem.id)
    );

    if (missing) {
      alert("Selecione os adicionais obrigatórios.");
      return false;
    }

    return true;
  }

  function confirmSelectedTarget() {
    if (!selectedTarget) return;
    if (!validateRequiredAdditionals()) return;

    if (selectedTarget.type === "PRODUCT") {
      const product = selectedTarget.product;

      setCart((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: "PRODUCT",
          refId: product.id,
          productId: product.id,
          name: product.name,
          unitPrice: Number(finalModalPrice),
          quantity: 1,
          notes: "",
          additionalIds: selectedAdditionals.map((item) => item.id),
          additionalNames: selectedAdditionals.map((item) => item.name),
        },
      ]);

      closeOptionsModal();
      return;
    }

    setCart((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "HALF_HALF",
        refId: selectedTarget.productId,
        productId: selectedTarget.productId,
        name: selectedTarget.name,
        unitPrice: Number(finalModalPrice),
        quantity: 1,
        notes: "",
        flavorIds: selectedTarget.flavorIds,
        flavorNames: selectedTarget.flavorNames,
        additionalIds: selectedAdditionals.map((item) => item.id),
        additionalNames: selectedAdditionals.map((item) => item.name),
      },
    ]);

    setSelectedFlavors([]);
    closeOptionsModal();
  }

  function incrementItem(itemId: string) {
    setCart((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  }

  function decrementItem(itemId: string) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function updateItemNotes(itemId: string, notes: string) {
    setCart((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, notes } : item))
    );
  }

  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  }, [cart]);

  const total = useMemo(() => {
    return subtotal + Number(deliveryFee || 0) - Number(discount || 0);
  }, [subtotal, deliveryFee, discount]);

  async function finalizeOrder() {
    if (cart.length === 0) {
      alert("Adicione pelo menos um item.");
      return;
    }

    if (!customerForm.name.trim()) {
      alert("Preencha o nome do cliente.");
      return;
    }

    if (!customerForm.whatsapp.trim()) {
      alert("Preencha o WhatsApp do cliente.");
      return;
    }

    try {
      setSavingOrder(true);

      const customer = selectedCustomer || (await saveCustomer());

      const res = await fetch("/api/pdv/orders", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    customerId: customer?.id || null,
    customerName: customerForm.name,
    customerPhone: customerForm.whatsapp,
    orderType: orderType,
    paymentMethod,
    observation,
    deliveryFee: Number(deliveryFee || 0),
    discount: Number(discount || 0),
    changeFor: changeFor ? Number(changeFor) : null,
    items: cart.map((item) => ({
      productId: item.productId || null,
      comboId: item.comboId || null,
      type: item.type,
      name: item.name,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      notes: item.notes || null,
    })),
  }),
});

const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.error || "Erro ao finalizar pedido.");
        return;
      }

      alert(`Pedido criado com sucesso. Código: ${data?.id || "OK"}`);
      setCart([]);
      setSelectedFlavors([]);
      setObservation("");
      setDeliveryFee("0");
      setDiscount("0");
      setChangeFor("");
    } catch (error) {
      console.error("Erro ao finalizar pedido:", error);
      alert("Erro ao finalizar pedido.");
    } finally {
      setSavingOrder(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-black">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-4">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h1 className="text-2xl font-bold">PDV • Balcão</h1>
            <p className="text-sm text-gray-500">
              Atendimento rápido para balcão, telefone e retirada.
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-bold">Buscar cliente</h2>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="CPF, WhatsApp ou nome"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 outline-none"
              />
              <button
                type="button"
                onClick={resetCustomer}
                className="rounded-xl border px-4 py-3 font-semibold"
              >
                Novo
              </button>
            </div>

            {loadingSearch && (
              <p className="mt-2 text-sm text-gray-500">Buscando...</p>
            )}

            {Array.isArray(results) && results.length > 0 && (
              <div className="mt-3 space-y-2">
                {results.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => applyCustomer(c)}
                    className="block w-full rounded-xl border p-3 text-left hover:bg-gray-50"
                  >
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-sm text-gray-500">
                      CPF: {c.cpf || "-"} • WhatsApp: {c.whatsapp || "-"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {c.address || "-"} {c.number ? `, ${c.number}` : ""}{" "}
                      {c.neighborhood ? `- ${c.neighborhood}` : ""}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-bold">Dados do cliente</h2>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                placeholder="Nome"
                value={customerForm.name}
                onChange={(e) =>
                  setCustomerForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="rounded-xl border px-4 py-3 outline-none"
              />
              <input
                placeholder="CPF"
                value={customerForm.cpf}
                onChange={(e) =>
                  setCustomerForm((prev) => ({ ...prev, cpf: e.target.value }))
                }
                className="rounded-xl border px-4 py-3 outline-none"
              />
              <input
                placeholder="WhatsApp"
                value={customerForm.whatsapp}
                onChange={(e) =>
                  setCustomerForm((prev) => ({ ...prev, whatsapp: e.target.value }))
                }
                className="rounded-xl border px-4 py-3 outline-none"
              />
              <input
                placeholder="Email"
                value={customerForm.email}
                onChange={(e) =>
                  setCustomerForm((prev) => ({ ...prev, email: e.target.value }))
                }
                className="rounded-xl border px-4 py-3 outline-none"
              />
              <input
                placeholder="CEP"
                value={customerForm.cep}
                onChange={(e) =>
                  setCustomerForm((prev) => ({ ...prev, cep: e.target.value }))
                }
                className="rounded-xl border px-4 py-3 outline-none"
              />
              <input
                placeholder="Endereço"
                value={customerForm.address}
                onChange={(e) =>
                  setCustomerForm((prev) => ({ ...prev, address: e.target.value }))
                }
                className="rounded-xl border px-4 py-3 outline-none"
              />
              <input
                placeholder="Número"
                value={customerForm.number}
                onChange={(e) =>
                  setCustomerForm((prev) => ({ ...prev, number: e.target.value }))
                }
                className="rounded-xl border px-4 py-3 outline-none"
              />
              <input
                placeholder="Complemento"
                value={customerForm.complement}
                onChange={(e) =>
                  setCustomerForm((prev) => ({ ...prev, complement: e.target.value }))
                }
                className="rounded-xl border px-4 py-3 outline-none"
              />
              <input
                placeholder="Bairro"
                value={customerForm.neighborhood}
                onChange={(e) =>
                  setCustomerForm((prev) => ({
                    ...prev,
                    neighborhood: e.target.value,
                  }))
                }
                className="rounded-xl border px-4 py-3 outline-none"
              />
              <input
                placeholder="Cidade"
                value={customerForm.city}
                onChange={(e) =>
                  setCustomerForm((prev) => ({ ...prev, city: e.target.value }))
                }
                className="rounded-xl border px-4 py-3 outline-none"
              />
            </div>

            <button
              type="button"
              onClick={saveCustomer}
              disabled={savingCustomer}
              className="mt-4 rounded-xl bg-black px-4 py-3 font-semibold text-white disabled:opacity-50"
            >
              {savingCustomer ? "Salvando..." : "Salvar cliente"}
            </button>
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-bold">Produtos e combos</h2>

            <div className="mb-3 flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`rounded-xl border px-4 py-2 font-semibold ${
                    selectedCategoryId === category.id
                      ? "border-red-600 bg-red-600 text-white"
                      : "border-red-200 bg-white text-red-600"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Buscar produto ou combo"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4 w-full rounded-xl border px-4 py-3 outline-none"
            />

            {selectedCategory && (
              <div className="mb-4 rounded-xl border p-3">
                <div className="font-semibold">{selectedCategory.name}</div>
                {selectedCategory.description && (
                  <div className="text-sm text-gray-500">
                    {selectedCategory.description}
                  </div>
                )}

                {isHalfHalfCategory && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-white p-3">
                    <p className="font-semibold">
                      Escolha 2 sabores para montar a pizza meio a meio.
                    </p>

                    <div className="mt-2 text-sm text-gray-700">
                      Selecionados:{" "}
                      {selectedFlavors.length === 0
                        ? "nenhum"
                        : selectedFlavors.map((flavor) => flavor.name).join(" + ")}
                    </div>

                    <div className="mt-2 text-sm font-bold text-red-600">
                      Valor atual: {toBRL(getHalfHalfPrice())}
                    </div>

                    <button
                      type="button"
                      onClick={addHalfHalfToCart}
                      disabled={selectedFlavors.length !== 2}
                      className="mt-3 rounded-xl border border-red-600 bg-red-600 px-4 py-2 font-bold text-white disabled:opacity-50"
                    >
                      Adicionar pizza meio a meio
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="mb-6">
              <h3 className="mb-2 font-bold">Produtos</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {filteredProducts.map((product) => {
                  const hasAdditionals = hasAdditionalsForProduct(
                    product,
                    selectedCategory
                  );
                  const flavorSelected = isFlavorSelected(product.id);

                  return (
                    <div
                      key={product.id}
                      className="rounded-2xl border bg-white p-4"
                    >
                      <div className="font-bold">{product.name}</div>
                      <div className="text-sm text-gray-500">
                        {product.description}
                      </div>
                      <div className="mt-2 font-bold text-red-600">
                        {toBRL(Number(product.price))}
                      </div>

                      {hasAdditionals && !isHalfHalfCategory && (
                        <div className="mt-1 text-xs text-gray-500">
                          Possui adicionais
                        </div>
                      )}

                      <div className="mt-3">
                        {isHalfHalfCategory ? (
                          <button
                            type="button"
                            onClick={() => toggleFlavor(product)}
                            className={`rounded-xl border px-4 py-2 font-bold ${
                              flavorSelected
                                ? "border-red-600 bg-red-600 text-white"
                                : "border-red-200 bg-white text-red-600"
                            }`}
                          >
                            {flavorSelected ? "Remover" : "Selecionar"}
                          </button>
                        ) : hasAdditionals ? (
                          <button
                            type="button"
                            onClick={() => openProductOptions(product, selectedCategory)}
                            className="rounded-xl border border-red-600 bg-red-600 px-4 py-2 font-bold text-white"
                          >
                            Adicionar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addToCart(product, selectedCategory)}
                            className="rounded-xl border border-red-600 bg-red-600 px-4 py-2 font-bold text-white"
                          >
                            Adicionar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <div className="rounded-2xl border p-4 text-sm text-gray-500">
                    Nenhum produto encontrado.
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-2 font-bold">Combos</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {filteredCombos.map((combo) => (
                  <button
                    key={combo.id}
                    type="button"
                    onClick={() => addCombo(combo)}
                    className="rounded-2xl border bg-white p-4 text-left hover:bg-gray-50"
                  >
                    <div className="font-bold">{combo.name}</div>
                    <div className="text-sm text-gray-500">
                      {combo.description}
                    </div>
                    <div className="mt-2 font-bold text-red-600">
                      {toBRL(Number(combo.price))}
                    </div>
                  </button>
                ))}

                {filteredCombos.length === 0 && (
                  <div className="rounded-2xl border p-4 text-sm text-gray-500">
                    Nenhum combo encontrado.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="sticky top-4 rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-bold">Pedido</h2>

            <div className="grid gap-3">
              <select
                value={orderType}
                onChange={(e) =>
                  setOrderType(
                    e.target.value as "DELIVERY" | "PICKUP" | "DINE_IN"
                  )
                }
                className="rounded-xl border px-4 py-3 outline-none"
              >
                <option value="DELIVERY">Entrega</option>
                <option value="PICKUP">Retirada</option>
                <option value="DINE_IN">Consumir no local</option>
              </select>

              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(
                    e.target.value as "PIX" | "DINHEIRO" | "DEBITO" | "CREDITO"
                  )
                }
                className="rounded-xl border px-4 py-3 outline-none"
              >
                <option value="PIX">Pix</option>
                <option value="DINHEIRO">Dinheiro</option>
                <option value="DEBITO">Cartão de débito</option>
                <option value="CREDITO">Cartão de crédito</option>
              </select>

              <input
                type="number"
                placeholder="Taxa de entrega"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                className="rounded-xl border px-4 py-3 outline-none"
              />

              <input
                type="number"
                placeholder="Desconto"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="rounded-xl border px-4 py-3 outline-none"
              />

              <input
                type="number"
                placeholder="Troco para"
                value={changeFor}
                onChange={(e) => setChangeFor(e.target.value)}
                className="rounded-xl border px-4 py-3 outline-none"
              />

              <textarea
                placeholder="Observação geral do pedido"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                className="min-h-[100px] rounded-xl border px-4 py-3 outline-none"
              />
            </div>

            <div className="mt-4 space-y-3">
              {cart.length === 0 ? (
                <div className="rounded-xl border p-4 text-sm text-gray-500">
                  Nenhum item no pedido.
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-semibold">{item.name}</div>
                        <div className="text-sm text-gray-500">
                          {toBRL(item.unitPrice)} cada
                        </div>

                        {item.flavorNames && item.flavorNames.length > 0 && (
                          <div className="mt-1 text-xs text-gray-500">
                            Sabores: {item.flavorNames.join(" + ")}
                          </div>
                        )}

                        {item.additionalNames && item.additionalNames.length > 0 && (
                          <div className="mt-1 text-xs text-gray-500">
                            Adicionais: {item.additionalNames.join(", ")}
                          </div>
                        )}

                        <textarea
                          placeholder="Observação do item"
                          value={item.notes || ""}
                          onChange={(e) => updateItemNotes(item.id, e.target.value)}
                          className="mt-2 min-h-[70px] w-full rounded-lg border px-3 py-2 text-sm outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => decrementItem(item.id)}
                          className="h-8 w-8 rounded-lg border"
                        >
                          -
                        </button>
                        <span className="min-w-[24px] text-center font-bold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => incrementItem(item.id)}
                          className="h-8 w-8 rounded-lg border"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 space-y-2 border-t pt-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{toBRL(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Taxa</span>
                <span>{toBRL(Number(deliveryFee || 0))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Desconto</span>
                <span>{toBRL(Number(discount || 0))}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-red-600">{toBRL(total)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={finalizeOrder}
              disabled={savingOrder}
              className="mt-4 w-full rounded-xl bg-red-600 px-4 py-3 font-bold text-white disabled:opacity-50"
            >
              {savingOrder ? "Salvando..." : "Finalizar pedido"}
            </button>
          </div>
        </aside>
      </div>

      {selectedTarget && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-3 md:items-center md:p-4">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-red-200 bg-white shadow-2xl">
            <div className="overflow-y-auto overscroll-contain p-5 md:p-6">
              <h2 className="text-2xl font-bold text-black">
                {selectedTarget.type === "PRODUCT"
                  ? selectedTarget.product.name
                  : selectedTarget.name}
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                Escolha os adicionais do item
              </p>

              <div className="mt-4 space-y-3">
                {currentAdditionals.length > 0 ? (
                  currentAdditionals.map((additional) => {
                    const checked = isAdditionalSelected(additional.id);

                    return (
                      <label
                        key={additional.id}
                        className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-red-200 bg-white p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-black">
                            {additional.name}
                            {additional.required ? " *" : ""}
                          </p>

                          {additional.description && (
                            <p className="text-sm text-gray-500">
                              {additional.description}
                            </p>
                          )}

                          <p className="text-sm text-red-600">
                            + {toBRL(Number(additional.price))}
                          </p>
                        </div>

                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAdditional(additional)}
                          className="mt-1 h-6 w-6 shrink-0"
                        />
                      </label>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-500">
                    Este item não possui adicionais.
                  </p>
                )}
              </div>

              <div className="mt-6 space-y-2 border-t border-red-200 pt-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Base</span>
                  <span>{toBRL(currentBasePrice)}</span>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Adicionais</span>
                  <span>{toBRL(additionalTotal)}</span>
                </div>

                <div className="flex items-center justify-between text-lg font-bold text-black">
                  <span>Total</span>
                  <span className="text-red-600">{toBRL(finalModalPrice)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-red-200 bg-white p-4">
              <button
                type="button"
                onClick={closeOptionsModal}
                className="rounded-xl border border-red-300 bg-white px-4 py-3 font-semibold text-red-600"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmSelectedTarget}
                className="rounded-xl border border-red-600 bg-red-600 px-4 py-3 font-semibold text-white"
              >
                Adicionar ao pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}