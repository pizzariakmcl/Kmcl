import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
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

    const updated = await db.product.update({
      where: { id },
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar produto" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;

    await db.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir produto:", error);
    return NextResponse.json(
      { error: "Erro ao excluir produto" },
      { status: 500 }
    );
  }
}