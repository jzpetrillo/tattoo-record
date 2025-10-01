import Header from "@/components/layout/header";
import Marquee from "@/components/layout/marquee";
import PostFeed from "@/components/posts/post-feed";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

export default function Home() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-4xl">
          <h1 className="editorial-title mb-8">
            INKTAG
          </h1>
          <p className="text-lg uppercase tracking-wide mb-8 opacity-60">
            A Platform for Tattoo Artists & Enthusiasts
          </p>
          <Link href="/auth">
            <button className="px-8 py-3 border border-foreground hover:bg-foreground hover:text-background transition-all uppercase text-sm tracking-wider">
              Enter
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-16">
        <Marquee text="WELCOME TO INKTAG MAGAZINE, AN INDEPENDENT PLATFORM FOR TATTOO ARTISTS AND ENTHUSIASTS" />
        
        <div className="py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
              <div>
                <h1 className="editorial-title mb-6">
                  THE<br />
                  ARTIST<br />
                  ISSUE
                </h1>
                <div className="h-1 w-24 bg-foreground mb-6"></div>
                <p className="text-sm uppercase tracking-wider opacity-60">
                  Issue 01 / Now Available
                </p>
              </div>
              <div className="aspect-square bg-muted"></div>
            </div>
          </div>
        </div>

        <PostFeed />
      </div>
    </div>
  );
}
