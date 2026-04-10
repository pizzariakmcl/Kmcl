import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const orderSchema = z.object({
  customer: z.object({
    nome: z.string().min(2),
    whatsapp: z.string().min(8),
    email: z.string().optional(),
    cep: z.string().min(8),
    endereco: z.string().min(3),
    numero: z.string().min(1),
    complemento: z.string().optional(),
    bairro: z.string().min(2),
    cidade: z.string().min(2),
  }),
  paymentMethod: z.string().min(2),
  observacao: z.string().optional(),
  totalAmount: z.number().positive(),
  items: z.array(
    z.object({
      productId: z.string(),
      nome: z.string(),
      price: z.number().positive(),
      quantity: z.number().min(1),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = orderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { customer, paymentMethod, observacao, totalAmount, items } = parsed.data;

    const createdCustomer = await db.customer.create({
      data: {
        nome: customer.nome,
        whatsapp: customer.whatsapp,
        email: customer.email || null,
        cep: customer.cep,
        endereco: customer.endereco,
        numero: customer.numero,
        complemento: customer.complemento || null,
        bairro: customer.bairro,
        cidade: customer.cidade,
      },
    });

    const createdOrder = await db.order.create({
      data: {
        orderNumber: `KMCL-${Date.now()}`,
        customerId: createdCustomer.id,
        totalAmount,
        paymentMethod,
        observacao: observacao || null,
        status: "NOVO",
      },
    });

    await Promise.all(
      items.map((item) =>
        db.orderItem.create({
          data: {
            orderId: createdOrder.id,
            productId: item.productId,
            nome: item.nome,
            price: item.price,
            quantity: item.quantity,
          },
        })
      )
    );

    return NextResponse.json(
      {
        success: true,
        orderId: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("ERRO AO CRIAR PEDIDO:", error);

    return NextResponse.json(
      {
        error: "Erro ao criar pedido",
        details: String(error),
      },
      { status: 500 }
    );
  }
}