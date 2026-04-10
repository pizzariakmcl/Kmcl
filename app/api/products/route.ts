import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const products = await db.product.findMany({
      where: {
        active: true,
        inStock: true,
      },
      include: {
        category: true,
      },
      orderBy: [
        {
          createdAt: "desc",
        },
      ],
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
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
    const price = Number(body.price);
    const imageUrl = body.imageUrl ? String(body.imageUrl).trim() : null;
    const categoryId = String(body.categoryId || "").trim();
    const active = Boolean(body.active);
    const inStock = Boolean(body.inStock);

    if (!name || !description || !categoryId || Number.isNaN(price)) {
      return NextResponse.json(
        { error: "Preencha os campos obrigatórios corretamente" },
        { status: 400 }
      );
    }

    const product = await db.product.create({
      data: {
        name,
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
    console.error("Erro ao criar produto:", error);
    return NextResponse.json(
      { error: "Erro ao criar produto" },
      { status: 500 }
    );
  }
}