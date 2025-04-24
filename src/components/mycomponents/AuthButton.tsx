"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button"; // Adjust import path if needed
import { Skeleton } from "@/components/ui/skeleton"; // Import Shadcn Skeleton
import { createClient } from "@/lib/supabase/client";

interface AuthButtonProps {
	initialUser: User | null;
}

export default function AuthButton({ initialUser }: AuthButtonProps) {
	const router = useRouter();
	const supabase = createClient();
	const [user, setUser] = useState<User | null>(initialUser);
	const [loading, setLoading] = useState(true); // New loading state
	const [redirecting, setRedirecting] = useState(false); // New redirecting state

	useEffect(() => {
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, session) => {
			setUser(session?.user ?? null);
			if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
				router.refresh();
			}
			setLoading(false); // Set loading to false after auth state is determined
		});

		// Initial check for user session
		supabase.auth.getSession().then(({ data: { session } }) => {
			setUser(session?.user ?? null);
			setLoading(false); // Set loading to false after initial session check
		});

		return () => {
			subscription?.unsubscribe();
		};
	}, [supabase, router]);

	const handleLogin = () => {
		router.push("/auth/login");
	};

	const handleLogout = async () => {
		setRedirecting(true); // Set redirecting state to true
		await supabase.auth.signOut();
		router.push("/auth/login"); // Redirect to login page
	};

	if (loading || redirecting) {
		return <Skeleton className="h-8 w-18" />; // Render Skeleton while loading or redirecting
	}

	return user ? (
		<div className="flex items-center gap-2">
			<span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">
				{user.email?.split("@")[0] ?? "User"}
			</span>
			<Button
				variant="ghost"
				size="sm"
				className="cursor-pointer"
				onClick={handleLogout}
			>
				Logout
			</Button>
		</div>
	) : (
		<Button onClick={handleLogin} variant="ghost" className="cursor-pointer">
			Login
		</Button>
	);
}
