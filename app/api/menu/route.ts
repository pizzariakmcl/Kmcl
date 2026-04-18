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
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    const formatted = categories.map((category) => {
      const products =
        category.productLinks
          ?.map((link) => link.product)
          .filter(Boolean) || [];

      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        products,
      };
    });

    return NextResponse.json(formatted, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("ERRO MENU:", error);

    return NextResponse.json(
      { error: "Erro ao carregar menu" },
      { status: 500 }
    );
  }
}