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
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
	prompt: z.string().min(2, {
		message: "Prompt must be at least 2 characters.",
	}),
});

// READ https://ui.shadcn.com/docs/components/form how to use the form component

export function OpenAIPromptForm() {
	const [responseText, setResponseText] = useState<string | null>(null);

	// 1. Define your form.
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			prompt: "",
		},
	});

	const onSubmit = async (data: z.infer<typeof formSchema>) => {
		try {
			const response = await fetch("/api/openai-chat", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ prompt: data.prompt }),
			});

			if (!response.ok) {
				throw new Error(
					`Failed to fetch response: ${response.status} ${response.statusText}`,
				);
			}


			const contentType = response.headers.get("content-type");
			if (!contentType || !contentType.includes("application/json")) {
				throw new Error(`Invalid response format: Expected JSON and got ${contentType}`);

			}

			const result = await response.json();
			setResponseText(result.output_text);
		} catch (error) {
			console.error("Error:", error);
			setResponseText("An error occurred while fetching the response.");
		}
	};

	return (
		<>
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="space-y-4 flex flex-col items-end"
				>
					<FormField
						control={form.control}
						name="prompt"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>OpenAI Prompt</FormLabel>
								<FormControl>
									<Input placeholder="type something" autoComplete="off" {...field} />
								</FormControl>
								<FormDescription>
									This will be used to generate a response from OpenAI via
									Supabase EdgeFunction.
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
					<Button type="submit">Submit</Button>
				</form>
			</Form>
			{responseText && <Separator className="my-4" />}
			<span>{responseText}</span>
		</>
	);
}
