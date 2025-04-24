import { type NextRequest, NextResponse } from "next/server";

const edgeFunctionUrl = process.env.SUPABASE_EDGE_FUNCTION_URL_IMAGE; // e.g., 'https://<project-ref>.supabase.co/functions/v1/analyze-room'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;


export async function POST(req: NextRequest) {
	if (!edgeFunctionUrl || !supabaseAnonKey) {
		return NextResponse.json(
			{ error: "Missing configuration" },
			{ status: 500 },
		);
	}

	try {
		const { imageUrl, userId, jobId } = await req.json();

		if (!imageUrl || typeof imageUrl !== "string") {
			return NextResponse.json({ error: "Invalid imageUrl" }, { status: 400 });
		}

		const supabaseResponse = await fetch(edgeFunctionUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${supabaseAnonKey}`,
			},
			body: JSON.stringify({
				imageUrl: imageUrl,
				userId: userId,
				jobId: jobId,
			}),
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
