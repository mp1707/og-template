"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";

interface JobData {
	id: number;
	status: string;
	error: string | null;
	result: string | null;
}

const formSchema = z.object({
	image: z.instanceof(File, { message: "Please upload a valid image file." }),
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error("Error.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function OpenAIImageForm({ userId }: { userId: string }) {
	const [jobData, setJobData] = useState<JobData | null>(null);
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	// Realtime subscription to listen for updates
	useEffect(() => {
		const channel = subscribeToJobUpdates(setJobData, setIsLoading);
		return () => {
			supabase.removeChannel(channel);
		};
	}, []);

	// Shadcn Form Setup
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: { image: undefined },
	});

	// trigger image analysis that is running in Supabase EdgeRuntime.waitUntil(analysisTask());
	const onSubmit = async (data: z.infer<typeof formSchema>) => {
		setIsLoading(true);
		try {
			const fileName = await uploadImage(data.image);
			const publicUrl = getPublicUrl(fileName);
			setImageUrl(publicUrl);
			await triggerImageAnalysis(publicUrl, userId);
		} catch (error) {
			// console.error("Error:", error);
		}
	};

	return (
		<div className="p-6 bg-white rounded-lg shadow-md space-y-6">
			{imageUrl && (
				<Image
					src={imageUrl}
					alt="Uploaded Image"
					width={300}
					height={300}
					className="rounded-lg"
				/>
			)}
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
					<FormField
						control={form.control}
						name="image"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="text-lg font-medium">
									Upload Image
								</FormLabel>
								<FormControl>
									<input
										type="file"
										accept="image/*"
										className="block w-full p-2 text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
										onChange={(e) =>
											field.onChange(e.target.files?.[0] || null)
										}
									/>
								</FormControl>
								<FormDescription className="text-sm text-gray-500">
									Upload an image to analyze using OpenAI via Supabase
									EdgeFunction Background Job.
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
					<Button type="submit" className="w-full cursor-pointer">
						Submit
					</Button>
				</form>
			</Form>
			<Separator className="my-4" />
			{jobData?.error && (
				<div className="text-sm text-red-500 font-medium">{jobData.error}</div>
			)}
			{jobData?.result && (
				<div className="text-sm text-green-500 font-medium">
					{jobData.result}
				</div>
			)}
			{isLoading && (
				<div className="flex items-center space-x-2">
					<div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
					<span className="text-sm text-yellow-500 font-medium">
						Processing...
					</span>
				</div>
			)}
		</div>
	);
}

function subscribeToJobUpdates(
	setJobData: React.Dispatch<React.SetStateAction<JobData | null>>,
	setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
) {
	return supabase
		.channel("schema-db-changes")
		.on(
			"postgres_changes",
			{
				event: "UPDATE",
				schema: "public",
				table: "ai_jobs",
			},
			(payload) => {
				payload.new.status === "completed" && setIsLoading(false);
				setJobData(payload.new as JobData);
			},
		)
		.subscribe();
}

async function uploadImage(image: File): Promise<string> {
	const fileName = `${Date.now()}-${image.name}`;
	const { error: uploadError } = await supabase.storage
		.from("imageinputs")
		.upload(fileName, image, {
			contentType: image.type,
			upsert: false,
		});

	if (uploadError) {
		throw uploadError;
	}

	return fileName;
}

function getPublicUrl(fileName: string): string {
	const { data: publicUrlData } = supabase.storage
		.from("imageinputs")
		.getPublicUrl(fileName);

	if (!publicUrlData?.publicUrl) {
		throw new Error("Failed to retrieve public URL after upload.");
	}

	return publicUrlData.publicUrl;
}

async function triggerImageAnalysis(
	imageUrl: string,
	userId: string,
): Promise<void> {
	const jobId = crypto.randomUUID();
	const response = await fetch("/api/openai-image-analysis", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			imageUrl,
			userId,
			jobId,
		}),
	});

	if (!response.ok) {
		throw new Error(
			`Failed to fetch response: ${response.status} ${response.statusText}`,
		);
	}
}
