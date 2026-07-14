import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { X, Heart, Send } from "lucide-react";

interface StoryViewerProps {
  userId: string;
  onClose: () => void;
}

export default function StoryViewer({ userId, onClose }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: stories } = useQuery<any[]>({
    queryKey: [`/api/stories/${userId}`],
  });

  useEffect(() => {
    if (!stories || stories.length === 0) return;

    const timer = setTimeout(() => {
      if (currentIndex < stories.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onClose();
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentIndex, stories, onClose]);

  if (!stories || stories.length === 0) return null;

  const currentStory = stories[currentIndex];

  return (
    <div className="fixed inset-0 bg-black z-50" data-testid="story-viewer">
      <div className="h-full flex flex-col">
        <div className="flex gap-1 p-4">
          {stories.map((_: any, index: number) => (
            <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-300"
                style={{ width: index < currentIndex ? "100%" : index === currentIndex ? "45%" : "0%" }}
              ></div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img
              src={currentStory.user.avatarUrl || `https://ui-avatars.com/api/?name=${currentStory.user.username}`}
              alt={currentStory.user.username}
              className="w-10 h-10 rounded-full ring-2 ring-white"
            />
            <div>
              <p className="font-semibold text-white text-sm">{currentStory.user.username}</p>
              <p className="text-xs text-white/80">2h ago</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:text-white/80" data-testid="button-close-story">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 relative flex items-center justify-center">
          {currentStory.story.media?.url && (
            <img
              src={currentStory.story.media.url}
              alt="Story Content"
              className="max-w-full max-h-full object-contain"
            />
          )}

          <div className="absolute inset-0 flex">
            <button
              onClick={() => currentIndex > 0 && setCurrentIndex(currentIndex - 1)}
              className="flex-1 active:bg-white/10"
              data-testid="button-previous-story"
            ></button>
            <button
              onClick={() => currentIndex < stories.length - 1 ? setCurrentIndex(currentIndex + 1) : onClose()}
              className="flex-1 active:bg-white/10"
              data-testid="button-next-story"
            ></button>
          </div>
        </div>

        <div className="p-4 border-t border-white/10">
          <div className="flex gap-3 items-center">
            <input
              type="text"
              placeholder={`Reply to ${currentStory.user.username}...`}
              className="flex-1 bg-transparent border border-white/30 rounded-full px-4 py-2.5 text-white placeholder-white/60 focus:outline-none focus:border-white/60"
              data-testid="input-story-reply"
            />
            <button className="text-white hover:text-white/80">
              <Heart className="w-6 h-6" />
            </button>
            <button className="text-white hover:text-white/80">
              <Send className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
