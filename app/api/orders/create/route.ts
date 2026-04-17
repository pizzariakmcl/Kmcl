import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentMethod, OrderStatus } from "@prisma/client";

function generateOrderCode() {
  return `PED-${Date.now()}`;
}

function normalizePaymentMethod(value: string): PaymentMethod {
  const raw = String(value || "PIX")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const allowedPaymentMethods: PaymentMethod[] = [
    "PIX",
    "DINHEIRO",
    "DEBITO",
    "CREDITO",
  ];

  return allowedPaymentMethods.includes(raw as PaymentMethod)
    ? (raw as PaymentMethod)
    : "PIX";
}

function buildSafeItemName(item: any) {
  if (item?.name && String(item.name).trim()) {
    return String(item.name).trim();
  }

  if (item?.isHalfHalf && Array.isArray(item?.flavorNames) && item.flavorNames.length) {
    return `Meio a Meio: ${item.flavorNames.join(" + ")}`;
  }

  if (item?.isCombo && Array.isArray(item?.comboSelectionsSummary) && item.comboSelectionsSummary.length) {
    return `Combo: ${item.comboSelectionsSummary.join(" | ")}`;
  }

  return "Produto";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("BODY RECEBIDO:", JSON.stringify(body, null, 2));

    const customer = body?.customer || {};
    const items = Array.isArray(body?.items) ? body.items : [];

    const customerName = String(customer?.name || "").trim();
    const customerWhatsapp = String(customer?.whatsapp || "").trim();
    const customerEmail =
      customer?.email && String(customer.email).trim() !== ""
        ? String(customer.email).trim()
        : null;

    const customerCep =
      customer?.cep && String(customer.cep).trim() !== ""
        ? String(customer.cep).trim()
        : null;

    const customerAddress =
      customer?.address && String(customer.address).trim() !== ""
        ? String(customer.address).trim()
        : null;

    const customerNumber =
      customer?.number && String(customer.number).trim() !== ""
        ? String(customer.number).trim()
        : null;

    const customerNeighborhood =
      customer?.neighborhood && String(customer.neighborhood).trim() !== ""
        ? String(customer.neighborhood).trim()
        : null;

    const customerCity =
      customer?.city && String(customer.city).trim() !== ""
        ? String(customer.city).trim()
        : null;

    const customerComplement =
      customer?.complement && String(customer.complement).trim() !== ""
        ? String(customer.complement).trim()
        : null;

    const observation =
      body?.observation && String(body.observation).trim() !== ""
        ? String(body.observation).trim()
        : null;

    const totalAmount = Number(body?.totalAmount || 0);
    const paymentMethod = normalizePaymentMethod(body?.paymentMethod || "PIX");

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

    if (!totalAmount || totalAmount <= 0) {
      return NextResponse.json(
        { error: "Total do pedido inválido" },
        { status: 400 }
      );
    }

    const normalizedItems = items.map((item: any, index: number) => {
      const isHalfHalf = !!item?.isHalfHalf;
      const isCombo = !!item?.isCombo;

      const safeName = buildSafeItemName(item);
      const safePrice = Number(item?.price || 0);
      const safeQuantity = Number(item?.quantity || 1);

      const safeProductId =
        !isHalfHalf &&
        !isCombo &&
        item?.productId &&
        String(item.productId).trim() !== ""
          ? String(item.productId).trim()
          : null;

      const normalized = {
        productId: safeProductId,
        name: safeName,
        price: Number.isFinite(safePrice) ? safePrice : 0,
        quantity: Number.isFinite(safeQuantity) && safeQuantity > 0 ? safeQuantity : 1,
      };

      console.log(`ITEM NORMALIZADO ${index}:`, normalized);

      return normalized;
    });

    console.log("NORMALIZED ITEMS FINAL:", JSON.stringify(normalizedItems, null, 2));

    const createdCustomer = await prisma.customer.create({
      data: {
        name: customerName,
        whatsapp: customerWhatsapp,
        email: customerEmail,
        cep: customerCep,
        address: customerAddress,
        number: customerNumber,
        complement: customerComplement,
        neighborhood: customerNeighborhood,
        city: customerCity,
      },
    });

    const order = await prisma.order.create({
      data: {
        code: generateOrderCode(),
        customerId: createdCustomer.id,
        paymentMethod,
        observation,
        total: totalAmount,
        status: "NOVO" as OrderStatus,
        items: {
          create: normalizedItems.map((item) => {
            const itemData: any = {
              name: item.name,
              price: item.price,
              quantity: item.quantity,
            };

            if (item.productId) {
              itemData.productId = item.productId;
            }

            return itemData;
          }),
        },
      },
      include: {
        items: true,
        customer: true,
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    console.error("ERRO CREATE ORDER COMPLETO:", error);
    console.error("MENSAGEM:", error?.message);
    console.error("STACK:", error?.stack);

    return NextResponse.json(
      {
        error: "Erro ao criar pedido",
        details: String(error?.message || "Erro desconhecido"),
      },
      { status: 500 }
    );
  }
}