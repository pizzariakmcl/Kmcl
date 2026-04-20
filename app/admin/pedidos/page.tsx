"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Customer = {
  id: string;
  name: string;
  whatsapp: string;
  email?: string | null;
  address?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  cep?: string | null;
};

type OrderItem = {
  id: string;
  name: string;
  price: number | string;
  quantity: number;
};

type Driver = {
  id: string;
  name: string;
  whatsapp: string;
  active?: boolean;
};

type Order = {
  id: string;
  code?: string | null;
  total: number | string;
  paymentMethod: string;
  observation?: string | null;
  status:
    | "NOVO"
    | "EM_PREPARO"
    | "SAIU_PARA_ENTREGA"
    | "ENTREGUE"
    | "CANCELADO";
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  archivedAt?: string | null;
  changeFor?: string | null;
  channel?: string;
  orderType?: string;
  customer?: Customer | null;
  items?: OrderItem[];

  driverId?: string | null;
  driverName?: string | null;
  deliveryBatchId?: string | null;
  deliveryBatchCode?: string | null;
  deliveryRouteOrder?: number | null;
  dispatchedAt?: string | null;
};

type StatusType =
  | "NOVO"
  | "EM_PREPARO"
  | "SAIU_PARA_ENTREGA"
  | "ENTREGUE"
  | "CANCELADO";

type PeriodFilter = "HOJE" | "SEMANA" | "MES" | "TODOS";
type StatusFilter =
  | "TODOS"
  | "NOVO"
  | "EM_PREPARO"
  | "SAIU_PARA_ENTREGA"
  | "ENTREGUE"
  | "CANCELADO";

type RouteMode = "NEAR_TO_FAR" | "FAR_TO_NEAR";

type DispatchPreviewOrder = {
  id: string;
  code: string;
  routeOrder: number;
  total: number;
  paymentMethod: string;
  changeFor?: string | null;
  observation?: string | null;
  customer?: Customer | null;
};

type DispatchPreview = {
  driver: {
    id: string;
    name: string;
    whatsapp: string;
  };
  batchCode: string;
  routeMode: RouteMode;
  mapsUrl: string;
  whatsappMessage: string;
  whatsappUrl: string;
  orders: DispatchPreviewOrder[];
};

