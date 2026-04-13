import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderId = String(body.orderId || "").trim();

    if (!orderId) {
      return NextResponse.json(
        { error: "ID do pedido é obrigatório" },
        { status: 400 }
      );
    }

    const order = await db.order.update({
      where: {
        id: orderId,
      },
      data: {
        archived: true,
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Erro ao arquivar pedido:", error);
    return NextResponse.json(
      { error: "Erro ao arquivar pedido" },
      { status: 500 }
    );
  }
}