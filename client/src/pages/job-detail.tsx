import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, MapPin, DollarSign, Briefcase, Building2, Edit, Trash2 } from "lucide-react";
import { Link } from "wouter";

const applyJobSchema = z.object({
  coverLetter: z.string().min(50, "Cover letter must be at least 50 characters"),
  portfolioSnapshot: z.string().optional(),
});

const updateJobSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  type: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "APPRENTICESHIP"]),
  description: z.string().min(1, "Description is required"),
  location: z.string().optional(),
  salaryMinCents: z.string().optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) > 0), {
      message: "Minimum salary must be a positive number"
    })
    .transform(val => val && val.trim() !== "" && !isNaN(Number(val)) ? Math.floor(Number(val)) * 100 : undefined),
  salaryMaxCents: z.string().optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) > 0), {
      message: "Maximum salary must be a positive number"
    })
    .transform(val => val && val.trim() !== "" && !isNaN(Number(val)) ? Math.floor(Number(val)) * 100 : undefined),
}).refine((data) => {
  if (!data.salaryMinCents || !data.salaryMaxCents) return true;
  return data.salaryMinCents <= data.salaryMaxCents;
}, {
  message: "Minimum salary cannot be greater than maximum salary",
  path: ["salaryMinCents"],
});

export default function JobDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { user, token } = useAuth();
  const { toast } = useToast();

  const { data: jobData, isLoading } = useQuery<any>({
    queryKey: ["/api/jobs", id],
    enabled: !!token && !!id,
  });

  const applyForm = useForm({
    resolver: zodResolver(applyJobSchema),
    defaultValues: {
      coverLetter: "",
      portfolioSnapshot: "",
    },
  });

  const editForm = useForm({
    resolver: zodResolver(updateJobSchema),
    defaultValues: {
      title: jobData?.job?.title || "",
      type: jobData?.job?.type || "FULL_TIME",
      description: jobData?.job?.description || "",
      location: jobData?.job?.location || "",
      salaryMinCents: jobData?.job?.salaryMinCents ? String(jobData.job.salaryMinCents / 100) : "",
      salaryMaxCents: jobData?.job?.salaryMaxCents ? String(jobData.job.salaryMaxCents / 100) : "",
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/jobs/${id}/apply`, data);
      if (!res.ok) throw new Error("Failed to submit application");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Application submitted successfully!" });
      applyForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/jobs/${id}`, data);
      if (!res.ok) throw new Error("Failed to update job");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Success", description: "Job updated successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/jobs/${id}`);
      if (!res.ok) throw new Error("Failed to delete job");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Success", description: "Job deleted successfully!" });
      navigate("/jobs");
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SidebarNav />
        <main className="lg:ml-64 pb-20 lg:pb-8 pt-4 max-w-4xl mx-auto px-4">
          <div className="text-center py-12">Loading...</div>
        </main>
        <MobileNav />
      </div>
    );
  }

  if (!jobData) {
    return (
      <div className="min-h-screen bg-background">
        <SidebarNav />
        <main className="lg:ml-64 pb-20 lg:pb-8 pt-4 max-w-4xl mx-auto px-4">
          <div className="text-center py-12">Job not found</div>
        </main>
        <MobileNav />
      </div>
    );
  }

  const { job, studio } = jobData;
  const isOwner = user?.id === job.studioId;
  const canApply = user?.role === "ARTIST" && !isOwner;

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      <main className="lg:ml-64 pb-20 lg:pb-8 pt-4 max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <Link href="/jobs">
            <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back-to-jobs">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Jobs
            </Button>
          </Link>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-2xl" data-testid="text-job-title">{job.title}</CardTitle>
                    <Badge data-testid="badge-job-type">{job.type.replace("_", " ")}</Badge>
                  </div>
                  
                  <Link href={`/u/${studio.username}`}>
                    <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" data-testid="link-studio">
                      <Building2 className="w-4 h-4" />
                      <span className="font-medium">{studio.username}</span>
                    </div>
                  </Link>
                </div>

                {isOwner && (
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" data-testid="button-edit-job">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Job</DialogTitle>
                        </DialogHeader>
                        <Form {...editForm}>
                          <form onSubmit={editForm.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
                            <FormField
                              control={editForm.control}
                              name="title"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Job Title</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g. Experienced Tattoo Artist" {...field} data-testid="input-edit-title" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={editForm.control}
                              name="type"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Job Type</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-edit-type">
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
                              control={editForm.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description</FormLabel>
                                  <FormControl>
                                    <Textarea rows={6} placeholder="Job description..." {...field} data-testid="textarea-edit-description" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={editForm.control}
                              name="location"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Location</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g. Los Angeles, CA" {...field} data-testid="input-edit-location" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={editForm.control}
                                name="salaryMinCents"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Min Salary ($/year)</FormLabel>
                                    <FormControl>
                                      <Input type="number" placeholder="50000" {...field} data-testid="input-edit-salary-min" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={editForm.control}
                                name="salaryMaxCents"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Max Salary ($/year)</FormLabel>
                                    <FormControl>
                                      <Input type="number" placeholder="90000" {...field} data-testid="input-edit-salary-max" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className="flex gap-2 justify-end">
                              <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-edit">
                                {updateMutation.isPending ? "Saving..." : "Save Changes"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" data-testid="button-delete-job">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Job</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this job posting? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate()} data-testid="button-confirm-delete">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4 text-sm">
                {job.location && (
                  <div className="flex items-center gap-2" data-testid="text-location">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{job.location}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2" data-testid="text-salary">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span>{formatSalary(job.salaryMinCents, job.salaryMaxCents)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                  <span>{job.type.replace("_", " ")}</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-2">Job Description</h3>
                <p className="whitespace-pre-wrap text-muted-foreground" data-testid="text-description">{job.description}</p>
              </div>

              {canApply && (
                <div className="pt-4 border-t">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full" data-testid="button-apply">
                        Apply for this Position
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Apply for {job.title}</DialogTitle>
                      </DialogHeader>
                      <Form {...applyForm}>
                        <form onSubmit={applyForm.handleSubmit((data) => applyMutation.mutate(data))} className="space-y-4">
                          <FormField
                            control={applyForm.control}
                            name="coverLetter"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cover Letter</FormLabel>
                                <FormControl>
                                  <Textarea
                                    rows={8}
                                    placeholder="Tell us why you're a great fit for this position..."
                                    {...field}
                                    data-testid="textarea-cover-letter"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={applyForm.control}
                            name="portfolioSnapshot"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Portfolio Link (Optional)</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Link to your portfolio or relevant work"
                                    {...field}
                                    data-testid="input-portfolio-link"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex gap-2 justify-end">
                            <Button type="submit" disabled={applyMutation.isPending} data-testid="button-submit-application">
                              {applyMutation.isPending ? "Submitting..." : "Submit Application"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              <div className="pt-4 border-t text-xs text-muted-foreground">
                Posted {new Date(job.createdAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
