// app/page.tsx
'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    const eventSource = new EventSource('/api/stream');

    eventSource.onmessage = (event) => {
      const data = event.data;
      if (data === '[END]') {
        // Close the EventSource when termination message is received
        eventSource.close();
      } else {
        setMessages((prev) => [...prev, data]);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div>
      <h1 className="font-bold text-lg">1 by 1 streaming of text</h1>
      <p>{messages.join("")}</p>
    </div>
  );
}