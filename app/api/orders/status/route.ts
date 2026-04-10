import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const orderId = String(body.orderId || "").trim();
    let status = String(body.status || "").trim();

    if (!orderId || !status) {
      return NextResponse.json(
        { error: "orderId e status são obrigatórios" },
        { status: 400 }
      );
    }

    // Corrige status antigos/incorretos
    if (status === "ENTREGA") status = "ENTREGUE";
    if (status === "EM") status = "EM_PREPARO";

    const updated = await db.order.update({
      where: { id: orderId },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar status" },
      { status: 500 }
    );
  }
}