import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - listar adicionais
export async function GET() {
  try {
    const additionals = await db.additional.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(additionals);
  } catch (error) {
    console.error("Erro ao buscar adicionais:", error);
    return NextResponse.json(
      { error: "Erro ao buscar adicionais" },
      { status: 500 }
    );
  }
}

// POST - criar adicional
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const name = String(body.name || "").trim();
    const description = String(body.description || "").trim();
    const price = Number(body.price || 0);
    const categoryId = String(body.categoryId || "").trim();
    const isRequired = Boolean(body.isRequired);
    const active = body.active !== false;

    if (!name) {
      return NextResponse.json(
        { error: "Nome do adicional é obrigatório" },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { error: "Categoria é obrigatória" },
        { status: 400 }
      );
    }

    const existing = await db.additional.findFirst({
      where: {
        name,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Já existe um adicional com esse nome" },
        { status: 400 }
      );
    }

    const additional = await db.additional.create({
      data: {
        name,
        description: description || null,
        price,
        isRequired,
        active,
        categoryId,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(additional);
  } catch (error) {
    console.error("Erro ao criar adicional:", error);
    return NextResponse.json(
      { error: "Erro ao criar adicional" },
      { status: 500 }
    );
  }
}