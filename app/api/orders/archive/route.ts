import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    await prisma.order.updateMany({
      where: {
        archived: false,
        OR: [
          { status: "ENTREGUE" },
          { status: "CANCELADO" },
        ],
      },
      data: {
        archived: true,
        archivedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("ERRO AO ARQUIVAR PEDIDOS:", error);

    return NextResponse.json(
      {
        error: "Erro ao arquivar pedidos",
        details: error?.message || "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}