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
        <div className={`${selectedConversation ? 'hidden lg:block' : 'block'} w-full lg:w-auto`}>
          <ConversationList 
            onSelectConversation={setSelectedConversation} 
            selectedConversation={selectedConversation}
          />
        </div>
        <div className={`${selectedConversation ? 'block' : 'hidden lg:hidden'} flex-1`}>
          <ChatWindow conversationId={selectedConversation} />
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
