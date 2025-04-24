import Footer from "@/components/mycomponents/Footer";
import Navbar from "@/components/mycomponents/Navbar";
import { OpenAIImageForm } from "@/components/mycomponents/OpenAIImageForm";
import { OpenAIPromptForm } from "@/components/mycomponents/OpenAIPromptForm";

export default function Home() {
	return (
		<div className="flex flex-col items-center justify-between min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] relative">
			<main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start h-full">
				<Navbar />
				<div className="md:w-lg">
					<OpenAIPromptForm />
				</div>
			</main>
		</div>
	);
}
