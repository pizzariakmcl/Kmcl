import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const orderSchema = z.object({
  customer: z.object({
    name: z.string().min(1),
    whatsapp: z.string().min(1),
    address: z.string().min(1),
    number: z.string().min(1),
    neighborhood: z.string().min(1),
    city: z.string().min(1),
    cep: z.string().optional().nullable(),
    complement: z.string().optional().nullable(),
  }),
  paymentMethod: z.string().min(1),
  observacao: z.string().optional().nullable(),
  totalAmount: z.number().positive(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        name: z.string().min(1),
        price: z.number().positive(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

function generateOrderNumber() {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(
    now.getMinutes()
  ).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;

  return `KMCL-${stamp}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = orderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados do pedido inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { customer, paymentMethod, observacao, totalAmount, items } = parsed.data;

    await db.customer.create({
      data: {
        name: customer.name,
        whatsapp: customer.whatsapp,
      },
    });

    const order = await db.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerName: customer.name,
        whatsapp: customer.whatsapp,
        cep: customer.cep || null,
        address: customer.address,
        number: customer.number,
        neighborhood: customer.neighborhood,
        city: customer.city,
        complement: customer.complement || null,
        paymentMethod,
        note: observacao || null,
        status: "NOVO",
        archived: false,
        total: totalAmount,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar pedido:", error);
    return NextResponse.json(
      { error: "Erro interno ao criar pedido" },
      { status: 500 }
    );
  }
}