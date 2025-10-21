import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { initializeAdminApp, admin } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  await initializeAdminApp();

  try {
    const sessionCookie = cookies().get("session")?.value;
    if (!sessionCookie) {
      // Asegúrate de eliminar la cookie si existe
      cookies().delete("session");
      return NextResponse.json({ status: "success", message: "No session found." });
    }

    const decodedToken = await admin.auth().verifySessionCookie(sessionCookie);
    await admin.auth().revokeRefreshTokens(decodedToken.uid);

    cookies().delete("session"); // Elimina la cookie correctamente

    return NextResponse.json({ status: "success" });

  } catch (error) {
    console.error("Session logout error:", error);
    cookies().delete("session"); // Elimina la cookie también si hubo error

    return NextResponse.json(
      { error: "Failed to log out." },
      { status: 500 }
    );
  }
}