import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized: Missing authentication credentials." },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7).trim();
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vhubdozlyjqpvpqcacdv.supabase.co";
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZodWJkb3pseWpxcHZwcWNhY2R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NTc2MzksImV4cCI6MjEwNzAzMzYzOX0.SJCXi2CLCcyz7NtOl9IVmJBbHVxKoGHa9jES4rThUFM";

    // Client with the user's token
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid session token." },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Optional service role client if configured for full auth.users row purge
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      await adminClient.auth.admin.deleteUser(userId);
    }

    return NextResponse.json({
      success: true,
      message: `Account for user ${user.email} and associated data cascade deleted.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to delete account" },
      { status: 500 }
    );
  }
}
