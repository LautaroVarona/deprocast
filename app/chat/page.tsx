import { ChatWorkspace } from "@/components/chat/chat-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat Exocórtex · DeProcast",
  description:
    "Interfaz conversacional con menciones @ y contexto relacional del ecosistema Deprocast.",
};

export default function ChatPage() {
  return <ChatWorkspace />;
}
