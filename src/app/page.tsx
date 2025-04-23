"use client";

import Footer from "@/components/mycomponents/Footer";
import { OpenAIPostForm } from "@/components/mycomponents/OpenAIPostForm";
import Navbar from "@/components/mycomponents/Navbar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useForm } from "react-hook-form";

export default function Home() {
	const form = useForm();
	return (
		<div className="flex flex-col items-center justify-between min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] relative">
			<main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start h-full">
				<Navbar className="absolute top-4 right-4" />
				<div className="md:w-lg">
					<OpenAIPostForm />
				</div>
			</main>
			<Footer />
		</div>
	);
}
