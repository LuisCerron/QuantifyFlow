import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { initializeAdminApp, admin } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  await initializeAdminApp();

  try {
    const sessionCookie = cookies().get("session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ status: "success", message: "No session found." });
    }

    const decodedToken = await admin.auth().verifySessionCookie(sessionCookie);
    await admin.auth().revokeRefreshTokens(decodedToken.uid);

    cookies().set("session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0, // Expira inmediatamente
      path: '/',
    });

    return NextResponse.json({ status: "success" });

  } catch (error) {
    console.error("Session logout error:", error);
    cookies().set("session", "", { maxAge: 0, path: '/' });
    
    return NextResponse.json(
      { error: "Failed to log out." },
      { status: 500 }
    );
  }
}