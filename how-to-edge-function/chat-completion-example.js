import "jsr:@supabase/functions-js/edge-runtime.d.ts";
Deno.serve(async (req)=>{
  if (req.method !== "POST") {
    return new Response(JSON.stringify({
      error: "Method not allowed"
    }), {
      status: 405
    });
  }
  const { prompt } = await req.json();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`
    },
    body: JSON.stringify({
      model: "gpt-4.1",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });
  if (!response.ok) {
    let errorMessage = "An error occurred while processing your request.";
    try {
      const error = await response.json();
      errorMessage = error.message || errorMessage;
    // Fallback to generic message if no message field
    } catch (jsonError) {
      // Handle JSON parsing error
      console.error("Error parsing OpenAI response:", jsonError);
    }
    return new Response(JSON.stringify({
      error: errorMessage
    }), {
      status: response.status
    });
  }
  const data = await response.json();
  return new Response(JSON.stringify({
    output_text: data.choices[0].message.content
  }), {
    headers: {
      "Content-Type": "application/json"
    }
  });
});
