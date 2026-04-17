import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 1) Busca categorias + produtos primeiro
    // Isso garante que o cardápio volte a funcionar mesmo se os adicionais falharem.
    const categories = await prisma.category.findMany({
      where: {
        active: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
      include: {
        productLinks: {
          orderBy: {
            sortOrder: "asc",
          },
          include: {
            product: {
              include: {
                productAdditionalConfigs: {
                  orderBy: {
                    sortOrder: "asc",
                  },
                  include: {
                    additional: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 2) Tenta buscar os adicionais por categoria separadamente
    // Se der erro, o menu continua funcionando sem adicionais.
    let additionalLinksByCategoryId: Record<string, any[]> = {};

    try {
      const categoriesWithAdditionals = await prisma.category.findMany({
        where: {
          active: true,
        },
        select: {
          id: true,
          additionalLinks: {
            orderBy: {
              sortOrder: "asc",
            },
            include: {
              additional: true,
            },
          },
        },
      });

      additionalLinksByCategoryId = categoriesWithAdditionals.reduce(
        (acc, category) => {
          acc[category.id] = Array.isArray(category.additionalLinks)
            ? category.additionalLinks
            : [];
          return acc;
        },
        {} as Record<string, any[]>
      );
    } catch (additionalError) {
      console.error(
        "ERRO AO BUSCAR ADICIONAIS DO MENU (fallback ativado):",
        additionalError
      );
      additionalLinksByCategoryId = {};
    }

    const formatted = categories.map((category) => {
      const rawAdditionalLinks = additionalLinksByCategoryId[category.id] || [];

      const additionals = rawAdditionalLinks
        .map((link) => link.additional)
        .filter((additional) => additional && additional.active);

      const products = (category.productLinks || [])
        .map((link) => link.product)
        .filter((product) => product && product.active && product.inStock);

      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        type: category.type,
        selectionRequired: category.selectionRequired,
        active: category.active,
        sortOrder: category.sortOrder,
        additionals,
        products,
      };
    });

    return NextResponse.json(formatted, { status: 200 });
  } catch (error) {
    console.error("ERRO AO BUSCAR CARDÁPIO:", error);

    return NextResponse.json(
      {
        error: "Erro ao buscar cardápio",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}