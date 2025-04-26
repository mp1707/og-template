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
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { supaBaseJsClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { ModeToggle } from "@/components/mycomponents/ModeToggle";

interface JobData {
	id: number;
	status: string;
	error: string | null;
	result: string | null;
}

const formSchema = z.object({
	image: z.instanceof(File, { message: "Please upload a valid image file." }),
});

export function OpenAIImageForm({ userId }: { userId: string }) {
	const [jobData, setJobData] = useState<JobData | null>(null);
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [isUploading, setIsUploading] = useState(false);


	const showSubmitButton = !jobData && !isAnalyzing && !isUploading;

	// Realtime subscription to listen for updates
	useEffect(() => {
		const channel = subscribeToJobUpdates(setJobData, setIsAnalyzing);
		return () => {
			supaBaseJsClient.removeChannel(channel);
		};
	}, []);

	// Shadcn Form Setup
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: { image: undefined },
	});

	// trigger image analysis that is running in Supabase EdgeRuntime.waitUntil(analysisTask());
	const onSubmit = async (data: z.infer<typeof formSchema>) => {
		try {
			const fileName = await uploadImage(
				data.image,
				setIsUploading,
				setIsAnalyzing,
			);
			const publicUrl = getPublicUrl(fileName);
			setImageUrl(publicUrl);
			await triggerImageAnalysis(publicUrl, userId);
		} catch (error) {
			// console.error("Error:", error);
		}
	};

	return (
		<Card>
			<CardContent className="space-y-6">
				{imageUrl ? (
					<Image
						src={imageUrl}
						alt="Uploaded Image"
						width={300}
						height={300}
						className="rounded-lg h-64 w-full object-cover"
					/>
				) : (
					<Skeleton className="rounded-lg h-64 w-full flex items-center justify-center">
						{isUploading ? "...uploading" : "Please upload an image"}
					</Skeleton>
				)}
				<ModeToggle />
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
										<Input
											type="file"
											accept="image/*"
											className="cursor-pointer"
											onChange={(e) => {
												setJobData(null);
												setImageUrl(null);
												field.onChange(e.target.files?.[0] || null);
											}}
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
						{showSubmitButton && (
							<Button type="submit" className="w-full cursor-pointer">
								Submit
							</Button>
						)}
					</form>
				</Form>
				<Separator className="my-4" />
				{jobData?.error && (
					<div className="text-sm text-red-500 font-medium">
						{jobData.error}
					</div>
				)}
				{jobData?.result && (
					<div className="text-sm text-green-500 font-medium">
						{jobData.result}
					</div>
				)}
				{isAnalyzing && (
					<div className="flex items-center space-x-2">
						<div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
						<span className="text-sm text-yellow-500 font-medium">
							Analyzing...
						</span>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function subscribeToJobUpdates(
	setJobData: React.Dispatch<React.SetStateAction<JobData | null>>,
	setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
) {
	return supaBaseJsClient
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

async function uploadImage(
	image: File,
	setIsUploading: React.Dispatch<React.SetStateAction<boolean>>,
	setIsAnalyzing: React.Dispatch<React.SetStateAction<boolean>>,
): Promise<string> {
	setIsUploading(true);
	const fileName = `${Date.now()}-${image.name}`;
	console.log(">>> vor upload", {
		fileName,
		image,
		third: { contentType: image.type, upsert: false },
	});

	const { error: uploadError } = await supaBaseJsClient.storage
		.from("imageinputs")
		.upload(fileName, image, {
			contentType: image.type,
			upsert: false,
		});
	console.log(">>> nach upload");

	if (uploadError) {
		setIsUploading(false);
		throw uploadError;
	}
	setIsUploading(false);
	// analysis is triggered in Supabase EdgeFunction Background Job after upload
	setIsAnalyzing(true);
	return fileName;
}

function getPublicUrl(fileName: string): string {
	const { data: publicUrlData } = supaBaseJsClient.storage
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
