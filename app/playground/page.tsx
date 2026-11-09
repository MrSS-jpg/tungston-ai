import ChatApp from "@/components/ChatApp";

export const metadata = {
  title: "Playground — Tungsten AI",
  description: "Autonomous HTML/JS Web App Synthesizer powered by GPT-120B and 4-Key Groq LPU Array.",
};

export default function PlaygroundPage() {
  return <ChatApp defaultView="playground" />;
}
