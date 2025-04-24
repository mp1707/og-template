
//WORKING


// Ensure EdgeRuntime is correctly imported or available globally in Supabase Edge Functions
// If needed: import * as EdgeRuntime from "jsr:@supabase/functions-js/edge-runtime.d.ts";
// Check the correct way to access EdgeRuntime in your environment. It might be globally available.
import { createClient } from "jsr:@supabase/supabase-js@2";
import OpenAI from "npm:openai";
console.log("Function initializing...");
// --- Environment Variable Checks ---
const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
let envVarsValid = true;
if (!openAIApiKey) {
  console.error("CRITICAL: Missing environment variable: OPENAI_API_KEY");
  envVarsValid = false;
}
if (!supabaseUrl) {
  console.error("CRITICAL: Missing environment variable: SUPABASE_URL");
  envVarsValid = false;
}
if (!supabaseServiceRoleKey) {
  console.error("CRITICAL: Missing environment variable: SUPABASE_SERVICE_ROLE_KEY");
  envVarsValid = false;
}
// --- Initialize Clients ---
// Initialize outside the handler for potential reuse if the function instance persists.
let supabaseClient = null;
let openai = null;
if (envVarsValid) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    console.log("Supabase client initialized successfully.");
  } catch (error) {
    console.error("CRITICAL: Failed to initialize Supabase client:", error);
  // Depending on Supabase policy, the function might not even start if this fails critically.
  }
  try {
    // Ensure the property name for the key is correct for the OpenAI SDK version
    openai = new OpenAI({
      apiKey: openAIApiKey
    });
    console.log("OpenAI client initialized successfully.");
  } catch (error) {
    console.error("CRITICAL: Failed to initialize OpenAI client:", error);
  }
} else {
  console.error("CRITICAL: Cannot initialize clients due to missing environment variables.");
// The function might still run but will fail requests.
}
Deno.serve(async (req)=>{
  console.log(`Received request: ${req.method} ${req.url}`);
  // --- Check if clients are available ---
  // If critical env vars were missing, clients will be null.
  if (!supabaseClient || !openai) {
    console.error("Cannot handle request: Supabase or OpenAI client not initialized (check env vars).");
    return new Response(JSON.stringify({
      error: "Internal Server Error: Service configuration error."
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
  // --- Request Body Parsing and Validation ---
  let imageUrl;
  let userId;
  let jobId;
  try {
    const body = await req.json();
    imageUrl = body.imageUrl;
    userId = body.userId;
    jobId = body.jobId;
    // Validate required fields
    if (!imageUrl || typeof imageUrl !== "string") {
      throw new Error("Missing or invalid 'imageUrl' in request body.");
    }
    if (!userId || typeof userId !== "string") {
      throw new Error("Missing or invalid 'userId' in request body.");
    }
    if (!jobId || typeof jobId !== "string") {
      throw new Error("Missing or invalid 'jobId' in request body.");
    }
    console.log(`[Job ${jobId}] Request body parsed successfully. User: ${userId}, ImageURL: ${imageUrl.substring(0, 50)}...`);
  } catch (error) {
    console.error("Failed to parse request body or missing/invalid fields:", error);
    return new Response(JSON.stringify({
      error: `Bad Request: ${error.message}`
    }), {
      status: 400,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
  // --- *** Insert Initial Job Record *** ---
  try {
    console.log(`[Job ${jobId}] Attempting to insert initial job record.`);
    const initialJobData = {
      id: jobId,
      user_id: userId,
      image_url: imageUrl,
      status: 'pending'
    };
    const { error: insertError } = await supabaseClient.from('ai_jobs').insert(initialJobData);
    if (insertError) {
      // Handle potential errors like duplicate jobId if 'id' is primary key
      console.error(`[Job ${jobId}] CRITICAL: Failed to insert initial job record. Supabase Error:`, insertError);
      // Determine appropriate status code (e.g., 409 Conflict for duplicate key)
      const statusCode = insertError.code === '23505' ? 409 : 500; // 23505 is unique_violation for PostgreSQL
      return new Response(JSON.stringify({
        error: `Failed to create job record: ${insertError.message}`,
        details: insertError.details // Optional: provide more detail
      }), {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`[Job ${jobId}] Initial job record inserted successfully with status 'pending'.`);
  } catch (error) {
    console.error(`[Job ${jobId}] CRITICAL: Unexpected error during initial job insert:`, error);
    return new Response(JSON.stringify({
      error: "Internal Server Error: Failed to initialize job."
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  // --- Background Task Definition ---
  const analysisTask = async ()=>{
    const taskStartTime = Date.now();
    console.log(`[Job ${jobId}] Starting background analysis.`);
    // Helper to update job status, simplifying error handling within the task
    // Now respects the table structure and automatic updated_at
    const updateJob = async (status, data = {})=>{
      console.log(`[Job ${jobId}] Attempting to update job status to '${status}'.`);
      // Construct the update payload, excluding updated_at
      const updatePayload = {
        status,
        ...data
      };
      const { error } = await supabaseClient.from("ai_jobs") // Correct table name
      .update(updatePayload) // Pass the payload
      .eq("id", jobId); // Match the job ID
      if (error) {
        console.error(`[Job ${jobId}] CRITICAL: Failed to update job status to '${status}'. Supabase Error: ${error.message}`);
      } else {
        console.log(`[Job ${jobId}] Job status successfully updated to '${status}'.`);
      }
      return !error; // Return success status
    };
    try {
      // 1. Update job status to 'processing'
      // Adding started_at manually if you need it, otherwise remove it.
      // created_at should already be set when the job was initially inserted.
      if (!await updateJob("processing", {})) {
        console.warn(`[Job ${jobId}] Could not update status to 'processing', attempting analysis anyway.`);
      }
      // 2. Call OpenAI API
      console.log(`[Job ${jobId}] Calling OpenAI API (model: gpt-4o)`);
      const response = await openai.responses.create({
        model: "gpt-4o",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: "what's in this image?"
              },
              {
                type: "input_image",
                image_url: imageUrl
              }
            ]
          }
        ]
      });
      const resultText = response.output_text;
      console.log(resultText);
      if (!resultText) {
        console.error(`[Job ${jobId}] OpenAI response missing expected content. Response:`, JSON.stringify(response, null, 2));
        throw new Error("Invalid or empty response received from OpenAI.");
      }
      console.log(`[Job ${jobId}] Received analysis from OpenAI.`);
      // 3. Update job with the result -> 'completed'
      // Update 'result' and clear 'error'
      await updateJob("completed", {
        result: resultText,
        error: null
      });
      const duration = (Date.now() - taskStartTime) / 1000;
      console.log(`[Job ${jobId}] Analysis task completed successfully in ${duration.toFixed(2)} seconds.`);
    } catch (error) {
      // --- Central Error Handling for analysisTask ---
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during analysis.";
      console.error(`[Job ${jobId}] ERROR during analysis task: ${errorMessage}`);
      if (error.stack) {
        console.error(`[Job ${jobId}] Stack Trace: ${error.stack}`);
      }
      // Attempt to update the job status to 'failed'
      // Update 'error' and clear 'result'
      await updateJob("failed", {
        error: errorMessage.substring(0, 1000),
        result: null
      });
      const duration = (Date.now() - taskStartTime) / 1000;
      console.log(`[Job ${jobId}] Analysis task failed after ${duration.toFixed(2)} seconds.`);
    }
  };
  // --- Schedule the Background Task ---
  try {
    if (typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime.waitUntil === "function") {
      EdgeRuntime.waitUntil(analysisTask());
      console.log(`[Job ${jobId}] Analysis task scheduled via EdgeRuntime.waitUntil.`);
    } else {
      console.warn(`[Job ${jobId}] EdgeRuntime.waitUntil not available. Running task asynchronously without guarantee.`);
      analysisTask().catch((err)=>{
        console.error(`[Job ${jobId}] Unhandled error in fallback async task execution:`, err);
      });
    }
  } catch (schedulingError) {
    console.error(`[Job ${jobId}] Failed to schedule background task:`, schedulingError.message);
    // Attempt to mark the job as failed immediately since it won't run
    try {
      // Update 'status' and 'error' columns
      await supabaseClient.from("ai_jobs").update({
        status: "failed",
        error: `Failed to schedule background task: ${schedulingError.message}`.substring(0, 1000)
      }).eq("id", jobId); // Match the job ID
    } catch (dbError) {
      console.error(`[Job ${jobId}] Failed to update job status to 'failed' even after scheduling error:`, dbError.message);
    }
    // Return an error response
    return new Response(JSON.stringify({
      error: "Internal Server Error: Failed to schedule job."
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
  // --- Respond immediately ---
  // 202 Accepted is more appropriate for background tasks
  console.log(`[Job ${jobId}] Sending 202 Accepted response.`);
  return new Response(JSON.stringify({
    message: "Job accepted for processing",
    jobId: jobId
  }), {
    status: 202,
    headers: {
      "Content-Type": "application/json"
    }
  });
});
console.log("Function handler setup complete. Waiting for requests...");
