import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentMethod, OrderStatus } from "@prisma/client";

function generateOrderCode() {
  return `PED-${Date.now()}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const customer = body?.customer || {};
    const items = Array.isArray(body?.items) ? body.items : [];

    const customerName = String(customer?.name || "").trim();
    const customerWhatsapp = String(customer?.whatsapp || "").trim();
    const customerEmail =
      customer?.email && String(customer.email).trim() !== ""
        ? String(customer.email).trim()
        : null;

    const observation =
      body?.observation && String(body.observation).trim() !== ""
        ? String(body.observation).trim()
        : null;

    const totalAmount = Number(body?.totalAmount || 0);

    // 🔥 CORREÇÃO DO PAYMENT METHOD
    const paymentMethodRaw = String(body?.paymentMethod || "PIX")
      .trim()
      .toUpperCase();

    const allowedPaymentMethods: PaymentMethod[] = [
      "PIX",
      "DINHEIRO",
      "DEBITO",
      "CREDITO",
    ];

    const paymentMethod: PaymentMethod = allowedPaymentMethods.includes(
      paymentMethodRaw as PaymentMethod
    )
      ? (paymentMethodRaw as PaymentMethod)
      : "PIX";

    if (!customerName) {
      return NextResponse.json(
        { error: "Nome do cliente é obrigatório" },
        { status: 400 }
      );
    }

    if (!customerWhatsapp) {
      return NextResponse.json(
        { error: "WhatsApp é obrigatório" },
        { status: 400 }
      );
    }

    if (!items.length) {
      return NextResponse.json(
        { error: "Pedido sem itens" },
        { status: 400 }
      );
    }

    // cria cliente
    const createdCustomer = await prisma.customer.create({
      data: {
        name: customerName,
        whatsapp: customerWhatsapp,
        email: customerEmail,
      },
    });

    // cria pedido
    const order = await prisma.order.create({
      data: {
        code: generateOrderCode(),
        customerId: createdCustomer.id,
        paymentMethod,
        observation,
        total: totalAmount,
        status: "NOVO" as OrderStatus,

        items: {
          create: items.map((item: any) => ({
            productId: item.productId || null,
            name: String(item.name || "Produto"),
            price: Number(item.price || 0),
            quantity: Number(item.quantity || 1),
          })),
        },
      },
      include: {
        items: true,
        customer: true,
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    console.error("ERRO CREATE ORDER:", error);

    return NextResponse.json(
      {
        error: "Erro ao criar pedido",
        details:
          process.env.NODE_ENV === "development"
            ? String(error?.message || "Erro desconhecido")
            : undefined,
      },
      { status: 500 }
    );
  }
}