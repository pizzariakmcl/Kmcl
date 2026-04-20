import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const name = String(body?.name || "").trim();
    const whatsapp = String(body?.whatsapp || "").trim();

    if (!name) {
      return NextResponse.json(
        { error: "Nome do motoqueiro é obrigatório" },
        { status: 400 }
      );
    }

    if (!whatsapp) {
      return NextResponse.json(
        { error: "WhatsApp do motoqueiro é obrigatório" },
        { status: 400 }
      );
    }

    const driver = await prisma.driver.create({
      data: {
        name,
        whatsapp,
        active: true,
      },
    });

    return NextResponse.json(driver, { status: 201 });
  } catch (error: any) {
    console.error("ERRO CREATE DRIVER:", error);

    return NextResponse.json(
      {
        error: "Erro ao criar motoqueiro",
        details: error?.message || "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}