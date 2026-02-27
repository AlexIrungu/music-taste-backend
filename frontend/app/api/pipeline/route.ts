import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL!

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get("access_token")?.value

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const range = request.nextUrl.searchParams.get("range") ?? "medium_term"

  try {
    const res = await fetch(
      `${BACKEND_URL}/spotify/data-pipeline?time_range=${range}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    )
    if (!res.ok) return NextResponse.json({ error: "Upstream error" }, { status: res.status })
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 })
  }
}
