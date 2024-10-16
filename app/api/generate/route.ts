import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export async function POST(req: Request) {
  const { reason, tone, recipient, otherPreferences } = await req.json();

  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const prompt = `Write an email with the following details:
  Reason: ${reason}
  Tone: ${tone}
  Recipient: ${recipient}
  Other Preferences: ${otherPreferences}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return NextResponse.json({ email: text });
  } catch (error) {
    console.error('Error generating email:', error);
    return NextResponse.json({ error: 'Failed to generate email' }, { status: 500 });
  }
}