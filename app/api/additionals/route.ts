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

export async function GET() {
  try {
    const additionals = await prisma.additional.findMany({
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
      orderBy: {
        sortOrder: "asc",
      },
    });

    return NextResponse.json(additionals.map(normalizeAdditional));
  } catch (error) {
    console.error("ERRO GET ADDITIONALS:", error);

    return NextResponse.json(
      { error: "Erro ao buscar adicionais" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const name = String(body?.name ?? "").trim();
    const description = body?.description
      ? String(body.description).trim()
      : null;

    const price = Number(body?.price);
    const required = Boolean(body?.required ?? false);
    const active = Boolean(body?.active ?? true);
    const sortOrder = Number(body?.sortOrder ?? 0);

    const categoryIdsRaw: unknown[] = Array.isArray(body?.categoryIds)
      ? body.categoryIds
      : body?.categoryId
      ? [body.categoryId]
      : [];

    const categoryIds: string[] = [
      ...new Set(
        categoryIdsRaw
          .map((id) => String(id ?? "").trim())
          .filter((id) => id.length > 0)
      ),
    ];

    if (!name) {
      return NextResponse.json(
        { error: "Nome obrigatório" },
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

    const categories = await prisma.category.findMany({
      where: {
        id: { in: categoryIds },
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

    let slug = makeSlug(name) || `additional-${Date.now()}`;

    const exists = await prisma.additional.findUnique({
      where: { slug },
    });

    if (exists) {
      slug = `${slug}-${Date.now()}`;
    }

    const additional = await prisma.additional.create({
      data: {
        name,
        slug,
        description,
        price,
        required,
        active,
        sortOrder,
        categoryLinks: {
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

    return NextResponse.json(normalizeAdditional(additional), { status: 201 });
  } catch (error: any) {
    console.error("ERRO POST ADDITIONAL:", error);

    return NextResponse.json(
      { error: error?.message || "Erro ao criar adicional" },
      { status: 500 }
    );
  }
}