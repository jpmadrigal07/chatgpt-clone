'use client';
import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

const ASSISTANT = `assistant`;
const USER = `user`;

export default function SimpleChatUI() {
  const [messages, setMessages] = useState([
    { role: ASSISTANT, content: `Hello! How can I help you today?` },
  ]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async () => {
    if (question.trim() === ``) return;
    setMessages([...messages, { role: USER, content: question }]);
    setQuestion(``);
    setIsLoading(true);
    
    try {
      const res = await fetch(`/api/stream`, {
        method: `POST`,
        headers: {
          'Content-Type': `application/json`,
        },
        body: JSON.stringify({ question }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let done = false;
        let responseText = ``;
        let counter = 0;
        setIsLoading(false);
        while (!done) {
          counter++;
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunk = decoder.decode(value);
            if (chunk) {
              responseText += chunk;
              if(counter === 0) {
                setMessages(prevMessages => [...prevMessages, { role: ASSISTANT, content: responseText }]);
              } else {
                const newMessageIndex = messages.length + 1;
                setMessages(prevMessages => {
                  const newMessages = [...prevMessages];
                  newMessages[newMessageIndex] = { role: ASSISTANT, content: responseText };
                  return newMessages;
                });
              }
            }
          }
        }
      }
    } catch (error) {
      setMessages(prevMessages => [...prevMessages, { role: ASSISTANT, content: String(error) }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <ScrollArea className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-4 ${
                message.role === USER ? `text-right` : `text-left`
              }`}
            >
              <pre
                className={`inline-block whitespace-pre-wrap p-3 rounded-lg ${
                  message.role === USER ? `bg-blue-500 text-white` : `bg-gray-200 text-gray-800`
                }`}
              >
                {message.content}
              </pre>
            </div>
          ))}
          {isLoading && (
            <div className="inline-block whitespace-pre-wrap p-3 rounded-lg bg-gray-200 text-gray-800">
              <pre>Assistant is thinking...</pre>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <div className="p-4 border-t bg-white">
        <div className="max-w-2xl mx-auto flex space-x-2">
          <Input
            type="text"
            placeholder="Type your message..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            className="flex-1"
          />
          <Button onClick={handleSubmit}>Send</Button>
        </div>
      </div>
    </div>
  );
}