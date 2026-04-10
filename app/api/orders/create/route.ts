import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

function generateOrderNumber() {
  return `KMCL-${Date.now()}`;
}

function normalizeItems(items: CartItem[]) {
  const map = new Map<string, CartItem>();

  for (const item of items) {
    const existing = map.get(item.productId);

    if (existing) {
      existing.quantity += Number(item.quantity);
    } else {
      map.set(item.productId, {
        productId: item.productId,
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity),
      });
    }
  }

  return Array.from(map.values());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const customer = body.customer || {};
    const rawItems: CartItem[] = Array.isArray(body.items) ? body.items : [];
    const items = normalizeItems(rawItems);

    const paymentMethod = String(body.paymentMethod || "PIX").trim();
    const observacao = body.observacao
      ? String(body.observacao).trim()
      : null;

    const nome = String(customer.nome || "").trim();
    const whatsapp = String(customer.whatsapp || "").trim();
    const cep = String(customer.cep || "").trim();
    const endereco = String(customer.endereco || "").trim();
    const numero = String(customer.numero || "").trim();
    const complemento = customer.complemento
      ? String(customer.complemento).trim()
      : null;
    const bairro = String(customer.bairro || "").trim();
    const cidade = String(customer.cidade || "").trim();

    if (!nome || !whatsapp || !cep || !endereco || !numero || !bairro || !cidade) {
      return NextResponse.json(
        { error: "Preencha todos os dados obrigatórios do cliente" },
        { status: 400 }
      );
    }

    if (!items.length) {
      return NextResponse.json(
        { error: "Carrinho vazio" },
        { status: 400 }
      );
    }

    const invalidItem = items.find(
      (item) =>
        !item.productId ||
        !item.name ||
        Number(item.price) <= 0 ||
        Number(item.quantity) <= 0
    );

    if (invalidItem) {
      return NextResponse.json(
        { error: "Há item inválido no carrinho" },
        { status: 400 }
      );
    }

    const totalAmount = items.reduce(
      (acc, item) => acc + Number(item.price) * Number(item.quantity),
      0
    );

    const createdCustomer = await db.customer.create({
      data: {
        nome,
        whatsapp,
        cep,
        endereco,
        numero,
        complemento,
        bairro,
        cidade,
      },
    });

    const orderNumber = generateOrderNumber();

    const order = await db.order.create({
      data: {
        orderNumber,
        customerId: createdCustomer.id,
        totalAmount,
        paymentMethod,
        observacao,
        status: "NOVO",
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            nome: item.name,
            price: Number(item.price),
            quantity: Number(item.quantity),
          })),
        },
      },
      include: {
        customer: true,
        items: true,
      },
    });

    return NextResponse.json({
      success: true,
      id: order.id,
      orderNumber: order.orderNumber,
      order,
    });
  } catch (error) {
    console.error("Erro ao criar pedido:", error);

    return NextResponse.json(
      { error: "Erro ao criar pedido" },
      { status: 500 }
    );
  }
}