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
        { error: "ID do combo inválido" },
        { status: 400 }
      );
    }

    const combo = await prisma.combo.findUnique({
      where: { id },
      include: {
        groups: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    if (!combo) {
      return NextResponse.json(
        { error: "Combo não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(combo.groups, { status: 200 });
  } catch (error) {
    console.error("ERRO AO BUSCAR GRUPOS DO COMBO:", error);

    return NextResponse.json(
      {
        error: "Erro ao buscar grupos do combo",
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
        { error: "ID do combo inválido" },
        { status: 400 }
      );
    }

    const combo = await prisma.combo.findUnique({
      where: { id },
    });

    if (!combo) {
      return NextResponse.json(
        { error: "Combo não encontrado" },
        { status: 404 }
      );
    }

    const name = String(body?.name || "").trim();
    const minSelect = Number(body?.minSelect ?? 0);
    const maxSelect = Number(body?.maxSelect ?? 1);
    const sortOrder = Number(body?.sortOrder ?? 0);
    const required = Boolean(body?.required);

    if (!name) {
      return NextResponse.json(
        { error: "Nome do grupo é obrigatório" },
        { status: 400 }
      );
    }

    if (Number.isNaN(minSelect) || minSelect < 0) {
      return NextResponse.json(
        { error: "Mínimo de seleção inválido" },
        { status: 400 }
      );
    }

    if (Number.isNaN(maxSelect) || maxSelect < 1) {
      return NextResponse.json(
        { error: "Máximo de seleção inválido" },
        { status: 400 }
      );
    }

    if (minSelect > maxSelect) {
      return NextResponse.json(
        { error: "O mínimo não pode ser maior que o máximo" },
        { status: 400 }
      );
    }

    if (Number.isNaN(sortOrder)) {
      return NextResponse.json(
        { error: "Ordem inválida" },
        { status: 400 }
      );
    }

    const group = await prisma.comboGroup.create({
      data: {
        name,
        minSelect,
        maxSelect,
        sortOrder,
        required,
        comboId: id,
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error("ERRO AO CRIAR GRUPO:", error);

    return NextResponse.json(
      {
        error: "Erro ao criar grupo",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}