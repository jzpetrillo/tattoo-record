import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, MapPin, DollarSign, Briefcase, MessageCircle } from "lucide-react";

const createJobSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  type: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "APPRENTICESHIP"]),
  description: z.string().min(1, "Description is required"),
  location: z.string().optional(),
  salaryMinCents: z.string().optional().transform(val => val ? parseInt(val) * 100 : undefined),
  salaryMaxCents: z.string().optional().transform(val => val ? parseInt(val) * 100 : undefined),
});

export default function Jobs() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["/api/jobs"],
    enabled: !!token,
  });

  const form = useForm({
    resolver: zodResolver(createJobSchema),
    defaultValues: {
      title: "",
      type: "FULL_TIME" as const,
      description: "",
      location: "",
      salaryMinCents: "",
      salaryMaxCents: "",
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/jobs", data, token!);
      if (!res.ok) throw new Error("Failed to create job");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setCreateDialogOpen(false);
      form.reset();
      toast({ title: "Success", description: "Job posted successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const formatSalary = (minCents?: number, maxCents?: number) => {
    if (!minCents && !maxCents) return "Salary not disclosed";
    const min = minCents ? `$${(minCents / 100).toLocaleString()}` : "";
    const max = maxCents ? `$${(maxCents / 100).toLocaleString()}` : "";
    if (min && max) return `${min} - ${max}`;
    return min || max;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 pb-20 max-w-4xl mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Job Board</h1>
            <p className="text-sm text-muted-foreground">Find your next opportunity in the tattoo industry</p>
          </div>

          {user?.role === "STUDIO" && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-job">
                  <Plus className="w-4 h-4 mr-2" />
                  Post Job
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Post a Job</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => createJobMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Experienced Tattoo Artist" {...field} data-testid="input-job-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-job-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="FULL_TIME">Full Time</SelectItem>
                              <SelectItem value="PART_TIME">Part Time</SelectItem>
                              <SelectItem value="CONTRACT">Contract</SelectItem>
                              <SelectItem value="APPRENTICESHIP">Apprenticeship</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Los Angeles, CA" {...field} data-testid="input-job-location" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="salaryMinCents"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min Salary ($/year)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="50000" {...field} data-testid="input-salary-min" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="salaryMaxCents"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Salary ($/year)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="75000" {...field} data-testid="input-salary-max" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe the role, requirements, and what you're looking for..." 
                              className="min-h-[150px]"
                              {...field}
                              data-testid="textarea-job-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCreateDialogOpen(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="flex-1" disabled={createJobMutation.isPending} data-testid="button-submit-job">
                        {createJobMutation.isPending ? "Posting..." : "Post Job"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading jobs...</div>
        ) : jobs?.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No jobs posted yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs?.map((item: any) => (
              <Card key={item.job.id} className="p-6" data-testid={`job-${item.job.id}`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold">{item.studio.username[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-lg" data-testid={`text-job-title-${item.job.id}`}>
                          {item.job.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{item.studio.username}</p>
                      </div>
                      <Badge variant="secondary" data-testid={`badge-job-type-${item.job.id}`}>
                        {item.job.type.replace("_", " ")}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                      {item.job.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{item.job.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        <span>{formatSalary(item.job.salaryMinCents, item.job.salaryMaxCents)}</span>
                      </div>
                    </div>

                    <p className="text-sm leading-relaxed mb-4">{item.job.description}</p>

                    {user?.role === "ARTIST" && (
                      <div className="flex gap-3">
                        <Button className="flex-1" data-testid={`button-apply-${item.job.id}`}>
                          Apply Now
                        </Button>
                        <Button variant="outline" data-testid={`button-message-${item.job.id}`}>
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Message Studio
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
