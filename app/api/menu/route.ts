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
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        type: true,
        selectionRequired: true,
        active: true,
        sortOrder: true,
        additionalLinks: {
          orderBy: {
            sortOrder: "asc",
          },
          select: {
            additional: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                price: true,
                required: true,
                active: true,
                sortOrder: true,
              },
            },
          },
        },
        productLinks: {
          orderBy: {
            sortOrder: "asc",
          },
          select: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                price: true,
                imageUrl: true,
                active: true,
                inStock: true,
                productAdditionalConfigs: {
                  orderBy: {
                    sortOrder: "asc",
                  },
                  select: {
                    additionalId: true,
                    required: true,
                    sortOrder: true,
                    additional: {
                      select: {
                        id: true,
                        name: true,
                        slug: true,
                        description: true,
                        price: true,
                        required: true,
                        active: true,
                        sortOrder: true,
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
      const additionals = (category.additionalLinks || [])
        .map((link) => link.additional)
        .filter((additional) => additional && additional.active);

      const products = (category.productLinks || [])
        .map((link) => link.product)
        .filter((product) => product && product.active && product.inStock)
        .map((product) => ({
          ...product,
          productAdditionalConfigs: (product.productAdditionalConfigs || []).filter(
            (config) => config.additional?.active !== false
          ),
        }));

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

    return NextResponse.json(formatted, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
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