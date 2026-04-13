import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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

    const customerName = String(body.customerName || body.name || "").trim();
    const whatsapp = String(body.whatsapp || "").trim();
    const cep = String(body.cep || "").trim();
    const address = String(body.address || "").trim();
    const number = String(body.number || "").trim();
    const neighborhood = String(body.neighborhood || body.bairro || "").trim();
    const city = String(body.city || "").trim();
    const complement = String(body.complement || "").trim();
    const paymentMethod = String(body.paymentMethod || "").trim();
    const note = String(body.note || body.observation || "").trim();
    const items = Array.isArray(body.items) ? body.items : [];
    const total = Number(body.total || 0);

    if (!customerName) {
      return NextResponse.json(
        { error: "Nome do cliente é obrigatório" },
        { status: 400 }
      );
    }

    if (!whatsapp) {
      return NextResponse.json(
        { error: "WhatsApp é obrigatório" },
        { status: 400 }
      );
    }

    if (!address) {
      return NextResponse.json(
        { error: "Endereço é obrigatório" },
        { status: 400 }
      );
    }

    if (!number) {
      return NextResponse.json(
        { error: "Número é obrigatório" },
        { status: 400 }
      );
    }

    if (!neighborhood) {
      return NextResponse.json(
        { error: "Bairro é obrigatório" },
        { status: 400 }
      );
    }

    if (!city) {
      return NextResponse.json(
        { error: "Cidade é obrigatória" },
        { status: 400 }
      );
    }

    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Forma de pagamento é obrigatória" },
        { status: 400 }
      );
    }

    if (!items.length) {
      return NextResponse.json(
        { error: "O pedido precisa ter ao menos 1 item" },
        { status: 400 }
      );
    }

    const invalidItem = items.find(
      (item: any) =>
        !String(item.productId || "").trim() ||
        !String(item.name || "").trim() ||
        Number(item.price || 0) <= 0 ||
        Number(item.quantity || 0) <= 0
    );

    if (invalidItem) {
      return NextResponse.json(
        { error: "Existe item inválido no pedido" },
        { status: 400 }
      );
    }

    const orderNumber = generateOrderNumber();

    const order = await db.order.create({
      data: {
        orderNumber,
        customerName,
        whatsapp,
        cep: cep || null,
        address,
        number,
        neighborhood,
        city,
        complement: complement || null,
        paymentMethod,
        note: note || null,
        status: "NOVO",
        archived: false,
        total,
        items: {
          create: items.map((item: any) => ({
            productId: String(item.productId),
            name: String(item.name),
            price: Number(item.price),
            quantity: Number(item.quantity),
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Erro ao criar pedido:", error);
    return NextResponse.json(
      { error: "Erro ao criar pedido" },
      { status: 500 }
    );
  }
}