import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import ConversationList from "@/components/messages/conversation-list";
import ChatWindow from "@/components/messages/chat-window";
import { useState } from "react";

export default function Messages() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      <main className="lg:ml-64 h-screen flex">
        <ConversationList 
          onSelectConversation={setSelectedConversation} 
          selectedConversation={selectedConversation}
        />
        <ChatWindow conversationId={selectedConversation} />
      </main>
      <MobileNav />
    </div>
  );
}
