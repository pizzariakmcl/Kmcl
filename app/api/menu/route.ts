import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: {
        active: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
      include: {
        // 🔥 ADICIONAIS DIRETO NA MESMA QUERY
        additionalLinks: {
          orderBy: {
            sortOrder: "asc",
          },
          include: {
            additional: {
              where: {
                active: true,
              },
            },
          },
        },

        // 🔥 PRODUTOS OTIMIZADOS
        productLinks: {
          orderBy: {
            sortOrder: "asc",
          },
          include: {
            product: {
              where: {
                active: true,
                inStock: true,
              },
              include: {
                productAdditionalConfigs: {
                  orderBy: {
                    sortOrder: "asc",
                  },
                  include: {
                    additional: {
                      where: {
                        active: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const formatted = categories.map((category) => {
      const additionals =
        category.additionalLinks
          ?.map((link) => link.additional)
          .filter(Boolean) || [];

      const products =
        category.productLinks
          ?.map((link) => link.product)
          .filter(Boolean) || [];

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

    // 🔥 CACHE (ESSENCIAL PRA VELOCIDADE NA VERCEL)
    return NextResponse.json(formatted, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("ERRO AO BUSCAR CARDÁPIO:", error);

    return NextResponse.json(
      {
        error: "Erro ao buscar cardápio",
      },
      { status: 500 }
    );
  }
}