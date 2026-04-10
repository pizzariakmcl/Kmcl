import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  try {
    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

    await db.order.updateMany({
      where: {
        status: "ENTREGUE",
        archived: false,
        updatedAt: {
          lte: fifteenMinutesAgo,
        },
      },
      data: {
        archived: true,
        archivedAt: now,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao arquivar pedidos:", error);

    return NextResponse.json(
      { error: "Erro ao arquivar pedidos" },
      { status: 500 }
    );
  }
}