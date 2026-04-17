import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        customer: true,
        items: true,
      },
    });

    const normalizedOrders = orders.map((order) => ({
      id: order.id,
      code: order.code || `PED-${String(order.id).slice(0, 8)}`,
      total: Number(order.total || 0),
      paymentMethod: order.paymentMethod || "PIX",
      observation: order.observation || null,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      archived: Boolean(order.archived),
      archivedAt: order.archivedAt || null,
      changeFor: order.changeFor || null,

      customer: order.customer
        ? {
            id: order.customer.id,
            name: String(order.customer.name || "").trim(),
            whatsapp: String(order.customer.whatsapp || "").trim(),
            email: order.customer.email || null,
            address: String(order.customer.address || "").trim(),
            number: String(order.customer.number || "").trim(),
            complement: String(order.customer.complement || "").trim(),
            neighborhood: String(order.customer.neighborhood || "").trim(),
            city: String(order.customer.city || "").trim(),
            cep: String(order.customer.cep || "").trim(),
          }
        : null,

      items: Array.isArray(order.items)
        ? order.items.map((item) => ({
            id: item.id,
            name: String(item.name || "Produto").trim(),
            price: Number(item.price || 0),
            quantity: Number(item.quantity || 1),
          }))
        : [],
    }));

    return NextResponse.json(normalizedOrders, { status: 200 });
  } catch (error) {
    console.error("Erro ao buscar pedidos:", error);

    return NextResponse.json(
      {
        error: "Erro ao buscar pedidos",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}