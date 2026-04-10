import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId é obrigatório" },
        { status: 400 }
      );
    }

    await db.orderItem.deleteMany({
      where: {
        orderId,
      },
    });

    await db.order.delete({
      where: {
        id: orderId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir pedido:", error);

    return NextResponse.json(
      { error: "Erro ao excluir pedido" },
      { status: 500 }
    );
  }
}