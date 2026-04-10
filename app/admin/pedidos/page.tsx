"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Customer = {
  id: string;
  nome: string;
  whatsapp: string;
  email?: string | null;
  endereco: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  cep: string;
};

type OrderItem = {
  id: string;
  nome: string;
  price: number | string;
  quantity: number;
};

type Order = {
  id: string;
  orderNumber: string;
  totalAmount: number | string;
  paymentMethod: string;
  observacao?: string | null;
  status: "NOVO" | "EM_PREPARO" | "SAIU_PARA_ENTREGA" | "ENTREGUE" | "CANCELADO" | "ENTREGA";
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  archivedAt?: string | null;
  customer?: Customer | null;
  items?: OrderItem[];
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

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("HOJE");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("TODOS");
  const [search, setSearch] = useState("");
  const previousOrdersCount = useRef(0);

  useEffect(() => {
    loadOrders();

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

  async function loadOrders() {
    try {
      const res = await fetch("/api/orders/list", { cache: "no-store" });
      const data = await res.json();

      if (Array.isArray(data)) {
        const currentActiveCount = data.filter(
          (order: Order) => !order.archived
        ).length;

        if (
          previousOrdersCount.current > 0 &&
          currentActiveCount > previousOrdersCount.current
        ) {
          const audio = new Audio("/notification.mp3");
          audio.play().catch(() => {});
        }

        previousOrdersCount.current = currentActiveCount;
        setOrders(data);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      setOrders([]);
    }
  }

  function formatAddress(customer?: Customer | null) {
    if (!customer) return "Cliente não encontrado";

    const complemento = customer.complemento
      ? `, ${customer.complemento}`
      : "";

    return `${customer.endereco}, ${customer.numero}${complemento} - ${customer.bairro}, ${customer.cidade} - CEP: ${customer.cep}`;
  }

  function getWhatsappMessage(order: Order) {
    const nome = order.customer?.nome || "cliente";
    const pedido = order.orderNumber;

    return `Olá, ${nome}! 🛵

Seu pedido ${pedido} saiu para entrega e em breve estará com você.
Agradecemos muito a sua preferência e atenção.

Qualquer dúvida, estamos à disposição!`;
  }

  function openWhatsapp(order: Order) {
    if (!order.customer?.whatsapp) return;

    const phone = order.customer.whatsapp.replace(/\D/g, "");
    const message = getWhatsappMessage(order);
    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank");
  }

  function printOrder(order: Order) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const itemsHtml =
      order.items
        ?.map(
          (item) => `
            <div style="display:flex; justify-content:space-between; gap:8px; margin-bottom:4px;">
              <span>${item.quantity}x ${item.nome}</span>
              <span>R$ ${(Number(item.price) * Number(item.quantity)).toFixed(2)}</span>
            </div>
          `
        )
        .join("") || "";

    printWindow.document.write(`
      <html>
        <head>
          <title>Pedido ${order.orderNumber}</title>
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

          <p><strong>Pedido:</strong> ${order.orderNumber}</p>
          <p><strong>Cliente:</strong> ${order.customer?.nome || ""}</p>
          <p><strong>WhatsApp:</strong> ${order.customer?.whatsapp || ""}</p>
          <p><strong>Endereço:</strong> ${formatAddress(order.customer)}</p>

          <div class="divider"></div>

          <p><strong>Itens:</strong></p>
          ${itemsHtml}

          <div class="divider"></div>

          <p><strong>Total:</strong> R$ ${Number(order.totalAmount).toFixed(2)}</p>
          <p><strong>Pagamento:</strong> ${order.paymentMethod}</p>
          <p><strong>Status:</strong> ${order.status}</p>

          ${order.observacao ? `<p><strong>Obs:</strong> ${order.observacao}</p>` : ""}

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

      const data = await res.json();

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

      const data = await res.json();

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
    ];

    const rows = filteredOrders.map((order) => [
      order.orderNumber,
      order.customer?.nome || "",
      order.customer?.whatsapp || "",
      Number(order.totalAmount).toFixed(2),
      order.paymentMethod,
      order.status,
      order.archived ? "SIM" : "NAO",
      new Date(order.createdAt).toLocaleString("pt-BR"),
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
    startOfWeek.setDate(today.getDate() - today.getDay());
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
      const nome = order.customer?.nome?.toLowerCase() || "";
      const whatsapp = order.customer?.whatsapp?.toLowerCase() || "";
      const number = order.orderNumber?.toLowerCase() || "";

      return nome.includes(term) || whatsapp.includes(term) || number.includes(term);
    });
  }, [periodFilteredOrders, search]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === "TODOS") return searchFilteredOrders;
    return searchFilteredOrders.filter((o) => {
      if (statusFilter === "ENTREGUE") {
        return o.status === "ENTREGUE" || o.status === "ENTREGA";
      }
      return o.status === statusFilter;
    });
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
    return todayOrders.filter(
      (order) => order.status === "ENTREGUE" || order.status === "ENTREGA"
    );
  }, [todayOrders]);

  const canceledTodayOrders = useMemo(() => {
    return todayOrders.filter((order) => order.status === "CANCELADO");
  }, [todayOrders]);

  const totalRevenue = useMemo(() => {
    return deliveredTodayOrders.reduce((acc, order) => {
      return acc + Number(order.totalAmount);
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
          (order.status === "ENTREGUE" || order.status === "ENTREGA") &&
          orderDate.toDateString() === day.toDateString()
        );
      });

      const total = deliveredFromDay.reduce((acc, order) => {
        return acc + Number(order.totalAmount);
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

  const preparoOrders = useMemo(
    () => filteredActiveOrders.filter((order) => order.status === "EM_PREPARO"),
    [filteredActiveOrders]
  );

  const entregaOrders = useMemo(
    () => filteredActiveOrders.filter((order) => order.status === "SAIU_PARA_ENTREGA"),
    [filteredActiveOrders]
  );

  const entregueOrders = useMemo(
    () =>
      filteredActiveOrders.filter(
        (order) => order.status === "ENTREGUE" || order.status === "ENTREGA"
      ),
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
        <p className="mb-1 text-sm font-semibold text-gray-700">Itens:</p>
        <ul className="space-y-1 text-sm text-gray-600">
          {order.items.map((item) => (
            <li key={item.id}>
              {item.quantity}x {item.nome} - R$ {(Number(item.price) * Number(item.quantity)).toFixed(2)}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  function renderOrderCard(order: Order, archivedView = false) {
    return (
      <div key={order.id} className="rounded-xl border bg-white p-4 shadow-sm">
        <p className="mb-1">
          <strong>Pedido:</strong> {order.orderNumber}
        </p>

        <p className="mb-1">
          <strong>Cliente:</strong> {order.customer?.nome || "Não encontrado"}
        </p>

        <p className="mb-1">
          <strong>WhatsApp:</strong> {order.customer?.whatsapp || "Não informado"}
        </p>

        <p className="mb-1">
          <strong>Endereço:</strong> {formatAddress(order.customer)}
        </p>

        {renderItems(order)}

        <p className="mb-1">
          <strong>Total:</strong> R$ {Number(order.totalAmount).toFixed(2)}
        </p>

        <p className="mb-1">
          <strong>Pagamento:</strong> {order.paymentMethod}
        </p>

        <p className="mb-1">
          <strong>Status:</strong> {order.status === "ENTREGA" ? "ENTREGUE" : order.status}
        </p>

        {order.observacao && (
          <p className="mb-1">
            <strong>Obs:</strong> {order.observacao}
          </p>
        )}

        <p className="mb-1">
          <strong>Criado em:</strong>{" "}
          {new Date(order.createdAt).toLocaleString("pt-BR")}
        </p>

        {order.archivedAt && (
          <p className="mb-3 text-sm text-gray-500">
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
                className="rounded bg-gray-600 px-3 py-1 text-white disabled:opacity-50"
              >
                Novo
              </button>

              <button
                onClick={() => updateStatus(order, "EM_PREPARO")}
                disabled={loadingId === order.id}
                className="rounded bg-yellow-600 px-3 py-1 text-white disabled:opacity-50"
              >
                Em preparo
              </button>

              <button
                onClick={() => updateStatus(order, "SAIU_PARA_ENTREGA")}
                disabled={loadingId === order.id}
                className="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-50"
              >
                Saiu para entrega
              </button>

              <button
                onClick={() => updateStatus(order, "ENTREGUE")}
                disabled={loadingId === order.id}
                className="rounded bg-green-600 px-3 py-1 text-white disabled:opacity-50"
              >
                Entregue
              </button>

              <button
                onClick={() => updateStatus(order, "CANCELADO")}
                disabled={loadingId === order.id}
                className="rounded bg-red-600 px-3 py-1 text-white disabled:opacity-50"
              >
                Cancelar
              </button>
            </>
          )}

          {order.customer?.whatsapp && (
            <button
              onClick={() => openWhatsapp(order)}
              className="rounded bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-700 transition"
            >
              WhatsApp
            </button>
          )}

          <button
            onClick={() => printOrder(order)}
            className="rounded bg-black px-3 py-1 text-white"
          >
            Imprimir
          </button>

          <button
            onClick={() => deleteOrder(order.id)}
            disabled={loadingId === order.id}
            className="rounded border border-red-600 px-3 py-1 text-red-600 disabled:opacity-50"
          >
            Excluir
          </button>
        </div>
      </div>
    );
  }

  function renderColumn(title: string, ordersList: Order[], colorClass: string) {
    return (
      <div className="rounded-2xl border bg-gray-50 p-4">
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
            <div className="rounded-lg border border-dashed p-4 text-sm text-gray-500">
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
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mb-6 space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Painel de Pedidos</h1>
          <p className="text-gray-600">
            Acompanhe os pedidos no estilo funil / CRM.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-6">
          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-sm text-gray-500">Pedidos hoje</p>
            <p className="text-2xl font-bold">{todayOrders.length}</p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-sm text-gray-500">Faturamento hoje</p>
            <p className="text-2xl font-bold">
              R$ {totalRevenue.toFixed(2)}
            </p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-sm text-gray-500">Bilhete médio</p>
            <p className="text-2xl font-bold">
              R$ {averageTicket.toFixed(2)}
            </p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-sm text-gray-500">Em andamento</p>
            <p className="text-2xl font-bold">{inProgressOrders.length}</p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-sm text-gray-500">Cancelados hoje</p>
            <p className="text-2xl font-bold">{canceledTodayOrders.length}</p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <p className="text-sm text-gray-500">Arquivados hoje</p>
            <p className="text-2xl font-bold">{archivedTodayCount}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="mb-4">
            <h2 className="text-lg font-bold">Faturamento dos últimos 7 dias</h2>
            <p className="text-sm text-gray-500">
              Só conta pedidos entregues.
            </p>
          </div>

          <div className="flex h-64 items-end gap-3">
            {revenueLast7Days.map((day) => {
              const height = (day.value / maxRevenue) * 100;

              return (
                <div key={day.label} className="flex flex-1 flex-col items-center">
                  <div className="mb-2 text-xs font-medium text-gray-600">
                    R$ {day.value.toFixed(2)}
                  </div>

                  <div className="flex h-48 w-full items-end">
                    <div
                      className="w-full rounded-t-lg bg-blue-600 transition-all"
                      style={{ height: `${height}%` }}
                    />
                  </div>

                  <div className="mt-2 text-sm font-medium text-gray-700">
                    {day.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          <div className="rounded-xl bg-white p-4 shadow">
            <label className="mb-2 block text-sm font-medium text-gray-600">
              Buscar pedido
            </label>
            <input
              type="text"
              placeholder="Cliente, WhatsApp ou nº pedido"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <label className="mb-2 block text-sm font-medium text-gray-600">
              Período
            </label>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
              className="w-full rounded border px-3 py-2"
            >
              <option value="HOJE">Hoje</option>
              <option value="SEMANA">Semana</option>
              <option value="MES">Mês</option>
              <option value="TODOS">Todos</option>
            </select>
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <label className="mb-2 block text-sm font-medium text-gray-600">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full rounded border px-3 py-2"
            >
              <option value="TODOS">Todos</option>
              <option value="NOVO">Novo</option>
              <option value="EM_PREPARO">Em preparo</option>
              <option value="SAIU_PARA_ENTREGA">Saiu para entrega</option>
              <option value="ENTREGUE">Entregue</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>

          <div className="rounded-xl bg-white p-4 shadow flex items-end">
            <button
              onClick={exportCSV}
              className="w-full rounded bg-emerald-600 px-4 py-2 text-white"
            >
              Exportar CSV
            </button>
          </div>

          <div className="rounded-xl bg-white p-4 shadow flex items-end">
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
        <h2 className="mb-4 text-2xl font-bold">Pedidos Ativos</h2>
        <div className="grid gap-4 xl:grid-cols-5">
          {renderColumn("Novos", novoOrders, "bg-gray-700")}
          {renderColumn("Em preparo", preparoOrders, "bg-yellow-600")}
          {renderColumn("Saiu para entrega", entregaOrders, "bg-blue-600")}
          {renderColumn("Entregues", entregueOrders, "bg-green-600")}
          {renderColumn("Cancelados", canceladoOrders, "bg-red-600")}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-2xl font-bold">Histórico / Arquivados</h2>

        {filteredArchivedOrders.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 text-gray-500">
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
    </main>
  );
}