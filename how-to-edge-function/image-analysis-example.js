// supabase/functions/analyze-room/index.ts
import OpenAI from "npm:openai"; // Use npm specifier for Deno compatibility
// Define CORS headers - Adjust '*' for production to your specific frontend URL
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
// Define the exact same schema as before
const interiorDesignSchema = {
  type: "object",
  properties: {
    layoutAndFunctionality: {
      type: "string",
      description: "Suggestions for improving room layout, pathways, and functional zones based *strictly* on the image, considering principles like flow, balance, scale, and efficient use of space. Mention if specific aspects can't be assessed."
    },
    lightingConcept: {
      type: "string",
      description: "Suggestions for optimizing lighting (ambient, accent, task) based *strictly* on the image, considering mood, functionality, emphasis, and principles like contrast and harmony. Mention if specific aspects can't be assessed."
    },
    colorScheme: {
      type: "string",
      description: "Ideas for color schemes (walls, large surfaces, accents) based *strictly* on the image, considering mood, unity, harmony, contrast, and rhythm. Mention if specific aspects can't be assessed."
    },
    keyFurniture: {
      type: "string",
      description: "Recommendations for selecting, styling, and placing key furniture pieces based *strictly* on the image, considering scale, proportion relative to the space, style unity, visual balance, and potential as a focal point (emphasis). Mention if specific aspects can't be assessed."
    },
    textilesAndMaterials: {
      type: "string",
      description: "Suggestions for textiles (rugs, curtains, cushions) and materials based *strictly* on the image, considering how texture, pattern, and color contribute to unity, contrast, rhythm, and overall mood. Mention if specific aspects can't be assessed."
    },
    orderAndStorage: {
      type: "string",
      description: "Ideas for improving organization and storage solutions based *strictly* on the image, considering efficient use of space and contributing to visual harmony and clarity. Mention if specific aspects can't be assessed."
    },
    personalTouchAndDecoration: {
      type: "string",
      description: "Recommendations for decoration, art, and personal elements based *strictly* on the image, focusing on creating emphasis, adding detail, ensuring proper scale, and contributing to overall harmony and personality. Mention if specific aspects can't be assessed."
    }
  },
  required: [
    "layoutAndFunctionality",
    "lightingConcept",
    "colorScheme",
    "keyFurniture",
    "textilesAndMaterials",
    "orderAndStorage",
    "personalTouchAndDecoration"
  ],
  additionalProperties: false
};
// Main request handler
Deno.serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  // Ensure it's a POST request
  if (req.method !== "POST") {
    return new Response(JSON.stringify({
      error: "Method Not Allowed"
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  try {
    // Ensure OPENAI_API_KEY is set in Supabase Function environment variables
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      console.error("Missing OPENAI_API_KEY environment variable");
      return new Response(JSON.stringify({
        error: "Internal Server Configuration Error"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const openai = new OpenAI({
      apiKey
    });
    // --- Input Validation ---
    let imageUrl;
    try {
      const body = await req.json();
      imageUrl = body.imageUrl;
      if (!imageUrl || typeof imageUrl !== "string") {
        return new Response(JSON.stringify({
          error: "Missing or invalid imageUrl in request body. It should be a string."
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
        return new Response(JSON.stringify({
          error: "Invalid imageUrl provided. Must start with http:// or https://."
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      return new Response(JSON.stringify({
        error: "Invalid JSON body"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // --- End Input Validation ---
    // --- OpenAI API Call ---
    const response = await openai.responses.create({
      model: "gpt-4o",
      input: [
        {
          role: "system",
          content: `You are 'Vibe', the friendly, fun, and knowledgeable interior design guru from roomvibe.guru. Your expertise lies in analyzing room images and providing creative, practical, and actionable improvement suggestions. Adopt a warm, encouraging, and expert tone that is helpful but not intimidating. Use clear, accessible language, avoiding overly technical jargon. Your goal is to empower users with ideas to make their space feel great.

Analyze the provided room image based *strictly* on the visual information present. Do not make assumptions about areas not visible or elements outside the frame. Generate detailed improvement suggestions for each of the 7 core areas specified in the 'interior_design_suggestions' JSON schema. If a specific aspect cannot be assessed from the image, explicitly state this limitation in the relevant suggestion field. Format your entire response precisely according to the 'interior_design_suggestions' JSON schema.`
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Here's an image of my room. Please analyze it and provide specific, actionable improvement suggestions for the 7 key areas (Layout & Functionality, Lighting Concept, Color Scheme, Key Furniture, Textiles & Materials, Order & Storage, Personal Touch & Decoration), based *only* on what you see. Please provide the response in the required 'interior_design_suggestions' JSON format."
            },
            {
              type: "input_image",
              image_url: imageUrl,
              detail: "high"
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "interior_design_suggestions",
          schema: interiorDesignSchema,
          strict: true
        }
      },
      temperature: 0.3
    });
    // --- Process and Return Response ---
    const parsedSuggestions = JSON.parse(response.output_text);
    return new Response(JSON.stringify({
      suggestions: parsedSuggestions
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    console.error("Error processing request:", error);
    let errorMessage = "Failed to fetch suggestions.";
    let statusCode = 500;
    if (error instanceof SyntaxError) {
      errorMessage = "Failed to parse the response from OpenAI. Output might not be valid JSON.";
      statusCode = 502; // Bad Gateway (upstream error)
    } else if (error instanceof OpenAI.APIError) {
      errorMessage = `OpenAI API Error: ${error.message}`;
      statusCode = error.status || 500;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return new Response(JSON.stringify({
      error: errorMessage
    }), {
      status: statusCode,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
}); // --- Deployment Notes ---
 // 1. Save this file as `supabase/functions/analyze-room/index.ts`.
 // 2. Ensure you have `openai` listed in your `supabase/functions/import_map.json` if needed, or rely on npm specifiers as shown.
 // 3. Set the `OPENAI_API_KEY` environment variable in your Supabase project settings: Project Settings -> Functions -> analyze-room -> Environment Variables.
 // 4. Deploy the function: `supabase functions deploy analyze-room --no-verify-jwt` (or verify JWT if you need user authentication).
 // 5. Get the function's invoke URL from the Supabase dashboard or CLI.