const DELAY_MINUTES = 120;

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("HOJE");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("TODOS");
  const [search, setSearch] = useState("");

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [routeMode, setRouteMode] = useState<RouteMode>("NEAR_TO_FAR");
  const [storeAddress, setStoreAddress] = useState(
    "R. dos Secadouros, 292 - Vila Carmosina, São Paulo - SP, 08270-550"
  );
  const [dispatchPreview, setDispatchPreview] = useState<DispatchPreview | null>(null);
  const [creatingDispatch, setCreatingDispatch] = useState(false);
  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverWhatsapp, setNewDriverWhatsapp] = useState("");

  const previousOrdersCount = useRef(0);
  const previousDelayedIds = useRef<string[]>([]);
  const audioUnlockedRef = useRef(false);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    notificationAudioRef.current = new Audio("/notification.mp3");
    notificationAudioRef.current.preload = "auto";

    const unlockAudio = async () => {
      if (audioUnlockedRef.current) return;
      try {
        if (!notificationAudioRef.current) return;
        notificationAudioRef.current.volume = 1;
        await notificationAudioRef.current.play();
        notificationAudioRef.current.pause();
        notificationAudioRef.current.currentTime = 0;
        audioUnlockedRef.current = true;
      } catch {
        // navegador pode bloquear até a primeira interação válida
      }
    };

    const handleUserGesture = () => {
      unlockAudio();
    };

    window.addEventListener("click", handleUserGesture, { passive: true });
    window.addEventListener("touchstart", handleUserGesture, { passive: true });
    window.addEventListener("keydown", handleUserGesture);

    return () => {
      window.removeEventListener("click", handleUserGesture);
      window.removeEventListener("touchstart", handleUserGesture);
      window.removeEventListener("keydown", handleUserGesture);
    };
  }, []);

  useEffect(() => {
    loadOrders();
    loadDrivers();

    const interval = setInterval(async () => {
      try {
        await fetch("/api/orders/archive", {
          method: "POST",
        });
      } catch (error) {
        console.error("Erro ao arquivar automaticamente:", error);
      }

      await loadOrders();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  async function playNotificationSound() {
    try {
      if (!notificationAudioRef.current) {
        notificationAudioRef.current = new Audio("/notification.mp3");
      }

      notificationAudioRef.current.pause();
      notificationAudioRef.current.currentTime = 0;
      await notificationAudioRef.current.play();
    } catch (error) {
      console.warn("Som bloqueado ou arquivo não encontrado:", error);
    }
  }

  function isDelayedOrder(order: Order) {
    if (order.archived) return false;
    if (order.status !== "EM_PREPARO") return false;

    const updatedAtDate = new Date(order.updatedAt || order.createdAt);
    const now = new Date();

    const diffMs = now.getTime() - updatedAtDate.getTime();
    const diffMinutes = diffMs / (1000 * 60);

    return diffMinutes >= DELAY_MINUTES;
  }

  async function loadOrders() {
    try {
      const res = await fetch("/api/orders/list", { cache: "no-store" });
      const data = await res.json();

      if (Array.isArray(data)) {
        const currentActiveCount = data.filter(
          (order: Order) => !order.archived
        ).length;

        const delayedIdsNow = data
          .filter((order: Order) => isDelayedOrder(order))
          .map((order: Order) => order.id);

        const previousDelayedSet = new Set(previousDelayedIds.current);
        const hasNewDelayedOrder = delayedIdsNow.some(
          (id) => !previousDelayedSet.has(id)
        );

        if (
          previousOrdersCount.current > 0 &&
          currentActiveCount > previousOrdersCount.current
        ) {
          await playNotificationSound();
        }

        if (hasNewDelayedOrder) {
          await playNotificationSound();
          alert("Atenção: existe pedido em atraso no funil.");
        }

        previousOrdersCount.current = currentActiveCount;
        previousDelayedIds.current = delayedIdsNow;
        setOrders(data);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      setOrders([]);
    }
  }

  async function loadDrivers() {
    try {
      const res = await fetch("/api/drivers/list", { cache: "no-store" });
      const data = await res.json();
      setDrivers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao buscar motoqueiros:", error);
      setDrivers([]);
    }
  }

  function getOrderCode(order: Order | DispatchPreviewOrder) {
    return order.code || `PED-${String(order.id).slice(0, 8)}`;
  }

  function toMoney(value: unknown) {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === "string") {
      const cleaned = value.replace(/\s/g, "").replace("R$", "").trim();

      if (!cleaned) return 0;

      const hasComma = cleaned.includes(",");
      const normalized = hasComma
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned;

      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  }

  function getItemsTotal(order: Order) {
    if (!order.items || order.items.length === 0) return 0;

    return order.items.reduce((acc, item) => {
      return acc + toMoney(item.price) * Number(item.quantity || 0);
    }, 0);
  }

  function getOrderTotal(order: Order) {
    const savedTotal = toMoney(order.total);
    const itemsTotal = getItemsTotal(order);

    if (savedTotal > 0) return savedTotal;
    if (itemsTotal > 0) return itemsTotal;
    return 0;
  }

  function formatAddress(customer?: Customer | null) {
    if (!customer) return "Cliente não encontrado";

    const address = String(customer.address || "").trim();
    const number = String(customer.number || "").trim();
    const complement = String(customer.complement || "").trim();
    const neighborhood = String(customer.neighborhood || "").trim();
    const city = String(customer.city || "").trim();
    const cep = String(customer.cep || "").trim();

    const line1 = [address, number].filter(Boolean).join(", ");
    const line1WithComplement = [line1, complement].filter(Boolean).join(" - ");
    const line2 = [neighborhood, city].filter(Boolean).join(" - ");

    const finalParts = [
      line1WithComplement,
      line2,
      cep ? `CEP: ${cep}` : "",
    ].filter(Boolean);

    return finalParts.length > 0
      ? finalParts.join(" | ")
      : "Endereço não informado";
  }

  function getWhatsappMessage(order: Order) {
    const nome = order.customer?.name || "cliente";
    const pedido = getOrderCode(order);

    return `Olá, ${nome}! 🛵

Seu pedido ${pedido} saiu para entrega e em breve estará com você.
Agradecemos muito a sua preferência.

Qualquer dúvida, estamos à disposição!`;
  }

  function openWhatsapp(order: Order) {
    if (!order.customer?.whatsapp) return;

    const phone = order.customer.whatsapp.replace(/\D/g, "");
    const phoneWithCountry = phone.startsWith("55") ? phone : `55${phone}`;
    const message = getWhatsappMessage(order);
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank");
  }

  function printOrder(order: Order) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const orderTotal = getOrderTotal(order);

    const itemsHtml =
      order.items
        ?.map(
          (item) => `
            <div style="display:flex; justify-content:space-between; gap:8px; margin-bottom:4px;">
              <span>${item.quantity}x ${item.name}</span>
              <span>R$ ${(toMoney(item.price) * Number(item.quantity)).toFixed(2)}</span>
            </div>
          `
        )
        .join("") || "";

    printWindow.document.write(`
      <html>
        <head>
          <title>Pedido ${getOrderCode(order)}</title>
          <style>
            body {
              font-family: monospace;
              width: 300px;
              margin: 0;
              padding: 10px;
              color: #000;
            }
            h2, p {
              margin: 0 0 6px 0;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 8px 0;
            }
            .center {
              text-align: center;
            }
          </style>
        </head>
        <body>
          <h2 class="center">Pizzaria KMCL</h2>
          <p class="center">Recibo do Pedido</p>

          <div class="divider"></div>

          <p><strong>Pedido:</strong> ${getOrderCode(order)}</p>
          <p><strong>Cliente:</strong> ${order.customer?.name || ""}</p>
          <p><strong>WhatsApp:</strong> ${order.customer?.whatsapp || ""}</p>
          <p><strong>Endereço:</strong> ${formatAddress(order.customer)}</p>

          <div class="divider"></div>

          <p><strong>Itens:</strong></p>
          ${itemsHtml}

          <div class="divider"></div>

          <p><strong>Total:</strong> R$ ${orderTotal.toFixed(2)}</p>
          <p><strong>Pagamento:</strong> ${order.paymentMethod}</p>
          <p><strong>Status:</strong> ${order.status}</p>

          ${order.changeFor ? `<p><strong>Troco para:</strong> R$ ${order.changeFor}</p>` : ""}
          ${order.observation ? `<p><strong>Obs:</strong> ${order.observation}</p>` : ""}

          <div class="divider"></div>

          <p class="center">Obrigado pela preferência!</p>

          <script>
            window.print();
            window.onafterprint = () => window.close();
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  async function updateStatus(order: Order, status: StatusType) {
    try {
      setLoadingId(order.id);

      const res = await fetch("/api/orders/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: order.id,
          status,
        }),
      });

      await res.json().catch(() => null);

      if (!res.ok) {
        alert("Erro ao atualizar status");
        return;
      }

      await loadOrders();

      if (status === "SAIU_PARA_ENTREGA") {
        openWhatsapp(order);
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao atualizar status");
    } finally {
      setLoadingId(null);
    }
  }

  async function deleteOrder(orderId: string) {
    try {
      const confirmed = confirm("Tem certeza que deseja excluir este pedido?");
      if (!confirmed) return;

      setLoadingId(orderId);

      const res = await fetch("/api/orders/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId }),
      });

      await res.json().catch(() => null);

      if (!res.ok) {
        alert("Erro ao excluir pedido");
        return;
      }

      await loadOrders();
    } catch (error) {
      console.error("Erro ao excluir pedido:", error);
      alert("Erro ao excluir pedido");
    } finally {
      setLoadingId(null);
    }
  }

  function toggleOrderSelection(orderId: string) {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  }

  function clearDispatchState() {
    setDispatchModalOpen(false);
    setSelectedDriverId("");
    setRouteMode("NEAR_TO_FAR");
    setDispatchPreview(null);
    setSelectedOrderIds([]);
    setCreatingDispatch(false);
  }

  async function createDriver() {
    try {
      if (!newDriverName.trim()) {
        alert("Informe o nome do motoqueiro");
        return;
      }

      if (!newDriverWhatsapp.trim()) {
        alert("Informe o WhatsApp do motoqueiro");
        return;
      }

      const res = await fetch("/api/drivers/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newDriverName,
          whatsapp: newDriverWhatsapp,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Erro ao cadastrar motoqueiro");
        return;
      }

      setNewDriverName("");
      setNewDriverWhatsapp("");
      await loadDrivers();
      setSelectedDriverId(data.id);
    } catch (error) {
      console.error("Erro ao criar motoqueiro:", error);
      alert("Erro ao criar motoqueiro");
    }
  }

  async function generateDispatchPreview() {
    try {
      if (!selectedOrderIds.length) {
        alert("Selecione ao menos um pedido");
        return;
      }

      if (!selectedDriverId) {
        alert("Selecione um motoqueiro");
        return;
      }

      setCreatingDispatch(true);

      const res = await fetch("/api/orders/dispatch-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderIds: selectedOrderIds,
          driverId: selectedDriverId,
          routeMode,
          storeAddress,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Erro ao gerar preview");
        return;
      }

      setDispatchPreview(data);
    } catch (error) {
      console.error("Erro ao gerar preview:", error);
      alert("Erro ao gerar preview");
    } finally {
      setCreatingDispatch(false);
    }
  }

  async function confirmDispatch() {
    try {
      if (!dispatchPreview) {
        alert("Gere o preview antes de confirmar");
        return;
      }

      setCreatingDispatch(true);

      const res = await fetch("/api/orders/dispatch-confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderIds: dispatchPreview.orders.map((order) => order.id),
          orderedIds: dispatchPreview.orders.map((order) => order.id),
          driverId: dispatchPreview.driver.id,
          routeMode: dispatchPreview.routeMode,
          mapsUrl: dispatchPreview.mapsUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Erro ao confirmar despacho");
        return;
      }

      if (dispatchPreview.whatsappUrl) {
        window.open(dispatchPreview.whatsappUrl, "_blank");
      }

      await loadOrders();
      clearDispatchState();
    } catch (error) {
      console.error("Erro ao confirmar despacho:", error);
      alert("Erro ao confirmar despacho");
    } finally {
      setCreatingDispatch(false);
    }
  }

  function exportCSV() {
    const header = [
      "Pedido",
      "Cliente",
      "WhatsApp",
      "Total",
      "Pagamento",
      "Status",
      "Arquivado",
      "Criado em",
      "Motoqueiro",
      "Lote",
      "Ordem da rota",
    ];

    const rows = filteredOrders.map((order) => [
      getOrderCode(order),
      order.customer?.name || "",
      order.customer?.whatsapp || "",
      getOrderTotal(order).toFixed(2),
      order.paymentMethod,
      order.status,
      order.archived ? "SIM" : "NAO",
      new Date(order.createdAt).toLocaleString("pt-BR"),
      order.driverName || "",
      order.deliveryBatchCode || "",
      order.deliveryRouteOrder || "",
    ]);

    const csvContent = [header, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "pedidos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function isToday(dateString: string) {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  function isThisWeek(dateString: string) {
    const date = new Date(dateString);
    const today = new Date();

    const startOfWeek = new Date(today);
    const day = startOfWeek.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    startOfWeek.setDate(today.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    return date >= startOfWeek && date < endOfWeek;
  }

  function isThisMonth(dateString: string) {
    const date = new Date(dateString);
    const today = new Date();

    return (
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  function getDayLabel(date: Date) {
    return date.toLocaleDateString("pt-BR", { weekday: "short" });
  }

  function canSelectForDispatch(order: Order) {
    return !order.archived && order.status === "EM_PREPARO";
  }

  const activeOrders = useMemo(() => {
    return orders.filter((order) => !order.archived);
  }, [orders]);

  const archivedOrders = useMemo(() => {
    return orders.filter((order) => order.archived);
  }, [orders]);

  const periodFilteredOrders = useMemo(() => {
    const baseOrders = orders;

    if (periodFilter === "TODOS") return baseOrders;
    if (periodFilter === "HOJE") return baseOrders.filter((o) => isToday(o.createdAt));
    if (periodFilter === "SEMANA") return baseOrders.filter((o) => isThisWeek(o.createdAt));
    if (periodFilter === "MES") return baseOrders.filter((o) => isThisMonth(o.createdAt));

    return baseOrders;
  }, [orders, periodFilter]);

  const searchFilteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return periodFilteredOrders;

    return periodFilteredOrders.filter((order) => {
      const nome = order.customer?.name?.toLowerCase() || "";
      const whatsapp = order.customer?.whatsapp?.toLowerCase() || "";
      const number = getOrderCode(order).toLowerCase();
      const driverName = order.driverName?.toLowerCase() || "";

      return (
        nome.includes(term) ||
        whatsapp.includes(term) ||
        number.includes(term) ||
        driverName.includes(term)
      );
    });
  }, [periodFilteredOrders, search]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === "TODOS") return searchFilteredOrders;
    return searchFilteredOrders.filter((o) => o.status === statusFilter);
  }, [searchFilteredOrders, statusFilter]);

  const filteredActiveOrders = useMemo(() => {
    return filteredOrders.filter((order) => !order.archived);
  }, [filteredOrders]);

  const filteredArchivedOrders = useMemo(() => {
    return filteredOrders.filter((order) => order.archived);
  }, [filteredOrders]);

  const todayOrders = useMemo(() => {
    return orders.filter((order) => isToday(order.createdAt));
  }, [orders]);

  const deliveredTodayOrders = useMemo(() => {
    return todayOrders.filter((order) => order.status === "ENTREGUE");
  }, [todayOrders]);

  const canceledTodayOrders = useMemo(() => {
    return todayOrders.filter((order) => order.status === "CANCELADO");
  }, [todayOrders]);

  const totalRevenue = useMemo(() => {
    return deliveredTodayOrders.reduce((acc, order) => {
      return acc + getOrderTotal(order);
    }, 0);
  }, [deliveredTodayOrders]);

  const averageTicket = useMemo(() => {
    if (deliveredTodayOrders.length === 0) return 0;
    return totalRevenue / deliveredTodayOrders.length;
  }, [deliveredTodayOrders, totalRevenue]);

  const inProgressOrders = useMemo(() => {
    return activeOrders.filter(
      (o) =>
        o.status === "NOVO" ||
        o.status === "EM_PREPARO" ||
        o.status === "SAIU_PARA_ENTREGA"
    );
  }, [activeOrders]);

  const archivedTodayCount = useMemo(() => {
    return archivedOrders.filter((order) => isToday(order.createdAt)).length;
  }, [archivedOrders]);

  const revenueLast7Days = useMemo(() => {
    const result: { label: string; value: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const dayLabel = getDayLabel(day);

      const deliveredFromDay = orders.filter((order) => {
        const orderDate = new Date(order.createdAt);
        return (
          order.status === "ENTREGUE" &&
          orderDate.toDateString() === day.toDateString()
        );
      });

      const total = deliveredFromDay.reduce((acc, order) => {
        return acc + getOrderTotal(order);
      }, 0);

      result.push({
        label: dayLabel,
        value: total,
      });
    }

    return result;
  }, [orders]);

  const maxRevenue = useMemo(() => {
    const max = Math.max(...revenueLast7Days.map((d) => d.value), 0);
    return max === 0 ? 1 : max;
  }, [revenueLast7Days]);

  const novoOrders = useMemo(
    () => filteredActiveOrders.filter((order) => order.status === "NOVO"),
    [filteredActiveOrders]
  );

  const atrasoOrders = useMemo(
    () => filteredActiveOrders.filter((order) => isDelayedOrder(order)),
    [filteredActiveOrders]
  );

  const preparoOrders = useMemo(
    () =>
      filteredActiveOrders.filter(
        (order) => order.status === "EM_PREPARO" && !isDelayedOrder(order)
      ),
    [filteredActiveOrders]
  );

  const entregaOrders = useMemo(
    () => filteredActiveOrders.filter((order) => order.status === "SAIU_PARA_ENTREGA"),
    [filteredActiveOrders]
  );

  const entregueOrders = useMemo(
    () => filteredActiveOrders.filter((order) => order.status === "ENTREGUE"),
    [filteredActiveOrders]
  );

  const canceladoOrders = useMemo(
    () => filteredActiveOrders.filter((order) => order.status === "CANCELADO"),
    [filteredActiveOrders]
  );

  function renderItems(order: Order) {
    if (!order.items || order.items.length === 0) return null;

    return (
      <div className="mb-2">
        <p className="mb-1 text-sm font-semibold text-black">Itens:</p>
        <ul className="space-y-1 text-sm text-black">
          {order.items.map((item) => (
            <li key={item.id}>
              {item.quantity}x {item.name} - R$ {(toMoney(item.price) * Number(item.quantity)).toFixed(2)}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  function getDelayText(order: Order) {
    if (!isDelayedOrder(order)) return null;

    const baseDate = new Date(order.updatedAt || order.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - baseDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    return `${diffMinutes} min em preparo`;
  }

  function renderOrderCard(order: Order, archivedView = false) {
    const delayText = getDelayText(order);

    return (
      <div
        key={order.id}
        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="mb-1 text-black">
              <strong>Pedido:</strong> {getOrderCode(order)}
            </p>
          </div>

          {canSelectForDispatch(order) && !archivedView && (
            <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-2 py-1 text-sm text-black">
              <input
                type="checkbox"
                checked={selectedOrderIds.includes(order.id)}
                onChange={() => toggleOrderSelection(order.id)}
              />
              Selecionar
            </label>
          )}
        </div>

        <p className="mb-1 text-black">
          <strong>Cliente:</strong> {order.customer?.name || "Não encontrado"}
        </p>

        <p className="mb-1 text-black">
          <strong>WhatsApp:</strong> {order.customer?.whatsapp || "Não informado"}
        </p>

        <p className="mb-1 text-black">
          <strong>Endereço:</strong> {formatAddress(order.customer)}
        </p>

        <p className="mb-1 text-black">
          <strong>Origem:</strong>{" "}
          <span
            className={`rounded px-2 py-1 text-xs font-bold text-white ${
              order.channel === "LOJA" ? "bg-purple-600" : "bg-blue-600"
            }`}
          >
            {order.channel === "LOJA" ? "Loja / Atendente" : "Online"}
          </span>
        </p>

        <p className="mb-1 text-black">
          <strong>Tipo:</strong>{" "}
          {order.orderType === "PICKUP"
            ? "Retirada"
            : order.orderType === "DINE_IN"
            ? "Consumir no local"
            : "Entrega"}
        </p>

        {renderItems(order)}

        <p className="mb-1 text-black">
          <strong>Total:</strong> R$ {getOrderTotal(order).toFixed(2)}
        </p>

        <p className="mb-1 text-black">
          <strong>Pagamento:</strong> {order.paymentMethod}
        </p>

        {order.changeFor && (
          <p className="mb-1 text-black">
            <strong>Troco para:</strong> R$ {order.changeFor}
          </p>
        )}

        <p className="mb-1 text-black">
          <strong>Status:</strong> {order.status}
        </p>

        {order.driverName && (
          <p className="mb-1 text-black">
            <strong>Motoqueiro:</strong> {order.driverName}
          </p>
        )}

        {order.deliveryBatchCode && (
          <p className="mb-1 text-black">
            <strong>Lote:</strong> {order.deliveryBatchCode}
          </p>
        )}

        {order.deliveryRouteOrder && (
          <p className="mb-1 text-black">
            <strong>Ordem da rota:</strong> {order.deliveryRouteOrder}
          </p>
        )}

        {delayText && (
          <p className="mb-1 font-semibold text-red-600">
            <strong>Atraso:</strong> {delayText}
          </p>
        )}

        {order.observation && (
          <p className="mb-1 text-black">
            <strong>Obs:</strong> {order.observation}
          </p>
        )}

        <p className="mb-1 text-black">
          <strong>Criado em:</strong>{" "}
          {new Date(order.createdAt).toLocaleString("pt-BR")}
        </p>

        {order.archivedAt && (
          <p className="mb-3 text-sm text-black">
            <strong>Arquivado em:</strong>{" "}
            {new Date(order.archivedAt).toLocaleString("pt-BR")}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {!archivedView && (
            <>
              <button
                onClick={() => updateStatus(order, "NOVO")}
                disabled={loadingId === order.id}
                className="rounded-lg bg-gray-700 px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                Novo
              </button>

              <button
                onClick={() => updateStatus(order, "EM_PREPARO")}
                disabled={loadingId === order.id}
                className="rounded-lg bg-yellow-600 px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                Em preparo
              </button>

              <button
                onClick={() => updateStatus(order, "SAIU_PARA_ENTREGA")}
                disabled={loadingId === order.id}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                Saiu para entrega
              </button>

              <button
                onClick={() => updateStatus(order, "ENTREGUE")}
                disabled={loadingId === order.id}
                className="rounded-lg bg-green-600 px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                Entregue
              </button>

              <button
                onClick={() => updateStatus(order, "CANCELADO")}
                disabled={loadingId === order.id}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                Cancelar
              </button>
            </>
          )}

          {order.customer?.whatsapp && (
            <button
              onClick={() => openWhatsapp(order)}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white transition hover:bg-emerald-700"
            >
              WhatsApp
            </button>
          )}

          <button
            onClick={() => printOrder(order)}
            className="rounded-lg bg-black px-3 py-2 text-sm text-white"
          >
            Imprimir
          </button>

          <button
            onClick={() => deleteOrder(order.id)}
            disabled={loadingId === order.id}
            className="rounded-lg border border-red-600 px-3 py-2 text-sm text-red-600 disabled:opacity-50"
          >
            Excluir
          </button>
        </div>
      </div>
    );
  }

  function renderColumn(title: string, ordersList: Order[], colorClass: string) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <div className={`mb-4 rounded-lg px-3 py-2 text-white ${colorClass}`}>
          <div className="flex items-center justify-between">
            <h2 className="font-bold">{title}</h2>
            <span className="rounded bg-white/20 px-2 py-1 text-sm">
              {ordersList.length}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {ordersList.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-black">
              Nenhum pedido nesta etapa.
            </div>
          ) : (
            ordersList.map((order) => renderOrderCard(order))
          )}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-3 text-black md:p-6">
      <div className="mb-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-black md:text-3xl">Painel de Pedidos</h1>
          <p className="text-black">
            Acompanhe os pedidos no estilo funil / CRM.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-sm text-black">Pedidos hoje</p>
            <p className="text-2xl font-bold text-black">{todayOrders.length}</p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-sm text-black">Faturamento hoje</p>
            <p className="text-2xl font-bold text-black">
              R$ {totalRevenue.toFixed(2)}
            </p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-sm text-black">Bilhete médio</p>
            <p className="text-2xl font-bold text-black">
              R$ {averageTicket.toFixed(2)}
            </p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-sm text-black">Em andamento</p>
            <p className="text-2xl font-bold text-black">{inProgressOrders.length}</p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-sm text-black">Cancelados hoje</p>
            <p className="text-2xl font-bold text-black">{canceledTodayOrders.length}</p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-sm text-black">Arquivados hoje</p>
            <p className="text-2xl font-bold text-black">{archivedTodayCount}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-black">Faturamento dos últimos 7 dias</h2>
            <p className="text-sm text-black">
              Só conta pedidos entregues.
            </p>
          </div>

          <div className="flex h-64 items-end gap-2 overflow-x-auto">
            {revenueLast7Days.map((day) => {
              const height = (day.value / maxRevenue) * 100;

              return (
                <div key={day.label} className="flex min-w-[44px] flex-1 flex-col items-center">
                  <div className="mb-2 text-xs font-medium text-black">
                    R$ {day.value.toFixed(2)}
                  </div>

                  <div className="flex h-48 w-full items-end">
                    <div
                      className="w-full rounded-t-lg bg-blue-600 transition-all"
                      style={{ height: `${height}%` }}
                    />
                  </div>

                  <div className="mt-2 text-sm font-medium text-black">
                    {day.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl bg-white p-4 shadow">
            <label className="mb-2 block text-sm font-medium text-black">
              Buscar pedido
            </label>
            <input
              type="text"
              placeholder="Cliente, WhatsApp, nº pedido, motoqueiro"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded border px-3 py-2 text-black"
            />
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <label className="mb-2 block text-sm font-medium text-black">
              Período
            </label>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
              className="w-full rounded border px-3 py-2 text-black"
            >
              <option value="HOJE">Hoje</option>
              <option value="SEMANA">Semana</option>
              <option value="MES">Mês</option>
              <option value="TODOS">Todos</option>
            </select>
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <label className="mb-2 block text-sm font-medium text-black">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full rounded border px-3 py-2 text-black"
            >
              <option value="TODOS">Todos</option>
              <option value="NOVO">Novo</option>
              <option value="EM_PREPARO">Em preparo</option>
              <option value="SAIU_PARA_ENTREGA">Saiu para entrega</option>
              <option value="ENTREGUE">Entregue</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <button
              onClick={exportCSV}
              className="w-full rounded bg-emerald-600 px-4 py-2 text-white"
            >
              Exportar CSV
            </button>
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <button
              onClick={() => {
                setSearch("");
                setPeriodFilter("HOJE");
                setStatusFilter("TODOS");
              }}
              className="w-full rounded bg-black px-4 py-2 text-white"
            >
              Limpar filtros
            </button>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-4 text-2xl font-bold text-black">Pedidos Ativos</h2>
        <div className="grid gap-4 xl:grid-cols-6">
          {renderColumn("Novos", novoOrders, "bg-gray-700")}
          {renderColumn("Em preparo", preparoOrders, "bg-yellow-600")}
          {renderColumn("Atraso", atrasoOrders, "bg-red-700")}
          {renderColumn("Saiu para entrega", entregaOrders, "bg-blue-600")}
          {renderColumn("Entregues", entregueOrders, "bg-green-600")}
          {renderColumn("Cancelados", canceladoOrders, "bg-red-500")}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-2xl font-bold text-black">Histórico / Arquivados</h2>

        {filteredArchivedOrders.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 text-black">
            Nenhum pedido arquivado encontrado.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredArchivedOrders.map((order) =>
              renderOrderCard(order, true)
            )}
          </div>
        )}
      </div>

      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-4 left-1/2 z-50 flex w-[95%] max-w-xl -translate-x-1/2 flex-wrap items-center justify-center gap-3 rounded-2xl bg-black px-4 py-3 text-white shadow-2xl">
          <span className="text-sm font-medium">
            {selectedOrderIds.length} pedido(s) selecionado(s)
          </span>

          <button
            onClick={() => setDispatchModalOpen(true)}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold"
          >
            Despachar pedidos
          </button>

          <button
            onClick={() => setSelectedOrderIds([])}
            className="rounded border border-white/30 px-4 py-2 text-sm"
          >
            Limpar
          </button>
        </div>
      )}

      {dispatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 md:p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-4 text-black shadow-2xl md:p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold md:text-2xl">Despachar pedidos</h2>
                <p className="text-sm text-black">
                  Escolha o motoqueiro, gere a rota e confirme a saída.
                </p>
              </div>

              <button
                onClick={clearDispatchState}
                className="rounded bg-black px-4 py-2 text-white"
              >
                Fechar
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="rounded-xl border p-4">
                  <h3 className="mb-3 font-bold">Motoqueiro</h3>

                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="mb-3 w-full rounded border px-3 py-2 text-black"
                  >
                    <option value="">Selecione</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name} - {driver.whatsapp}
                      </option>
                    ))}
                  </select>

                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Novo motoqueiro"
                      value={newDriverName}
                      onChange={(e) => setNewDriverName(e.target.value)}
                      className="rounded border px-3 py-2 text-black"
                    />

                    <input
                      type="text"
                      placeholder="WhatsApp"
                      value={newDriverWhatsapp}
                      onChange={(e) => setNewDriverWhatsapp(e.target.value)}
                      className="rounded border px-3 py-2 text-black"
                    />
                  </div>

                  <button
                    onClick={createDriver}
                    className="mt-3 rounded bg-blue-600 px-4 py-2 text-white"
                  >
                    Cadastrar motoqueiro
                  </button>
                </div>

                <div className="rounded-xl border p-4">
                  <h3 className="mb-3 font-bold">Rota</h3>

                  <label className="mb-2 block text-sm font-medium text-black">
                    Endereço da pizzaria
                  </label>
                  <input
                    type="text"
                    value={storeAddress}
                    onChange={(e) => setStoreAddress(e.target.value)}
                    className="mb-3 w-full rounded border px-3 py-2 text-black"
                  />

                  <label className="mb-2 block text-sm font-medium text-black">
                    Ordem
                  </label>
                  <select
                    value={routeMode}
                    onChange={(e) =>
                      setRouteMode(e.target.value as RouteMode)
                    }
                    className="w-full rounded border px-3 py-2 text-black"
                  >
                    <option value="NEAR_TO_FAR">Mais perto → mais longe</option>
                    <option value="FAR_TO_NEAR">Mais longe → mais perto</option>
                  </select>

                  <button
                    onClick={generateDispatchPreview}
                    disabled={creatingDispatch}
                    className="mt-4 rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
                  >
                    Gerar preview
                  </button>
                </div>

                <div className="rounded-xl border p-4">
                  <h3 className="mb-3 font-bold">Pedidos selecionados</h3>

                  <div className="space-y-2 text-sm">
                    {orders
                      .filter((order) => selectedOrderIds.includes(order.id))
                      .map((order) => (
                        <div key={order.id} className="rounded border p-2">
                          <p><strong>{getOrderCode(order)}</strong></p>
                          <p>{order.customer?.name || "Sem cliente"}</p>
                          <p>{formatAddress(order.customer)}</p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border p-4">
                  <h3 className="mb-3 font-bold">Preview do despacho</h3>

                  {!dispatchPreview ? (
                    <p className="text-sm text-black">
                      Gere o preview para ver a rota e a mensagem.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded bg-gray-50 p-3 text-sm">
                        <p><strong>Lote:</strong> {dispatchPreview.batchCode}</p>
                        <p><strong>Motoqueiro:</strong> {dispatchPreview.driver.name}</p>
                        <p>
                          <strong>Ordem:</strong>{" "}
                          {dispatchPreview.routeMode === "NEAR_TO_FAR"
                            ? "Mais perto → mais longe"
                            : "Mais longe → mais perto"}
                        </p>
                      </div>

                      <div className="space-y-2">
                        {dispatchPreview.orders.map((order) => (
                          <div key={order.id} className="rounded border p-3 text-sm">
                            <p>
                              <strong>
                                {order.routeOrder}. {order.code}
                              </strong>
                            </p>
                            <p>{order.customer?.name}</p>
                            <p>{formatAddress(order.customer)}</p>
                            <p>Pagamento: {order.paymentMethod}</p>
                            <p>Total: R$ {Number(order.total || 0).toFixed(2)}</p>
                            {order.changeFor && <p>Troco para: {order.changeFor}</p>}
                          </div>
                        ))}
                      </div>

                      {dispatchPreview.mapsUrl && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => window.open(dispatchPreview.mapsUrl, "_blank")}
                            className="rounded bg-blue-600 px-4 py-2 text-white"
                          >
                            Abrir rota no Maps
                          </button>

                          <button
                            onClick={() => navigator.clipboard.writeText(dispatchPreview.mapsUrl)}
                            className="rounded border px-4 py-2"
                          >
                            Copiar link da rota
                          </button>
                        </div>
                      )}

                      <div>
                        <h4 className="mb-2 font-semibold">Mensagem do WhatsApp</h4>
                        <textarea
                          readOnly
                          value={dispatchPreview.whatsappMessage}
                          className="min-h-[260px] w-full rounded border p-3 text-sm text-black"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {dispatchPreview.whatsappUrl && (
                          <button
                            onClick={() => window.open(dispatchPreview.whatsappUrl, "_blank")}
                            className="rounded bg-emerald-600 px-4 py-2 text-white"
                          >
                            Abrir WhatsApp do motoqueiro
                          </button>
                        )}

                        <button
                          onClick={confirmDispatch}
                          disabled={creatingDispatch}
                          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
                        >
                          Confirmar despacho
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}