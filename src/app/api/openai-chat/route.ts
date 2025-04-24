import { type NextRequest, NextResponse } from "next/server";

const edgeFunctionUrl = process.env.SUPABASE_EDGE_FUNCTION_URL_CHAT; // e.g., 'https://<project-ref>.supabase.co/functions/v1/analyze-room'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(req: NextRequest) {
	if (!edgeFunctionUrl || !supabaseAnonKey) return;

	try {
		const { prompt } = await req.json();

		if (!prompt || typeof prompt !== "string") {
			return NextResponse.json({ error: "Invalid prompt" }, { status: 400 });
		}

		const supabaseResponse = await fetch(edgeFunctionUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${supabaseAnonKey}`,
			},
			body: JSON.stringify({ prompt }),
		});

		if (!supabaseResponse.ok) {
			return NextResponse.json(
				{ error: "Failed to fetch from Supabase" },
				{ status: supabaseResponse.status },
			);
		}

		const responseData = await supabaseResponse.json();

		return NextResponse.json(responseData);
	} catch (error) {
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
