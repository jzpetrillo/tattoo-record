import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

export default function Jobs() {
  const { token } = useAuth();

  const { data: jobs } = useQuery({
    queryKey: ["/api/jobs"],
    enabled: !!token,
  });

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:ml-64 xl:ml-72 pb-20 lg:pb-0">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">Job Board</h1>
            <p className="text-muted-foreground">Find your next opportunity in the tattoo industry</p>
          </div>

          <div className="space-y-4">
            {jobs?.map((item: any) => (
              <Card key={item.job.id} className="p-6 hover-lift" data-testid={`job-${item.job.id}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={item.studio.avatarUrl || `https://ui-avatars.com/api/?name=${item.studio.username}`}
                      alt={item.studio.username}
                      className="w-16 h-16 rounded-lg ring-2 ring-primary/50 object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="default" data-testid={`badge-job-type-${item.job.id}`}>
                          {item.job.type.replace("_", " ")}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-lg" data-testid={`text-job-title-${item.job.id}`}>
                        {item.job.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {item.studio.username} • {item.job.location}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-sm leading-relaxed mb-4">{item.job.description}</p>

                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <Button className="flex-1" data-testid={`button-apply-${item.job.id}`}>
                    Apply Now
                  </Button>
                  <Button variant="outline" size="icon" data-testid={`button-save-${item.job.id}`}>
                    <i className="far fa-bookmark"></i>
                  </Button>
                  <Button variant="outline" size="icon" data-testid={`button-share-${item.job.id}`}>
                    <i className="far fa-share-square"></i>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
