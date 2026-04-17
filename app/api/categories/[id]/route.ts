import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function makeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const name = String(body?.name ?? "").trim();
    const description =
      body?.description !== undefined && body?.description !== null
        ? String(body.description).trim()
        : null;

    const type =
      body?.type === "PIZZA_HALF_HALF" ? "PIZZA_HALF_HALF" : "NORMAL";

    const selectionRequired =
      body?.selectionRequired === undefined
        ? false
        : Boolean(body.selectionRequired);

    const active = body?.active === undefined ? true : Boolean(body.active);

    const sortOrder =
      body?.sortOrder === undefined || body?.sortOrder === null
        ? 0
        : Number(body.sortOrder);

    if (!id) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Nome da categoria é obrigatório" },
        { status: 400 }
      );
    }

    if (Number.isNaN(sortOrder)) {
      return NextResponse.json(
        { error: "Ordem inválida" },
        { status: 400 }
      );
    }

    const existing = await prisma.category.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Categoria não encontrada" },
        { status: 404 }
      );
    }

    let slug = makeSlug(name);

    if (!slug) {
      slug = `categoria-${Date.now()}`;
    }

    const duplicate = await prisma.category.findFirst({
      where: {
        id: { not: id },
        slug,
      },
    });

    if (duplicate) {
      slug = `${slug}-${Date.now()}`;
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        type,
        selectionRequired,
        active,
        sortOrder,
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("ERRO AO EDITAR CATEGORIA:", error);

    return NextResponse.json(
      {
        error: "Erro ao editar categoria",
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
        { error: "ID inválido" },
        { status: 400 }
      );
    }

    const existing = await prisma.category.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Categoria não encontrada" },
        { status: 404 }
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error("ERRO AO EXCLUIR CATEGORIA:", error);

    return NextResponse.json(
      {
        error: "Erro ao excluir categoria",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}