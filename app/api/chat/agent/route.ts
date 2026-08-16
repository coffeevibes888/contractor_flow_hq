import { NextRequest, NextResponse } from 'next/server';

interface AgentRequest {
  message: string;
  sessionId?: string;
}

const AGENT_RESPONSES: Record<string, string[]> = {
  order: [
    "I'd be happy to help with your order! Can you provide your order number?",
    "Let me look up your order details for you.",
    "What specific information do you need about your order?",
  ],
  tracking: [
    "I can help you track your order. Please share your order number and I'll check the status.",
    "Your tracking number is usually in your order confirmation email. If you paste it here, I can check where your package is.",
    "Once I have your order number, I can tell you exactly where your package is and when it's due to arrive.",
  ],
  shipping: [
    "Our standard shipping takes 5-7 business days. We also offer expedited shipping options.",
    "You can track your shipment using the tracking number sent to your email.",
    "Is there anything else about shipping I can help with?",
  ],
  return: [
    "We accept returns within 30 days of purchase. The item must be unworn and in original condition.",
    "To start a return, please visit our returns page or reply with your order number.",
    "What would you like to return?",
  ],
  product: [
    "Great question about our products! Which item are you interested in?",
    "We have a wide variety of clothing and accessories. What are you looking for?",
    "Feel free to browse our collection. Is there a specific style you prefer?",
  ],
  size: [
    "Our sizing chart is available on each product page. Would you like a recommendation?",
    "We offer exchanges for different sizes at no extra cost.",
    "What size are you looking for?",
  ],
  color: [
    "No worries if the color isn't what you expected. Tell me your order number and the color you wanted instead.",
    "We can usually exchange for a different color. Which item and color did you receive vs. what you wanted?",
    "If the item arrived in the wrong color, we'll make it right. Please share your order number and a quick description.",
  ],
  address: [
    "If your shipping address changed, please send your order number and the full new address so I can check if we can update it.",
    "If the order hasn't shipped yet, we can often update the address. Share your new name, street, city, postal code, and country.",
    "If your package is already in transit, I can still check options with the carrier once I have your order number.",
  ],
  payment: [
    "We accept multiple payment methods including credit cards, PayPal, and popular wallets like Apple Pay, Google Pay, and Cash App (where available).",
    "Your payment is secure and encrypted.",
    "Is there a payment issue I can help you with?",
  ],
};

const DEFAULT_RESPONSES = [
  "Thank you for your patience. Let me connect you with our specialist team.",
  "I appreciate your inquiry. How else can I assist you today?",
  "That's helpful information. What else can I help with?",
  "I understand. Is there anything else you'd like to know?",
  "Thank you for reaching out. We're here to help!",
];

function getAgentResponse(message: string): string {
  const lowerMessage = message.toLowerCase();

  for (const [key, responses] of Object.entries(AGENT_RESPONSES)) {
    if (lowerMessage.includes(key)) {
      return responses[Math.floor(Math.random() * responses.length)];
    }
  }

  return DEFAULT_RESPONSES[
    Math.floor(Math.random() * DEFAULT_RESPONSES.length)
  ];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AgentRequest;
    const { message, sessionId } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const agentResponse = getAgentResponse(message);

    const response = {
      response: agentResponse,
      agentName: 'John (Live Agent)',
      sessionId: sessionId || `session_${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: 'connected',
    };

    return NextResponse.json(response);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Agent API error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
