interface LiveStreamCardProps {
  event: any;
  host: any;
}

export default function LiveStreamCard({ event, host }: LiveStreamCardProps) {
  return (
    <article className="bg-card rounded-xl border border-border overflow-hidden hover-lift cursor-pointer" data-testid={`livestream-${event.id}`}>
      <div className="relative aspect-video bg-secondary">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>

        <div className="absolute top-4 left-4 bg-destructive/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm text-white font-bold flex items-center gap-2 animate-pulse">
          <i className="fas fa-circle text-[8px]"></i>
          LIVE
        </div>

        <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm text-white font-medium flex items-center gap-2">
          <i className="fas fa-eye"></i>
          <span data-testid={`viewer-count-${event.id}`}>{event.viewerPeak || 0}</span>
        </div>

        <div className="absolute bottom-0 inset-x-0 p-4">
          <div className="flex items-center gap-3 mb-2">
            <img
              src={host.avatarUrl || `https://ui-avatars.com/api/?name=${host.username}`}
              alt={host.username}
              className="w-10 h-10 rounded-full ring-2 ring-white"
            />
            <div className="flex-1">
              <h3 className="font-bold text-white text-sm" data-testid={`stream-title-${event.id}`}>{event.title}</h3>
              <p className="text-white/90 text-xs">
                {host.username} • Started {event.startedAt ? "2h ago" : "soon"}
              </p>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <i className="fas fa-play text-white text-2xl ml-1"></i>
          </div>
        </div>
      </div>
    </article>
  );
}
