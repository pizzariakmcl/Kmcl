import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Arquivo não enviado" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Envie apenas arquivos de imagem" },
        { status: 400 }
      );
    }

    const maxSizeInBytes = 5 * 1024 * 1024;

    if (file.size > maxSizeInBytes) {
      return NextResponse.json(
        { error: "A imagem deve ter no máximo 5MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const base64 = buffer.toString("base64");
    const mime = file.type;

    const imageUrl = `data:${mime};base64,${base64}`;

    return NextResponse.json(
      { url: imageUrl },
      { status: 200 }
    );
  } catch (error) {
    console.error("ERRO NO UPLOAD:", error);

    return NextResponse.json(
      {
        error: "Erro ao fazer upload da imagem",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}