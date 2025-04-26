import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/logout-button";
import { createClient } from "@/lib/supabase/server";
import { OpenAIImageForm } from "@/components/mycomponents/OpenAIImageForm";
import Navbar from "@/components/mycomponents/Navbar";

export default async function ProtectedPage() {
	const supabase = await createClient();

	const { data, error } = await supabase.auth.getUser();
	if (error || !data?.user) {
		redirect("/auth/login");
	}

	const userId = data.user.id;

	return (
		<div className="flex flex-col items-center justify-between min-h-screen p-4 md:p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] relative">
			<main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start h-full md:w-lg">
				<Navbar />
				<p>
					Hello <span>{data.user.email}</span>
				</p>
				<OpenAIImageForm userId={userId} />
			</main>
		</div>
	);
}
