import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import ConversationList from "@/components/messages/conversation-list";
import ChatWindow from "@/components/messages/chat-window";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

export default function Messages() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const { token } = useAuth();
  const [location] = useLocation();

  // Handle withUserId query parameter to open conversation with specific user
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1]);
    const withUserId = params.get('withUserId');
    
    if (withUserId && token) {
      // Fetch or create conversation with this user
      fetch(`/api/messages?withUserId=${withUserId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data.conversation) {
            setSelectedConversation(data.conversation.id);
          }
        })
        .catch(err => console.error('Failed to get/create conversation:', err));
    }
  }, [location, token]);

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
