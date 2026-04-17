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

type ComboAdditionalInput = {
  additionalId: string;
  required?: boolean;
  sortOrder?: number;
};

export async function GET() {
  try {
    const combos = await prisma.combo.findMany({
      orderBy: {
        sortOrder: "asc",
      },
      include: {
        groups: {
          orderBy: {
            sortOrder: "asc",
          },
          include: {
            items: {
              orderBy: {
                sortOrder: "asc",
              },
              include: {
                product: true,
              },
            },
          },
        },
        comboAdditionalConfigs: {
          orderBy: {
            sortOrder: "asc",
          },
          include: {
            additional: true,
          },
        },
      },
    });

    return NextResponse.json(combos, { status: 200 });
  } catch (error) {
    console.error("ERRO AO BUSCAR COMBOS:", error);

    return NextResponse.json(
      {
        error: "Erro ao buscar combos",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const name = String(body?.name ?? "").trim();
    const description =
      body?.description !== undefined && body?.description !== null
        ? String(body.description).trim()
        : null;

    const price = Number(body?.price);
    const imageUrl =
      body?.imageUrl !== undefined && body?.imageUrl !== null
        ? String(body.imageUrl).trim()
        : null;

    const active = body?.active === undefined ? true : Boolean(body.active);
    const sortOrder =
      body?.sortOrder === undefined || body?.sortOrder === null
        ? 0
        : Number(body.sortOrder);

    const comboAdditionalConfigs: ComboAdditionalInput[] = Array.isArray(
      body?.comboAdditionalConfigs
    )
      ? body.comboAdditionalConfigs
      : [];

    if (!name) {
      return NextResponse.json(
        { error: "Nome do combo é obrigatório" },
        { status: 400 }
      );
    }

    if (Number.isNaN(price) || price < 0) {
      return NextResponse.json(
        { error: "Preço inválido" },
        { status: 400 }
      );
    }

    if (Number.isNaN(sortOrder)) {
      return NextResponse.json(
        { error: "Ordem inválida" },
        { status: 400 }
      );
    }

    let slug = makeSlug(name);

    if (!slug) {
      slug = `combo-${Date.now()}`;
    }

    const existingSlug = await prisma.combo.findUnique({
      where: { slug },
    });

    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    const validAdditionalConfigs = comboAdditionalConfigs
      .filter((item) => item?.additionalId)
      .map((item, index) => ({
        additionalId: String(item.additionalId).trim(),
        required: Boolean(item.required),
        sortOrder:
          item.sortOrder !== undefined && !Number.isNaN(Number(item.sortOrder))
            ? Number(item.sortOrder)
            : index,
      }));

    const combo = await prisma.combo.create({
      data: {
        name,
        slug,
        description,
        price,
        imageUrl: imageUrl || null,
        active,
        sortOrder,
        comboAdditionalConfigs: {
          create: validAdditionalConfigs,
        },
      },
      include: {
        groups: {
          orderBy: {
            sortOrder: "asc",
          },
          include: {
            items: {
              orderBy: {
                sortOrder: "asc",
              },
              include: {
                product: true,
              },
            },
          },
        },
        comboAdditionalConfigs: {
          orderBy: {
            sortOrder: "asc",
          },
          include: {
            additional: true,
          },
        },
      },
    });

    return NextResponse.json(combo, { status: 201 });
  } catch (error) {
    console.error("ERRO AO CRIAR COMBO:", error);

    return NextResponse.json(
      {
        error: "Erro ao criar combo",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}