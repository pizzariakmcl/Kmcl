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

type ProductAdditionalInput = {
  additionalId: string;
  required?: boolean;
  sortOrder?: number;
};

type CategoryPriceInput = {
  categoryId: string;
  customPrice?: number | string | null;
};

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: {
        sortOrder: "asc",
      },
      include: {
        categories: {
          orderBy: {
            sortOrder: "asc",
          },
          include: {
            category: true,
          },
        },
        productAdditionalConfigs: {
          orderBy: {
            sortOrder: "asc",
          },
          include: {
            additional: true,
          },
        },
      },
    });

    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    console.error("ERRO AO BUSCAR PRODUTOS:", error);

    return NextResponse.json(
      {
        error: "Erro ao buscar produtos",
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
    const inStock = body?.inStock === undefined ? true : Boolean(body.inStock);
    const required =
      body?.required === undefined ? true : Boolean(body.required);

    const sortOrder =
      body?.sortOrder === undefined || body?.sortOrder === null
        ? 0
        : Number(body.sortOrder);

    const categoryIdsRaw: unknown[] = Array.isArray(body?.categoryIds)
      ? body.categoryIds
      : [];

    const categoryIds: string[] = [
      ...new Set(
        categoryIdsRaw
          .map((item) => String(item ?? "").trim())
          .filter((item) => item.length > 0)
      ),
    ];

    const categoryPricesRaw: CategoryPriceInput[] = Array.isArray(body?.categoryPrices)
      ? body.categoryPrices
      : [];

    const categoryPricesMap = new Map<string, number | null>();
    for (const item of categoryPricesRaw) {
      const categoryId = String(item?.categoryId ?? "").trim();
      if (!categoryId) continue;

      const raw = item?.customPrice;
      if (raw === undefined || raw === null || String(raw).trim() === "") {
        categoryPricesMap.set(categoryId, null);
        continue;
      }

      const parsed = Number(raw);
      if (Number.isNaN(parsed) || parsed < 0) {
        return NextResponse.json(
          { error: `Preço inválido para a categoria ${categoryId}` },
          { status: 400 }
        );
      }

      categoryPricesMap.set(categoryId, parsed);
    }

    const productAdditionalConfigs: ProductAdditionalInput[] = Array.isArray(
      body?.productAdditionalConfigs
    )
      ? body.productAdditionalConfigs
      : [];

    if (!name) {
      return NextResponse.json(
        { error: "Nome do produto é obrigatório" },
        { status: 400 }
      );
    }

    if (!categoryIds.length) {
      return NextResponse.json(
        { error: "Selecione pelo menos uma categoria" },
        { status: 400 }
      );
    }

    if (Number.isNaN(price) || price < 0) {
      return NextResponse.json(
        { error: "Preço base inválido" },
        { status: 400 }
      );
    }

    if (Number.isNaN(sortOrder)) {
      return NextResponse.json(
        { error: "Ordem inválida" },
        { status: 400 }
      );
    }

    const categoriesFound = await prisma.category.findMany({
      where: {
        id: {
          in: categoryIds,
        },
      },
      select: {
        id: true,
      },
    });

    if (categoriesFound.length !== categoryIds.length) {
      return NextResponse.json(
        { error: "Uma ou mais categorias não foram encontradas" },
        { status: 404 }
      );
    }

    let slug = makeSlug(name);

    if (!slug) {
      slug = `produto-${Date.now()}`;
    }

    const existingSlug = await prisma.product.findUnique({
      where: { slug },
    });

    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    const validConfigs = productAdditionalConfigs
      .filter((item) => item?.additionalId)
      .map((item, index) => ({
        additionalId: String(item.additionalId).trim(),
        required: Boolean(item.required),
        sortOrder:
          item.sortOrder !== undefined && !Number.isNaN(Number(item.sortOrder))
            ? Number(item.sortOrder)
            : index,
      }));

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        price,
        imageUrl: imageUrl || null,
        active,
        inStock,
        required,
        sortOrder,
        categoryId: categoryIds[0],
        categories: {
  create: categoryIds.map((categoryId: string, index: number) => {
    const customPriceValue = categoryPricesMap.get(categoryId);

    return {
      categoryId,
      sortOrder: index,
      customPrice:
        customPriceValue !== undefined ? customPriceValue : null,
    };
  }),
},
        productAdditionalConfigs: {
          create: validConfigs,
        },
      },
      include: {
        categories: {
          orderBy: {
            sortOrder: "asc",
          },
          include: {
            category: true,
          },
        },
        productAdditionalConfigs: {
          orderBy: {
            sortOrder: "asc",
          },
          include: {
            additional: true,
          },
        },
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("ERRO AO CRIAR PRODUTO:", error);

    return NextResponse.json(
      {
        error: "Erro ao criar produto",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}