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

function normalizeAdditional(additional: any) {
  const categories = (additional.categoryLinks || [])
    .map((link: any) => link.category)
    .filter(Boolean);

  return {
    id: additional.id,
    name: additional.name,
    slug: additional.slug,
    description: additional.description,
    price: Number(additional.price || 0),
    required: Boolean(additional.required),
    active: Boolean(additional.active),
    sortOrder: Number(additional.sortOrder || 0),
    categories,
    categoryLinks: additional.categoryLinks || [],
    categoryIds: categories.map((category: any) => String(category.id)),
    category: categories[0] || null,
    categoryId: categories[0]?.id || "",
  };
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

    const price = Number(body?.price);

    const required =
      body?.required === undefined ? false : Boolean(body.required);

    const active =
      body?.active === undefined ? true : Boolean(body.active);

    const sortOrder =
      body?.sortOrder === undefined || body?.sortOrder === null
        ? 0
        : Number(body.sortOrder);

    const categoryIdsRaw: unknown[] = Array.isArray(body?.categoryIds)
      ? body.categoryIds
      : body?.categoryId
      ? [body.categoryId]
      : [];

    const categoryIds: string[] = [
      ...new Set(
        categoryIdsRaw
          .map((item) => String(item ?? "").trim())
          .filter((item) => item.length > 0)
      ),
    ];

    if (!id) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json(
        { error: "Nome do adicional é obrigatório" },
        { status: 400 }
      );
    }

    if (categoryIds.length === 0) {
      return NextResponse.json(
        { error: "Selecione pelo menos uma categoria" },
        { status: 400 }
      );
    }

    if (Number.isNaN(price) || price < 0) {
      return NextResponse.json(
        { error: "Preço inválido" },
        { status: 400 }
      );
    }

    const existing = await prisma.additional.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Adicional não encontrado" },
        { status: 404 }
      );
    }

    const categories = await prisma.category.findMany({
      where: {
        id: {
          in: categoryIds,
        },
      },
      select: {
        id: true,
      },
    });

    if (categories.length !== categoryIds.length) {
      return NextResponse.json(
        { error: "Uma ou mais categorias não foram encontradas" },
        { status: 404 }
      );
    }

    let slug = makeSlug(name);
    if (!slug) slug = `additional-${Date.now()}`;

    const duplicate = await prisma.additional.findFirst({
      where: {
        id: { not: id },
        slug,
      },
    });

    if (duplicate) {
      slug = `${slug}-${Date.now()}`;
    }

    const updated = await prisma.additional.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        price,
        required,
        active,
        sortOrder: Number.isNaN(sortOrder) ? 0 : sortOrder,
        categoryLinks: {
          deleteMany: {},
          create: categoryIds.map((categoryId, index) => ({
            categoryId,
            sortOrder: index,
          })),
        },
      },
      include: {
        categoryLinks: {
          orderBy: {
            sortOrder: "asc",
          },
          include: {
            category: true,
          },
        },
      },
    });

    return NextResponse.json(normalizeAdditional(updated), { status: 200 });
  } catch (error: any) {
    console.error("ERRO PUT ADDITIONAL:", error);

    return NextResponse.json(
      {
        error: "Erro ao editar adicional",
        details: error?.message || "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const existing = await prisma.additional.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Adicional não encontrado" },
        { status: 404 }
      );
    }

    await prisma.additional.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("ERRO DELETE ADDITIONAL:", error);

    return NextResponse.json(
      {
        error: "Erro ao excluir adicional",
        details: error?.message || "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}