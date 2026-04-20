import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RouteMode } from "@prisma/client";

function generateBatchCode() {
  return `LOTE-${Date.now()}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const orderIds = Array.isArray(body?.orderIds)
      ? body.orderIds.map((id: unknown) => String(id).trim()).filter(Boolean)
      : [];

    const driverId = String(body?.driverId || "").trim();
    const mapsUrl =
      body?.mapsUrl && String(body.mapsUrl).trim() !== ""
        ? String(body.mapsUrl).trim()
        : null;

    const routeMode: RouteMode =
      body?.routeMode === "FAR_TO_NEAR" ? "FAR_TO_NEAR" : "NEAR_TO_FAR";

    if (!orderIds.length) {
      return NextResponse.json(
        { error: "Selecione ao menos um pedido" },
        { status: 400 }
      );
    }

    if (!driverId) {
      return NextResponse.json(
        { error: "Motoqueiro é obrigatório" },
        { status: 400 }
      );
    }

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      return NextResponse.json(
        { error: "Motoqueiro não encontrado" },
        { status: 404 }
      );
    }

    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        archived: false,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!orders.length) {
      return NextResponse.json(
        { error: "Pedidos não encontrados" },
        { status: 404 }
      );
    }

    const batchCode = generateBatchCode();

    const batch = await prisma.deliveryBatch.create({
      data: {
        code: batchCode,
        driverId,
        routeMode,
        mapsUrl,
        status: "ENVIADO",
      },
    });

    await Promise.all(
      orders.map((order, index) =>
        prisma.order.update({
          where: { id: order.id },
          data: {
            status: "SAIU_PARA_ENTREGA",
            archived: false,
            archivedAt: null,
            driverId,
            deliveryBatchId: batch.id,
            deliveryRouteOrder: index + 1,
            dispatchedAt: new Date(),
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      batchCode: batch.code,
    });
  } catch (error: any) {
    console.error("ERRO DISPATCH CONFIRM:", error);

    return NextResponse.json(
      {
        error: "Erro ao confirmar despacho",
        details: error?.message || "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}