// app/api/stream/route.ts
export async function GET(req: Request) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const message = "Hello, this is a streaming message!";
      let index = 0;

      const intervalId = setInterval(() => {
        if (index < message.length) {
          controller.enqueue(encoder.encode(`data: ${message[index]}\n\n`));
          index++;
        } else {
          controller.enqueue(encoder.encode(`data: [END]\n\n`));
          clearInterval(intervalId);
          controller.close();
        }
      }, 50);

      req.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        controller.close();
      });
    }
  });

  const res = new Response(stream);
  res.headers.set('Content-Type', 'text/event-stream');
  res.headers.set('Cache-Control', 'no-cache');
  res.headers.set('Connection', 'keep-alive');
  
  return res;
}