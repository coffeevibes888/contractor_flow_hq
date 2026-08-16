import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';

interface ChatRequest {
  message: string;
  threadId?: string;
}

const SIMULATED_RESPONSES: Record<string, string> = {
  hello: "Hello! How can I help you today?",
  hi: "Hi there! What can I assist you with?",
  help: "I'm here to help! You can ask me about your orders, tracking, shipping, returns, exchanges, and more.",
  price: "I can help you with pricing information. What product would you like to know about?",
  shipping: "We offer fast and reliable shipping options. How can I help with your shipping inquiry?",
  tracking: "I can help you track your order. Please share your order number and I'll check the status.",
  order: "I'd be happy to help with your order. Tell me your order number and what you need to change.",
  size: "We can help with sizing or exchanges. What item and size are you looking at?",
  color: "If you ordered the wrong color, we can usually exchange it. Tell me your order number and the color you wanted.",
  address: "If your shipping address changed, share your order number and the full new address so I can check if we can update it.",
  return: "We have a hassle-free return policy. Most items can be returned within 30 days if unworn and in original condition.",
  thanks: "You're welcome! Is there anything else I can help you with?",
  thank: "Happy to help! Feel free to ask if you need anything else.",
};

function getSimulatedResponse(message: string): string {
  const lowerMessage = message.toLowerCase();

  for (const [key, response] of Object.entries(SIMULATED_RESPONSES)) {
    if (lowerMessage.includes(key)) {
      return response;
    }
  }

  const defaultResponses = [
    "That's a great question! Let me help you with that.",
    "I understand. Can you tell me more about what you need?",
    "Thanks for reaching out. How can I better assist you?",
    "I'm here to help! Is there anything specific you'd like to know about your order or products?",
    "Thank you for your message. If this needs a human to review, our team will follow up by email.",
  ];

  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

async function callOpenAI(message: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful customer support assistant for Rocken My Vibe, a fashion e-commerce store. Be friendly, concise, and helpful. Keep responses under 150 words.',
          },
          {
            role: 'user',
            content: message,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.error('OpenAI API error:', response.statusText);
      return null;
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    return data.choices[0]?.message?.content || null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error calling OpenAI:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequest;
    const { message, threadId } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    let aiResponse = await callOpenAI(message);

    if (!aiResponse) {
      aiResponse = getSimulatedResponse(message);
    }

    // Create or update support thread + messages
    let thread = null;

    if (threadId) {
      thread = await prisma.thread.findUnique({ where: { id: threadId } });
    }

    if (!thread) {
      thread = await prisma.thread.create({
        data: {
          type: 'support',
          subject: 'Support chat',
        },
      });
    }

    await prisma.message.createMany({
      data: [
        {
          threadId: thread.id,
          senderUserId: null,
          senderName: 'Visitor',
          senderEmail: null,
          content: message,
          role: 'user',
        },
        {
          threadId: thread.id,
          senderUserId: null,
          senderName: 'AI Assistant',
          senderEmail: null,
          content: aiResponse,
          role: 'ai',
        },
      ],
    });

    const agentResponse = 'A live agent is now available. Would you like to chat with them?';

    await prisma.message.create({
      data: {
        threadId: thread.id,
        senderUserId: null,
        senderName: 'Live Agent',
        senderEmail: null,
        content: agentResponse,
        role: 'admin',
      },
    });

    return NextResponse.json({
      response: aiResponse,
      agentResponse,
      threadId: thread.id,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
