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

// GET - listar adicionais
export async function GET() {
  try {
    const additionals = await db.additional.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        categories: true,
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
    const price = Number(body.price || 0);
    const categoryIds = body.categoryIds || [];

    if (!name) {
      return NextResponse.json(
        { error: "Nome do adicional é obrigatório" },
        { status: 400 }
      );
    }

    const slug = makeSlug(name);

    const existing = await db.additional.findFirst({
      where: {
        OR: [{ name }, { slug }],
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
        slug,
        price,
        categories: {
          connect: categoryIds.map((id: string) => ({ id })),
        },
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