import { NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    let settings = await prisma.settings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      // Criar configurações padrão se não existir
      settings = await prisma.settings.create({
        data: {
          id: "default",
          cityName: "Município",
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Erro ao buscar configurações:", error);
    return NextResponse.json(
      { error: "Erro ao buscar configurações" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const data = await request.json();
    
    // Buscar configuração anterior para audit log
    const oldSettings = await prisma.settings.findUnique({
      where: { id: "default" },
    });

    const updateData: any = {
      cityName: data.cityName,
    };

    if (data.secretaryName !== undefined) updateData.secretaryName = data.secretaryName;
    if (data.lawsText !== undefined) updateData.lawsText = data.lawsText;
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.stateName !== undefined) updateData.stateName = data.stateName;

    const settings = await prisma.settings.upsert({
      where: { id: "default" },
      update: updateData,
      create: {
        id: "default",
        ...updateData,
      },
    });

    // Log da alteração
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_SETTINGS",
        resource: "settings",
        details: JSON.stringify({
          old: oldSettings,
          new: settings,
        }),
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Erro ao atualizar configurações:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar configurações" },
      { status: 500 }
    );
  }
}
