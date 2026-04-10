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

    if (!name) {
      return NextResponse.json(
        { error: "Nome da categoria é obrigatório" },
        { status: 400 }
      );
    }

    const slug = makeSlug(name);

    const existing = await db.category.findFirst({
      where: {
        NOT: { id },
        OR: [{ name }, { slug }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Já existe outra categoria com esse nome" },
        { status: 400 }
      );
    }

    const updated = await db.category.update({
      where: { id },
      data: {
        name,
        slug,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar categoria:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar categoria" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;

    const productsCount = await db.product.count({
      where: {
        categoryId: id,
      },
    });

    if (productsCount > 0) {
      return NextResponse.json(
        {
          error:
            "Essa categoria possui produtos. Exclua os produtos antes de excluir a categoria.",
        },
        { status: 400 }
      );
    }

    await db.category.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir categoria:", error);
    return NextResponse.json(
      { error: "Erro ao excluir categoria" },
      { status: 500 }
    );
  }
}