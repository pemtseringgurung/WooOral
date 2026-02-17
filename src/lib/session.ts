import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = "woo_session";
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

/**
 * Set the session cookie after a successful login.
 */
export async function setSessionCookie(role: string, response: NextResponse): Promise<NextResponse> {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, role, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE,
        path: "/",
    });
    return response;
}

/**
 * Verify that the request has a valid admin session.
 * Returns null if valid, or a 401 NextResponse if not.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
    const cookieStore = await cookies();
    const session = cookieStore.get(COOKIE_NAME);

    if (!session || session.value !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return null;
}
