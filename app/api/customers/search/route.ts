import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim() || "";

    if (!q) {
      return NextResponse.json([], { status: 200 });
    }

    const digits = onlyDigits(q);

    const customers = await prisma.customer.findMany({
  where: {
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { whatsapp: { contains: digits } },
      { cpf: { contains: digits } }, // 👈 ESSENCIAL
    ],
  },
  take: 10,
});

    return NextResponse.json(customers, { status: 200 });
  } catch (error) {
    console.error("ERRO AO BUSCAR CLIENTES:", error);
    return NextResponse.json(
      { error: "Erro ao buscar clientes" },
      { status: 500 }
    );
  }
}