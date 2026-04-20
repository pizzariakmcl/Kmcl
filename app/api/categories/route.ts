import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CategoryType } from "@prisma/client";

function makeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        sortOrder: "asc",
      },
    });

    return NextResponse.json(categories, { status: 200 });
  } catch (error) {
    console.error("ERRO AO BUSCAR CATEGORIAS:", error);

    return NextResponse.json(
      {
        error: "Erro ao buscar categorias",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("BODY CATEGORY:", body);

    const name = String(body?.name ?? "").trim();

    const description =
      body?.description !== undefined && body?.description !== null
        ? String(body.description).trim()
        : null;

    const type: CategoryType =
      body?.type === "PIZZA_HALF_HALF" ? "PIZZA_HALF_HALF" : "NORMAL";

    const selectionRequired =
      body?.selectionRequired === undefined
        ? false
        : Boolean(body.selectionRequired);

    const active =
      body?.active === undefined ? true : Boolean(body.active);

    const sortOrderRaw =
      body?.sortOrder === undefined || body?.sortOrder === null
        ? 0
        : Number(body.sortOrder);

    if (!name) {
      return NextResponse.json(
        { error: "Nome da categoria é obrigatório" },
        { status: 400 }
      );
    }

    if (Number.isNaN(sortOrderRaw)) {
      return NextResponse.json(
        { error: "Ordem inválida" },
        { status: 400 }
      );
    }

    let slug = makeSlug(name);

    if (!slug) {
      slug = `categoria-${Date.now()}`;
    }

    const existingSlug = await prisma.category.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        type,
        selectionRequired,
        active,
        sortOrder: sortOrderRaw,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("ERRO AO CRIAR CATEGORIA:", error);

    return NextResponse.json(
      {
        error: "Erro ao criar categoria",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}