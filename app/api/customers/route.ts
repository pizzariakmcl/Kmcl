import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function onlyDigits(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const name = String(body?.name || "").trim();
    const cpf = onlyDigits(body?.cpf);
    const whatsapp = onlyDigits(body?.whatsapp);
    const email = body?.email ? String(body.email).trim() : null;
    const cep = onlyDigits(body?.cep);
    const address = body?.address ? String(body.address).trim() : null;
    const number = body?.number ? String(body.number).trim() : null;
    const complement = body?.complement ? String(body.complement).trim() : null;
    const neighborhood = body?.neighborhood
      ? String(body.neighborhood).trim()
      : null;
    const city = body?.city ? String(body.city).trim() : null;

    if (!name) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    if (!whatsapp) {
      return NextResponse.json(
        { error: "WhatsApp é obrigatório" },
        { status: 400 }
      );
    }

    const existingCustomer = await prisma.customer.findFirst({
      where: { whatsapp },
    });

    if (existingCustomer) {
      return NextResponse.json(
        { error: "Já existe cliente com esse WhatsApp" },
        { status: 409 }
      );
    }

    if (cpf) {
      const existingCpf = await prisma.customer.findFirst({
        where: { cpf },
      });

      if (existingCpf) {
        return NextResponse.json(
          { error: "Já existe cliente com esse CPF" },
          { status: 409 }
        );
      }
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        cpf: cpf || null,
        whatsapp,
        email,
        cep: cep || null,
        address,
        number,
        complement,
        neighborhood,
        city,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error("ERRO AO CRIAR CLIENTE:", error);
    return NextResponse.json(
      { error: "Erro ao criar cliente" },
      { status: 500 }
    );
  }
}