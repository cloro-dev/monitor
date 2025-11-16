import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const updatePromptSchema = z.object({
  text: z.string().min(10, "Prompt must be at least 10 characters").max(200, "Prompt must be at most 200 characters"),
  country: z.string().min(1, "Country is required"),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updatePromptSchema.parse(body);

    // Check if the prompt exists and belongs to the user
    const existingPrompt = await prisma.prompt.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!existingPrompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    const updatedPrompt = await prisma.prompt.update({
      where: {
        id: id,
      },
      data: {
        text: validatedData.text,
        country: validatedData.country,
      },
      select: {
        id: true,
        text: true,
        country: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedPrompt);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 });
    }

    console.error("Error updating prompt:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if the prompt exists and belongs to the user
    const existingPrompt = await prisma.prompt.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!existingPrompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    await prisma.prompt.delete({
      where: {
        id: id,
      },
    });

    return NextResponse.json({ message: "Prompt deleted successfully" });
  } catch (error) {
    console.error("Error deleting prompt:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}