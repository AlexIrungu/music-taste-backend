import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL!

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(new URL("/?error=auth_failed", request.url))
  }

  let tokens: { access_token: string; refresh_token: string; expires_in: number }
  try {
    const res = await fetch(`${BACKEND_URL}/spotify/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
    if (!res.ok) throw new Error("Token exchange failed")
    tokens = await res.json()
  } catch {
    return NextResponse.redirect(new URL("/?error=token_exchange_failed", request.url))
  }

  // Return a 200 HTML response that sets cookies then redirects via JS.
  // NextResponse.redirect() has a known issue in Next.js 15+ where Set-Cookie
  // headers are not reliably forwarded to the browser before the redirect fires.
  // A 200 response guarantees the browser processes Set-Cookie before navigating.
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : ""

  const html = `<!DOCTYPE html>
<html>
  <head>
    <script>window.location.replace('/dashboard')</script>
  </head>
  <body>Redirecting...</body>
</html>`

  const response = new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  })

  response.headers.append(
    "Set-Cookie",
    `access_token=${tokens.access_token}; Path=/; HttpOnly; Max-Age=${tokens.expires_in}; SameSite=Lax${secure}`
  )
  response.headers.append(
    "Set-Cookie",
    `refresh_token=${tokens.refresh_token}; Path=/; HttpOnly; Max-Age=2592000; SameSite=Lax${secure}`
  )

  return response
}
