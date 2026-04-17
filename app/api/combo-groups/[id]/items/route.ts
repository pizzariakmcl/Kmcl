import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "ID do grupo inválido" },
        { status: 400 }
      );
    }

    const group = await prisma.comboGroup.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: {
            sortOrder: "asc",
          },
          include: {
            product: true,
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Grupo não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(group.items, { status: 200 });
  } catch (error) {
    console.error("ERRO AO BUSCAR ITENS DO GRUPO:", error);

    return NextResponse.json(
      {
        error: "Erro ao buscar itens do grupo",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "ID do grupo inválido" },
        { status: 400 }
      );
    }

    const group = await prisma.comboGroup.findUnique({
      where: { id },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Grupo não encontrado" },
        { status: 404 }
      );
    }

    const items = Array.isArray(body?.items) ? body.items : [];

    const validItems = items
      .filter((item: any) => item?.productId)
      .map((item: any, index: number) => ({
        productId: String(item.productId).trim(),
        sortOrder:
          item.sortOrder !== undefined && !Number.isNaN(Number(item.sortOrder))
            ? Number(item.sortOrder)
            : index,
      }));

    await prisma.comboGroup.update({
      where: { id },
      data: {
        items: {
          deleteMany: {},
          create: validItems,
        },
      },
    });

    const updated = await prisma.comboGroup.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: {
            sortOrder: "asc",
          },
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("ERRO AO SALVAR ITENS DO GRUPO:", error);

    return NextResponse.json(
      {
        error: "Erro ao salvar itens do grupo",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}