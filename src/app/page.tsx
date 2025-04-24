import Footer from "@/components/mycomponents/Footer";
import { OpenAIPostForm } from "@/components/mycomponents/OpenAIPostForm";

export default function Home() {
	return (
		<div className="flex flex-col items-center justify-between min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] relative">
			<main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start h-full">
				<div className="md:w-lg">
					<OpenAIPostForm />
				</div>
			</main>
			<Footer />
		</div>
	);
}
