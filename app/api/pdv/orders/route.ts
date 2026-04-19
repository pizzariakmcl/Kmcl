import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type IncomingItem = {
  productId?: string | null;
  comboId?: string | null;
  type?: "PRODUCT" | "COMBO" | "HALF_HALF";
  name: string;
  unitPrice: number;
  quantity: number;
  notes?: string | null;
};

function num(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePaymentMethod(value?: string | null) {
  const payment = String(value || "").toUpperCase();

  if (payment === "PIX") return "PIX";
  if (payment === "DINHEIRO") return "DINHEIRO";
  if (payment === "DEBITO") return "DEBITO";
  if (payment === "CREDITO") return "CREDITO";

  return "PIX";
}

function generateOrderCode() {
  return `PDV-${Date.now()}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const items: IncomingItem[] = Array.isArray(body?.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Pedido sem itens" },
        { status: 400 }
      );
    }

    const subtotal = items.reduce(
      (acc, item) =>
        acc + num(item.unitPrice) * Math.max(1, num(item.quantity, 1)),
      0
    );

    const deliveryFee = num(body?.deliveryFee);
    const discount = num(body?.discount);
    const total = subtotal + deliveryFee - discount;

    const order = await prisma.order.create({
  data: {
    code: generateOrderCode(),
    status: "NOVO",
    paymentMethod: normalizePaymentMethod(body?.paymentMethod) as
      | "PIX"
      | "DINHEIRO"
      | "DEBITO"
      | "CREDITO",
    changeFor:
      body?.changeFor !== undefined && body?.changeFor !== null
        ? String(body.changeFor)
        : null,
    observation: body?.observation
      ? String(body.observation).trim()
      : null,
    total,

    channel: "LOJA",
    orderType: String(body?.orderType || "DELIVERY"),

    customerId: body?.customerId || null,

    items: {
      create: items.map((item) => {
        const rawProductId =
          item?.productId && String(item.productId).trim() !== ""
            ? String(item.productId).trim()
            : null;

        const isSyntheticProduct =
          !rawProductId ||
          rawProductId.startsWith("half-half-") ||
          item.type === "COMBO" ||
          item.type === "HALF_HALF";

        return {
          productId: isSyntheticProduct ? null : rawProductId,
          name: String(item.name || "Item"),
          price: num(item.unitPrice),
          quantity: Math.max(1, parseInt(String(item.quantity || 1), 10)),
        };
      }),
    },
  },
  include: {
    customer: true,
    items: true,
  },
});
    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    console.error("ERRO AO CRIAR PEDIDO PDV:", error);

    return NextResponse.json(
      {
        error: "Erro ao salvar pedido",
        details:
          process.env.NODE_ENV === "development"
            ? String(error?.message || "Erro desconhecido")
            : undefined,
      },
      { status: 500 }
    );
  }
}