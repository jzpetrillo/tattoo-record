import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import ConversationList, { OtherUser } from "@/components/messages/conversation-list";
import ChatWindow from "@/components/messages/chat-window";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

export default function Messages() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<OtherUser | null>(null);
  const { token } = useAuth();
  const [location] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const withUserId = params.get("withUserId");

    if (withUserId && token) {
      // The direct-message endpoint returns an existing conversation or creates
      // one for a first contact. Going through apiRequest keeps deep links
      // authenticated consistently.
      apiRequest("GET", `/api/messages?withUserId=${encodeURIComponent(withUserId)}`)
        .then((res) => res.json())
        .then((data) => {
          const conversation = data.conversation ?? data;
          if (conversation?.id) {
            const participants = data.participants ?? conversation.participants ?? [];
            const other = participants.find((participant: OtherUser) => participant.id === withUserId)
              ?? data.otherUser;
            setSelectedConversation(conversation.id);
            if (other?.username) setSelectedUser(other);
          }
        })
        .catch(() => {
          setSelectedConversation(null);
          setSelectedUser(null);
        });
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
