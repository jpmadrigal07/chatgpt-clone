import { NextResponse } from 'next/server';

const OPENAI_API_URL = `https://api.openai.com/v1/chat/completions`;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_MODEL = process.env.OPENAI_API_MODEL;

export async function POST(req: Request) {
  try {
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json({ error: `Question is required` }, { status: 400 });
    }

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': `application/json`,
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_API_MODEL,
        messages: [{ role: `user`, content: question }],
        stream: true,
      }),
    });

    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();

        if (!reader) {
          controller.error(`No response body`);
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim());

            lines.forEach(item => {
              const jsonPart = item.replace(/^data:\s*/, ``).trim();

              if (jsonPart === `[DONE]`) {
                controller.close();
                return;
              }

              try {
                const jsonData = JSON.parse(jsonPart);
                if (jsonData && jsonData.choices && jsonData.choices[0]?.delta?.content) {
                  const content = jsonData.choices[0].delta.content;
                  controller.enqueue(new TextEncoder().encode(`${content}`));
                }
              } catch (parseError) {
                console.error(`Error parsing JSON chunk:`, parseError, jsonPart);
              }
            });
          }

          controller.close();
        } catch (err) {
          controller.error(`Stream processing error: ` + err);
        }
      }
    });
    return new NextResponse(stream, {
      headers: {
        'Content-Type': `text/event-stream`,
        'Cache-Control': `no-cache`,
        'Connection': `keep-alive`,
      },
    });
  } catch (error) {
    return new NextResponse(`Error processing request: ` + error, { status: 500 });
  }
}