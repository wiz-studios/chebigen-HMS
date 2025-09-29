import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  // Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect logic for HMS routes
  if (
    request.nextUrl.pathname !== "/" &&
    !user &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    !request.nextUrl.pathname.startsWith("/setup") &&
    !request.nextUrl.pathname.startsWith("/superadmin-login")
  ) {
    console.log("Middleware redirecting to login:", request.nextUrl.pathname)
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  if (user && (request.nextUrl.pathname.startsWith("/auth") || request.nextUrl.pathname === "/")) {
    // Get user role to redirect to appropriate dashboard
    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single()

    const url = request.nextUrl.clone()

    if (userData?.role === "superadmin") {
      url.pathname = "/superadmin"
    } else if (userData?.role === "patient") {
      url.pathname = "/patient"
    } else {
      url.pathname = "/dashboard"
    }

    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
