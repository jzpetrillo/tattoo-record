export default function Marquee({ text }: { text: string }) {
  return (
    <div className="border-b border-border overflow-hidden whitespace-nowrap py-2 bg-background">
      <div className="marquee inline-block">
        <span className="text-xs uppercase tracking-wider opacity-60">
          {Array(10).fill(text).join(" / ")} / {text}
        </span>
        <span className="text-xs uppercase tracking-wider opacity-60 ml-4">
          {Array(10).fill(text).join(" / ")} / {text}
        </span>
      </div>
    </div>
  );
}
