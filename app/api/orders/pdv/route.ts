import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type IncomingItem = {
  productId?: string | null;
  comboId?: string | null;
  type?: "PRODUCT" | "COMBO";
  name: string;
  unitPrice: number;
  quantity: number;
  notes?: string | null;
};

function num(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function onlyDigits(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
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
      (acc, item) => acc + num(item.unitPrice) * Math.max(1, num(item.quantity, 1)),
      0
    );

    const deliveryFee = num(body?.deliveryFee);
    const discount = num(body?.discount);
    const total = subtotal + deliveryFee - discount;

    const order = await prisma.pdvOrder.create({
      data: {
        customerId: body?.customerId || null,
        channel: "BALCAO",
        orderType: String(body?.orderType || "DELIVERY"),
        status: "OPEN",
        customerName: body?.customerName
          ? String(body.customerName).trim()
          : null,
        customerCpf: onlyDigits(body?.customerCpf) || null,
        customerPhone: onlyDigits(body?.customerPhone) || null,
        cep: onlyDigits(body?.cep) || null,
        address: body?.address ? String(body.address).trim() : null,
        number: body?.number ? String(body.number).trim() : null,
        complement: body?.complement ? String(body.complement).trim() : null,
        neighborhood: body?.neighborhood
          ? String(body.neighborhood).trim()
          : null,
        city: body?.city ? String(body.city).trim() : null,
        reference: body?.reference ? String(body.reference).trim() : null,
        notes: body?.observation ? String(body.observation).trim() : null,
        paymentMethod: body?.paymentMethod
          ? String(body.paymentMethod)
          : null,
        changeFor:
          body?.changeFor !== undefined && body?.changeFor !== null
            ? num(body.changeFor)
            : null,
        subtotal,
        deliveryFee,
        discount,
        total,
        items: {
          create: items.map((item) => ({
            productId: item.productId || item.comboId || null,
            name: String(item.name),
            unitPrice: num(item.unitPrice),
            quantity: Math.max(1, parseInt(String(item.quantity || 1), 10)),
            totalPrice:
              num(item.unitPrice) *
              Math.max(1, parseInt(String(item.quantity || 1), 10)),
            notes: item.notes ? String(item.notes).trim() : null,
          })),
        },
      },
      include: {
        items: true,
        customer: true,
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("ERRO AO CRIAR PEDIDO PDV:", error);

    return NextResponse.json(
      { error: "Erro ao salvar pedido" },
      { status: 500 }
    );
  }
}