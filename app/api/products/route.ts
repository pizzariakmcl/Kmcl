import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function makeSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");
}

export async function GET() {
  try {
    const products = await db.product.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("ERRO REAL AO BUSCAR PRODUTOS:", error);

    return NextResponse.json(
      { error: "Erro ao buscar produtos" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const name = String(body.name || "").trim();
    const description = String(body.description || "").trim();
    const price = Number(body.price || 0);
    const imageUrl = body.imageUrl ? String(body.imageUrl).trim() : null;
    const categoryId = String(body.categoryId || "").trim();
    const active = body.active !== false;
    const inStock = body.inStock !== false;

    if (!name) {
      return NextResponse.json(
        { error: "Nome do produto é obrigatório" },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { error: "Categoria é obrigatória" },
        { status: 400 }
      );
    }

    if (price <= 0) {
      return NextResponse.json(
        { error: "Preço inválido" },
        { status: 400 }
      );
    }

    const slug = makeSlug(name);

    const existing = await db.product.findFirst({
      where: {
        OR: [{ name }, { slug }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Já existe um produto com esse nome" },
        { status: 400 }
      );
    }

    const product = await db.product.create({
      data: {
        name,
        slug,
        description,
        price,
        imageUrl,
        categoryId,
        active,
        inStock,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("ERRO REAL AO CRIAR PRODUTO:", error);

    return NextResponse.json(
      { error: "Erro ao criar produto" },
      { status: 500 }
    );
  }
}