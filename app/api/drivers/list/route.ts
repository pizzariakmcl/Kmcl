import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const drivers = await prisma.driver.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(drivers, { status: 200 });
  } catch (error: any) {
    console.error("ERRO LIST DRIVERS:", error);

    return NextResponse.json(
      {
        error: "Erro ao listar motoqueiros",
        details: error?.message || "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}