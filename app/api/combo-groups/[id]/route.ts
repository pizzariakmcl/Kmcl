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
    });

    if (!group) {
      return NextResponse.json(
        { error: "Grupo não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(group, { status: 200 });
  } catch (error) {
    console.error("ERRO AO BUSCAR GRUPO:", error);

    return NextResponse.json(
      {
        error: "Erro ao buscar grupo",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "ID do grupo inválido" },
        { status: 400 }
      );
    }

    const existing = await prisma.comboGroup.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Grupo não encontrado" },
        { status: 404 }
      );
    }

    const name = String(body?.name ?? "").trim();
    const required =
      body?.required === undefined ? true : Boolean(body.required);

    const minSelect =
      body?.minSelect === undefined || body?.minSelect === null
        ? 1
        : Number(body.minSelect);

    const maxSelect =
      body?.maxSelect === undefined || body?.maxSelect === null
        ? 1
        : Number(body.maxSelect);

    const sortOrder =
      body?.sortOrder === undefined || body?.sortOrder === null
        ? 0
        : Number(body.sortOrder);

    if (!name) {
      return NextResponse.json(
        { error: "Nome do grupo é obrigatório" },
        { status: 400 }
      );
    }

    if (
      Number.isNaN(minSelect) ||
      Number.isNaN(maxSelect) ||
      minSelect < 0 ||
      maxSelect < 0
    ) {
      return NextResponse.json(
        { error: "Mínimo ou máximo inválido" },
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

    const updated = await prisma.comboGroup.update({
      where: { id },
      data: {
        name,
        required,
        minSelect,
        maxSelect,
        sortOrder,
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("ERRO AO EDITAR GRUPO DO COMBO:", error);

    return NextResponse.json(
      {
        error: "Erro ao editar grupo do combo",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "ID do grupo inválido" },
        { status: 400 }
      );
    }

    const existing = await prisma.comboGroup.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Grupo não encontrado" },
        { status: 404 }
      );
    }

    await prisma.comboGroup.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("ERRO AO EXCLUIR GRUPO DO COMBO:", error);

    return NextResponse.json(
      {
        error: "Erro ao excluir grupo do combo",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}