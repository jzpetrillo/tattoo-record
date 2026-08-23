import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import ConversationList, { OtherUser } from "@/components/messages/conversation-list";
import ChatWindow from "@/components/messages/chat-window";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

export default function Messages() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<OtherUser | null>(null);
  const { token } = useAuth();
  const [location] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1]);
    const withUserId = params.get("withUserId");

    if (withUserId && token) {
      fetch(`/api/messages?withUserId=${withUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.conversation) {
            setSelectedConversation(data.conversation.id);
          }
        })
        .catch(console.error);
    }
  }, [location, token]);

  const handleSelectConversation = (id: string, otherUser: OtherUser) => {
    setSelectedConversation(id);
    setSelectedUser(otherUser);
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
    setSelectedUser(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      <main className="lg:ml-64 h-[100dvh] flex pb-16 lg:pb-0">
        <div className={`${selectedConversation ? "hidden lg:block" : "block"} w-full lg:w-auto`}>
          <ConversationList
            onSelectConversation={handleSelectConversation}
            selectedConversation={selectedConversation}
          />
        </div>
        <div className={`${selectedConversation ? "flex" : "hidden lg:flex"} flex-1 flex-col min-h-0`}>
          <ChatWindow
            conversationId={selectedConversation}
            otherUser={selectedUser}
            onBack={handleBackToList}
          />
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
