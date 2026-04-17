"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Additional = {
  id: string;
  name: string;
  slug: string;
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
  slug: string;
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

type ComboGroupItem = {
  id: string;
  productId: string;
  sortOrder: number;
  product: Product;
};

type ComboGroup = {
  id: string;
  comboId: string;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  items: ComboGroupItem[];
};

type ComboAdditionalConfig = {
  additionalId: string;
  required: boolean;
  sortOrder: number;
  additional: Additional;
};

type Combo = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  active: boolean;
  sortOrder: number;
  groups: ComboGroup[];
  comboAdditionalConfigs?: ComboAdditionalConfig[];
};

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

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("TODOS");
  const [selectedFlavors, setSelectedFlavors] = useState<Product[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<SelectedTarget | null>(
    null
  );
  const [selectedAdditionals, setSelectedAdditionals] = useState<Additional[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null);
  const [comboSelections, setComboSelections] = useState<
    Record<string, Record<string, number>>
  >({});
  const [comboSearchTerm, setComboSearchTerm] = useState("");
  const [selectedComboAdditionals, setSelectedComboAdditionals] = useState<
    Additional[]
  >([]);

  useEffect(() => {
    loadData();

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

  async function loadData() {
    try {
      const menuRes = await fetch("/api/menu", {
        cache: "no-store",
      });
      const combosRes = await fetch("/api/combos", { cache: "no-store" });

      const menuData = await menuRes.json().catch(() => []);
      const combosData = await combosRes.json().catch(() => []);

      setCategories(Array.isArray(menuData) ? menuData : []);
      setCombos(
        Array.isArray(combosData)
          ? combosData.filter((combo) => combo?.active !== false)
          : []
      );
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setCategories([]);
      setCombos([]);
    }
  }

  function saveCart(nextCart: CartItem[]) {
    setCart(nextCart);
    localStorage.setItem("cart", JSON.stringify(nextCart));
  }

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

  function hasAdditionalsForProduct(
    product: Product,
    category?: Category | null
  ) {
    return Boolean(getProductAdditionals(product, category).length);
  }

  function addPlainProductToCart(product: Product) {
    const existing = cart.find(
      (item) =>
        !item.isHalfHalf &&
        !item.isCombo &&
        item.productId === product.id &&
        (!item.additionalIds || item.additionalIds.length === 0)
    );

    if (existing) {
      const nextCart = cart.map((item) =>
        !item.isHalfHalf &&
        !item.isCombo &&
        item.productId === product.id &&
        (!item.additionalIds || item.additionalIds.length === 0)
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
      saveCart(nextCart);
      return;
    }

    const nextCart = [
      ...cart,
      {
        id: crypto.randomUUID(),
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: 1,
        additionalIds: [],
        additionalNames: [],
      },
    ];

    saveCart(nextCart);
  }

  function addToCart(product: Product, category?: Category | null) {
    if (hasAdditionalsForProduct(product, category)) {
      openProductOptions(product, category || null);
      return;
    }

    addPlainProductToCart(product);
  }

  function removeFromCart(productId: string) {
    const existing = cart.find(
      (item) =>
        !item.isHalfHalf &&
        !item.isCombo &&
        item.productId === productId &&
        (!item.additionalIds || item.additionalIds.length === 0)
    );

    if (!existing) return;

    if (existing.quantity <= 1) {
      const nextCart = cart.filter(
        (item) =>
          !(
            !item.isHalfHalf &&
            !item.isCombo &&
            item.productId === productId &&
            (!item.additionalIds || item.additionalIds.length === 0)
          )
      );
      saveCart(nextCart);
      return;
    }

    const nextCart = cart.map((item) =>
      !item.isHalfHalf &&
      !item.isCombo &&
      item.productId === productId &&
      (!item.additionalIds || item.additionalIds.length === 0)
        ? { ...item, quantity: item.quantity - 1 }
        : item
    );

    saveCart(nextCart);
  }

  function getProductQuantity(productId: string) {
    const item = cart.find(
      (cartItem) =>
        !cartItem.isHalfHalf &&
        !cartItem.isCombo &&
        cartItem.productId === productId &&
        (!cartItem.additionalIds || cartItem.additionalIds.length === 0)
    );
    return item ? item.quantity : 0;
  }

  function openProductOptions(product: Product, category: Category | null) {
    if (!hasAdditionalsForProduct(product, category)) {
      addPlainProductToCart(product);
      return;
    }

    setSelectedTarget({
      type: "PRODUCT",
      product,
      category,
    });
    setSelectedAdditionals([]);
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
    const requiredAdditionals = currentAdditionals.filter(
      (item) => item.required
    );

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

      const nextCart = [
        ...cart,
        {
          id: crypto.randomUUID(),
          productId: product.id,
          name: product.name,
          price: Number(finalModalPrice),
          quantity: 1,
          additionalIds: selectedAdditionals.map((item) => item.id),
          additionalNames: selectedAdditionals.map((item) => item.name),
        },
      ];

      saveCart(nextCart);
      closeOptionsModal();
      alert("Produto adicionado ao carrinho.");
      return;
    }

    const nextCart = [
      ...cart,
      {
        id: crypto.randomUUID(),
        productId: selectedTarget.productId,
        name: selectedTarget.name,
        price: Number(finalModalPrice),
        quantity: 1,
        isHalfHalf: true,
        flavorIds: selectedTarget.flavorIds,
        flavorNames: selectedTarget.flavorNames,
        additionalIds: selectedAdditionals.map((item) => item.id),
        additionalNames: selectedAdditionals.map((item) => item.name),
      },
    ];

    saveCart(nextCart);
    setSelectedFlavors([]);
    closeOptionsModal();
    alert("Pizza meio a meio adicionada ao carrinho.");
  }

  function toggleFlavor(product: Product) {
    setSelectedFlavors((prev) => {
      const exists = prev.find((p) => p.id === product.id);

      if (exists) {
        return prev.filter((p) => p.id !== product.id);
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
    if (selectedFlavors.length !== 2) {
      alert("Selecione 2 sabores para montar a pizza meio a meio.");
      return;
    }

    const flavor1 = selectedFlavors[0];
    const flavor2 = selectedFlavors[1];
    const price = getHalfHalfPrice();

    const halfHalfCategory = selectedCategory;

    if (halfHalfCategory?.additionals?.length) {
      setSelectedTarget({
        type: "HALF_HALF",
        category: halfHalfCategory,
        flavorIds: [flavor1.id, flavor2.id],
        flavorNames: [flavor1.name, flavor2.name],
        basePrice: price,
        name: `Meio a Meio: ${flavor1.name} + ${flavor2.name}`,
        productId: `half-half-${flavor1.id}-${flavor2.id}`,
      });
      setSelectedAdditionals([]);
      return;
    }

    const nextCart = [
      ...cart,
      {
        id: crypto.randomUUID(),
        productId: `half-half-${flavor1.id}-${flavor2.id}`,
        name: `Meio a Meio: ${flavor1.name} + ${flavor2.name}`,
        price,
        quantity: 1,
        isHalfHalf: true,
        flavorIds: [flavor1.id, flavor2.id],
        flavorNames: [flavor1.name, flavor2.name],
        additionalIds: [],
        additionalNames: [],
      },
    ];

    saveCart(nextCart);
    setSelectedFlavors([]);
    alert("Pizza meio a meio adicionada ao carrinho.");
  }

  function openCombo(combo: Combo) {
    const initialSelections: Record<string, Record<string, number>> = {};

    combo.groups.forEach((group) => {
      initialSelections[group.id] = {};
    });

    setSelectedCombo(combo);
    setComboSelections(initialSelections);
    setComboSearchTerm("");
    setSelectedComboAdditionals([]);
  }

  function closeComboModal() {
    setSelectedCombo(null);
    setComboSelections({});
    setComboSearchTerm("");
    setSelectedComboAdditionals([]);
  }

  function getComboGroupTotalSelected(groupId: string) {
    const groupSelections = comboSelections[groupId] || {};

    return Object.values(groupSelections).reduce(
      (total, qty) => total + Number(qty || 0),
      0
    );
  }

  function incrementComboGroupProduct(group: ComboGroup, productId: string) {
    setComboSelections((prev) => {
      const currentGroup = prev[group.id] || {};
      const currentQty = Number(currentGroup[productId] || 0);

      const totalSelected = Object.values(currentGroup).reduce(
        (total, qty) => total + Number(qty || 0),
        0
      );

      if (totalSelected >= group.maxSelect) {
        alert(
          `Você pode escolher no máximo ${group.maxSelect} item(ns) em "${group.name}".`
        );
        return prev;
      }

      return {
        ...prev,
        [group.id]: {
          ...currentGroup,
          [productId]: currentQty + 1,
        },
      };
    });
  }

  function decrementComboGroupProduct(group: ComboGroup, productId: string) {
    setComboSelections((prev) => {
      const currentGroup = prev[group.id] || {};
      const currentQty = Number(currentGroup[productId] || 0);

      if (currentQty <= 0) {
        return prev;
      }

      const nextGroup = { ...currentGroup };

      if (currentQty === 1) {
        delete nextGroup[productId];
      } else {
        nextGroup[productId] = currentQty - 1;
      }

      return {
        ...prev,
        [group.id]: nextGroup,
      };
    });
  }

  function toggleComboAdditional(additional: Additional) {
    setSelectedComboAdditionals((prev) => {
      const exists = prev.find((a) => a.id === additional.id);

      if (exists) {
        return prev.filter((a) => a.id !== additional.id);
      }

      return [...prev, additional];
    });
  }

  function isComboAdditionalSelected(additionalId: string) {
    return selectedComboAdditionals.some((item) => item.id === additionalId);
  }

  function validateComboSelections() {
    if (!selectedCombo) return false;

    for (const group of selectedCombo.groups) {
      const groupSelections = comboSelections[group.id] || {};
      const totalSelected = Object.values(groupSelections).reduce(
        (total, qty) => total + Number(qty || 0),
        0
      );

      if (group.required && totalSelected < group.minSelect) {
        alert(
          `Selecione pelo menos ${group.minSelect} item(ns) em "${group.name}".`
        );
        return false;
      }

      if (totalSelected > group.maxSelect) {
        alert(
          `Você pode escolher no máximo ${group.maxSelect} item(ns) em "${group.name}".`
        );
        return false;
      }
    }

    const requiredComboAdditionals =
      selectedCombo.comboAdditionalConfigs?.filter((config) => config.required) ||
      [];

    if (requiredComboAdditionals.length > 0) {
      const hasMissingRequired = requiredComboAdditionals.some(
        (config) =>
          !selectedComboAdditionals.some(
            (selected) => selected.id === config.additionalId
          )
      );

      if (hasMissingRequired) {
        alert("Selecione os adicionais obrigatórios do combo.");
        return false;
      }
    }

    return true;
  }

  const comboAdditionalTotal = useMemo(() => {
    return selectedComboAdditionals.reduce(
      (acc, item) => acc + Number(item.price || 0),
      0
    );
  }, [selectedComboAdditionals]);

  const comboFinalPrice = useMemo(() => {
    if (!selectedCombo) return 0;
    return Number(selectedCombo.price || 0) + comboAdditionalTotal;
  }, [selectedCombo, comboAdditionalTotal]);

  function confirmComboToCart() {
    if (!selectedCombo) return;
    if (!validateComboSelections()) return;

    const selectionsSummary: string[] = [];

    selectedCombo.groups.forEach((group) => {
      const groupSelections = comboSelections[group.id] || {};

      const selectedNames = group.items
        .map((item) => {
          const qty = Number(groupSelections[item.productId] || 0);

          if (qty <= 0) return null;

          return qty > 1
            ? `${item.product?.name} x${qty}`
            : item.product?.name;
        })
        .filter(Boolean) as string[];

      if (selectedNames.length > 0) {
        selectionsSummary.push(`${group.name}: ${selectedNames.join(", ")}`);
      }
    });

    if (selectedComboAdditionals.length > 0) {
      selectionsSummary.push(
        `Adicionais: ${selectedComboAdditionals
          .map((item) => item.name)
          .join(", ")}`
      );
    }

    const nextCart = [
      ...cart,
      {
        id: crypto.randomUUID(),
        productId: `combo-${selectedCombo.id}`,
        comboId: selectedCombo.id,
        name: selectedCombo.name,
        price: Number(comboFinalPrice),
        quantity: 1,
        isCombo: true,
        comboSelectionsSummary: selectionsSummary,
        additionalIds: selectedComboAdditionals.map((item) => item.id),
        additionalNames: selectedComboAdditionals.map((item) => item.name),
      },
    ];

    saveCart(nextCart);
    closeComboModal();
    alert("Combo adicionado ao carrinho.");
  }

  const selectedCategory = useMemo(() => {
    if (
      selectedCategoryId === "TODOS" ||
      selectedCategoryId === "COMBOS"
    ) {
      return null;
    }

    return (
      categories.find((category) => category.id === selectedCategoryId) ?? null
    );
  }, [categories, selectedCategoryId]);

  const allProducts = useMemo(() => {
    const safeCategories = Array.isArray(categories) ? categories : [];
    const map = new Map<string, Product>();

    safeCategories.forEach((category) => {
      const categoryProducts = Array.isArray(category?.products)
        ? category.products
        : [];

      categoryProducts.forEach((product) => {
        if (!map.has(product.id)) {
          map.set(product.id, product);
        }
      });
    });

    return Array.from(map.values());
  }, [categories]);

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

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredProducts =
    selectedCategoryId === "TODOS"
      ? allProducts.filter((product) => {
          const matchesSearch =
            !normalizedSearch ||
            product.name.toLowerCase().includes(normalizedSearch) ||
            String(product.description || "")
              .toLowerCase()
              .includes(normalizedSearch);

          return product.active && product.inStock && matchesSearch;
        })
      : selectedCategoryId === "COMBOS"
      ? []
      : (selectedCategory?.products || []).filter((product) => {
          const matchesSearch =
            !normalizedSearch ||
            product.name.toLowerCase().includes(normalizedSearch) ||
            String(product.description || "")
              .toLowerCase()
              .includes(normalizedSearch) ||
            String(selectedCategory?.name || "")
              .toLowerCase()
              .includes(normalizedSearch);

          return product.active && product.inStock && matchesSearch;
        });

  const filteredCombos =
    selectedCategoryId === "COMBOS"
      ? combos.filter((combo) => {
          const matchesSearch =
            !normalizedSearch ||
            String(combo.name || "").toLowerCase().includes(normalizedSearch) ||
            String(combo.description || "")
              .toLowerCase()
              .includes(normalizedSearch);

          return combo?.active !== false && matchesSearch;
        })
      : [];

  const filteredComboGroups = useMemo(() => {
    if (!selectedCombo) return [];

    const normalized = comboSearchTerm.trim().toLowerCase();

    if (!normalized) {
      return selectedCombo.groups;
    }

    return selectedCombo.groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const name = String(item.product?.name || "").toLowerCase();
          const description = String(
            item.product?.description || ""
          ).toLowerCase();

          return name.includes(normalized) || description.includes(normalized);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [selectedCombo, comboSearchTerm]);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    setSelectedFlavors([]);
  }, [selectedCategoryId]);

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="sticky top-0 z-50 border-b border-red-200 bg-white/95 backdrop-blur">
  <div className="flex items-center justify-between px-4 py-3">
    
    <div className="flex items-center gap-3">
      <Image
        src="/logo.jpg"
        alt="Logo Pizzaria KMCL"
        width={44}
        height={44}
        className="h-11 w-11 rounded-full border border-red-200 object-cover shadow-sm"
      />

      <div>
        <h1 className="text-lg font-bold text-black">Pizzaria KMCL NOVA</h1>
        <p className="text-xs text-gray-600">Cardápio online</p>
      </div>
    </div>

    <Link
      href="/carrinho"
      className="rounded-xl border border-red-600 bg-red-600 px-4 py-2 font-bold text-white shadow-sm"
    >
      🛒 {cartCount}
    </Link>

  </div>
</header>

      <div className="px-4 pt-4">
        <div className="rounded-2xl border border-red-200 bg-white p-3 shadow-sm">
          <input
            type="text"
            placeholder="Buscar pizza, hambúrguer, combo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-black outline-none placeholder:text-gray-400 focus:border-red-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto px-4 py-4">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedCategoryId("TODOS")}
            className={`rounded-xl border px-4 py-2 font-semibold transition ${
              selectedCategoryId === "TODOS"
                ? "border-red-600 bg-red-600 text-white"
                : "border-red-200 bg-white text-red-600"
            }`}
          >
            Todos
          </button>

          <button
            onClick={() => setSelectedCategoryId("COMBOS")}
            className={`rounded-xl border px-4 py-2 font-semibold transition ${
              selectedCategoryId === "COMBOS"
                ? "border-red-600 bg-red-600 text-white"
                : "border-red-200 bg-white text-red-600"
            }`}
          >
            Combos
          </button>

          {categories
            .filter((category) => category.active !== false)
            .map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategoryId(category.id)}
                className={`whitespace-nowrap rounded-xl border px-4 py-2 font-semibold transition ${
                  selectedCategoryId === category.id
                    ? "border-red-600 bg-red-600 text-white"
                    : "border-red-200 bg-white text-red-600"
                }`}
              >
                {category.name}
              </button>
            ))}
        </div>
      </div>

      {selectedCategoryId === "COMBOS" && (
        <div className="px-4 pb-4">
          <div className="mb-3 rounded-2xl border border-red-200 bg-white p-4 shadow-sm">
            <h2 className="text-xl font-bold text-black">Combos</h2>
            <p className="text-sm text-gray-600">
              Escolha um combo e personalize os itens.
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Combos encontrados: {filteredCombos.length}
            </p>
          </div>

          <div className="grid gap-4">
            {filteredCombos.length > 0 ? (
              filteredCombos.map((combo) => (
                <div
                  key={combo.id}
                  className="flex items-center gap-4 rounded-2xl border border-red-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-red-100 bg-white">
                    {combo.imageUrl ? (
                      <img
                        src={combo.imageUrl}
                        alt={combo.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-3xl">🎁</div>
                    )}
                  </div>

                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-black">
                      {combo.name}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {combo.description}
                    </p>
                    <p className="mt-1 font-bold text-red-600">
                      R$ {Number(combo.price).toFixed(2)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {combo.groups?.length || 0} grupo(s) configurado(s)
                    </p>
                  </div>

                  <button
                    onClick={() => openCombo(combo)}
                    className="rounded-xl border border-red-600 bg-red-600 px-4 py-2 font-bold text-white"
                  >
                    Montar combo
                  </button>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-red-200 bg-white p-4 text-sm text-gray-500 shadow-sm">
                Nenhum combo disponível no momento.
              </div>
            )}
          </div>
        </div>
      )}

      {selectedCategory && (
        <div className="px-4 pb-2">
          <div className="rounded-2xl border border-red-200 bg-white p-4 shadow-sm">
            <h2 className="font-bold text-black">{selectedCategory.name}</h2>

            {selectedCategory.description && (
              <p className="mt-1 text-sm text-gray-600">
                {selectedCategory.description}
              </p>
            )}

            {isHalfHalfCategory && (
              <div className="mt-3 rounded-xl border border-red-200 bg-white p-3">
                <p className="font-semibold text-black">
                  Escolha 2 sabores para montar sua pizza meio a meio.
                </p>

                <div className="mt-2 text-sm font-medium text-gray-700">
                  Selecionados:{" "}
                  {selectedFlavors.length === 0
                    ? "nenhum"
                    : selectedFlavors.map((flavor) => flavor.name).join(" + ")}
                </div>

                <div className="mt-2 text-sm font-bold text-red-600">
                  Valor atual: R$ {getHalfHalfPrice().toFixed(2)}
                </div>

                <button
                  onClick={addHalfHalfToCart}
                  disabled={selectedFlavors.length !== 2}
                  className="mt-3 rounded-xl border border-red-600 bg-red-600 px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Adicionar pizza meio a meio
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedCategoryId !== "COMBOS" && (
        <div className="grid gap-4 px-4 pb-24">
          {filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-red-200 bg-white p-4 text-sm text-gray-500 shadow-sm">
              Nenhum item encontrado para essa busca.
            </div>
          ) : (
            filteredProducts.map((product) => {
              const quantity = getProductQuantity(product.id);
              const flavorSelected = isFlavorSelected(product.id);
              const productHasAdditionals = hasAdditionalsForProduct(
                product,
                selectedCategory
              );

              return (
                <div
                  key={`${selectedCategoryId}-${product.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-red-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-red-100 bg-white">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-3xl">🍕</div>
                    )}
                  </div>

                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-black">
                      {product.name}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {product.description}
                    </p>
                    <p className="mt-1 font-bold text-red-600">
                      R$ {Number(product.price).toFixed(2)}
                    </p>

                    {productHasAdditionals && (
                      <p className="mt-1 text-xs text-gray-500">
                        Possui adicionais para escolher
                      </p>
                    )}
                  </div>

                  {isHalfHalfCategory ? (
                    <button
                      onClick={() => toggleFlavor(product)}
                      className={`rounded-xl border px-4 py-2 font-bold ${
                        flavorSelected
                          ? "border-red-600 bg-red-600 text-white"
                          : "border-red-200 bg-white text-red-600"
                      }`}
                    >
                      {flavorSelected ? "remover" : "adicionar"}
                    </button>
                  ) : productHasAdditionals ? (
                    <button
                      onClick={() => openProductOptions(product, selectedCategory)}
                      className="rounded-xl border border-red-600 bg-red-600 px-4 py-2 font-bold text-white"
                    >
                      Adicionar
                    </button>
                  ) : quantity === 0 ? (
                    <button
                      onClick={() => addToCart(product, selectedCategory)}
                      className="rounded-xl border border-red-600 bg-red-600 px-4 py-2 font-bold text-white"
                    >
                      +
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-2 py-2 shadow-sm">
                      <button
                        onClick={() => removeFromCart(product.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-600 bg-red-600 font-bold text-white"
                      >
                        -
                      </button>

                      <span className="min-w-[24px] text-center font-bold text-black">
                        {quantity}
                      </span>

                      <button
                        onClick={() => addToCart(product, selectedCategory)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-600 bg-red-600 font-bold text-white"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

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
          Escolha os adicionais do seu pedido
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
                      + R$ {Number(additional.price).toFixed(2)}
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
            <span>R$ {currentBasePrice.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Adicionais</span>
            <span>R$ {additionalTotal.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between text-lg font-bold text-black">
            <span>Total</span>
            <span className="text-red-600">
              R$ {finalModalPrice.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-red-200 bg-white p-4">
        <button
          onClick={closeOptionsModal}
          className="rounded-xl border border-red-300 bg-white px-4 py-3 font-semibold text-red-600"
        >
          Cancelar
        </button>

        <button
          onClick={confirmSelectedTarget}
          className="rounded-xl border border-red-600 bg-red-600 px-4 py-3 font-semibold text-white"
        >
          Adicionar ao carrinho
        </button>
      </div>
    </div>
  </div>
)}

      {selectedCombo && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-4 md:items-center">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-red-200 bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-black">
              {selectedCombo.name}
            </h2>

            {selectedCombo.description && (
              <p className="mt-1 text-sm text-gray-600">
                {selectedCombo.description}
              </p>
            )}

            <div className="mt-2 text-sm font-bold text-red-600">
              R$ {Number(selectedCombo.price).toFixed(2)}
            </div>

            <div className="mt-4">
              <input
                type="text"
                placeholder="Buscar item do combo..."
                value={comboSearchTerm}
                onChange={(e) => setComboSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-black outline-none placeholder:text-gray-400 focus:border-red-500"
              />
            </div>

            {selectedCombo.comboAdditionalConfigs &&
              selectedCombo.comboAdditionalConfigs.length > 0 && (
                <div className="mt-6 rounded-2xl border border-red-200 bg-white p-4">
                  <h3 className="mb-3 font-bold text-black">
                    Adicionais do combo
                  </h3>

                  <div className="space-y-2">
                    {selectedCombo.comboAdditionalConfigs.map((config) => {
                      const additional = config.additional;
                      const checked = isComboAdditionalSelected(additional.id);

                      return (
                        <label
                          key={additional.id}
                          className="flex cursor-pointer items-center justify-between rounded-xl border border-red-200 bg-white p-3"
                        >
                          <div>
                            <p className="font-semibold text-black">
                              {additional.name}
                              {config.required ? " *" : ""}
                            </p>

                            {additional.description && (
                              <p className="text-sm text-gray-500">
                                {additional.description}
                              </p>
                            )}

                            <p className="text-sm font-semibold text-red-600">
                              + R$ {Number(additional.price).toFixed(2)}
                            </p>
                          </div>

                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleComboAdditional(additional)}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

            <div className="mt-6 space-y-4">
              {filteredComboGroups.length > 0 ? (
                filteredComboGroups
                  .sort(
                    (a, b) =>
                      Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
                  )
                  .map((group) => (
                    <div
                      key={group.id}
                      className="rounded-2xl border border-red-200 bg-white p-4"
                    >
                      <div className="mb-3">
                        <h3 className="font-bold text-black">
                          {group.name}
                          {group.required ? " *" : ""}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Escolha de {group.minSelect} até {group.maxSelect} item(ns)
                        </p>
                      </div>

                      <div className="space-y-2">
                        {group.items?.length > 0 ? (
                          group.items.map((item) => {
                            const product = item.product;
                            const qty = Number(
                              (comboSelections[group.id] || {})[item.productId] || 0
                            );
                            const totalSelected = getComboGroupTotalSelected(group.id);

                            return (
                              <div
                                key={item.id}
                                className="flex items-center gap-3 rounded-xl border border-red-200 bg-white p-3"
                              >
                                <div className="flex-1">
                                  <p className="font-semibold text-black">
                                    {product?.name}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {product?.description}
                                  </p>
                                  <p className="mt-1 text-xs text-gray-400">
                                    Máx total no grupo: {group.maxSelect}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      decrementComboGroupProduct(group, item.productId)
                                    }
                                    disabled={qty <= 0}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-300 bg-white font-bold text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    -
                                  </button>

                                  <span className="min-w-[24px] text-center font-bold text-black">
                                    {qty}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      incrementComboGroupProduct(group, item.productId)
                                    }
                                    disabled={totalSelected >= group.maxSelect}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-600 bg-red-600 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-sm text-gray-500">
                            Nenhum produto configurado neste grupo.
                          </p>
                        )}
                      </div>
                    </div>
                  ))
              ) : (
                <div className="rounded-2xl border border-red-200 bg-white p-4 text-sm text-gray-500">
                  Nenhum item encontrado nesta busca do combo.
                </div>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-red-200 bg-white p-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Combo</span>
                <span>R$ {Number(selectedCombo.price).toFixed(2)}</span>
              </div>

              <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
                <span>Adicionais</span>
                <span>R$ {comboAdditionalTotal.toFixed(2)}</span>
              </div>

              <div className="mt-3 flex items-center justify-between text-lg font-bold text-black">
                <span>Total</span>
                <span className="text-red-600">
                  R$ {comboFinalPrice.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={closeComboModal}
                className="flex-1 rounded-xl border border-red-300 bg-white px-4 py-3 font-semibold text-red-600"
              >
                Cancelar
              </button>

              <button
                onClick={confirmComboToCart}
                className="flex-1 rounded-xl border border-red-600 bg-red-600 px-4 py-3 font-semibold text-white"
              >
                Adicionar ao carrinho
              </button>
            </div>
          </div>
        </div>
      )}

      <Link
        href="/carrinho"
        className="fixed bottom-5 right-5 rounded-full border border-red-600 bg-red-600 px-5 py-4 font-bold text-white shadow-lg"
      >
        🛒 {cartCount}
      </Link>
    </main>
  );
}