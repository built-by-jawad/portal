import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// One-time bootstrap: creates the very first ADMIN profile. Self-disables once any Profile
// row exists, so it's safe to leave deployed — hit it once via curl/Postman after running the
// migration, then it 409s forever after.
export async function POST(request: NextRequest) {
  const count = await prisma.profile.count();
  if (count > 0) {
    return NextResponse.json({ error: "A profile already exists. Bootstrap is disabled." }, { status: 409 });
  }

  const { name, email, password } = await request.json();
  if (!name || !email || !password) {
    return NextResponse.json({ error: "name, email, and password are required" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const profile = await prisma.profile.create({
    data: { name, email: String(email).toLowerCase(), passwordHash, role: "ADMIN" },
  });

  return NextResponse.json({ id: profile.id, email: profile.email });
}
