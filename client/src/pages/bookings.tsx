import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus, CheckCircle, XCircle, DollarSign, Image as ImageIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";

const bookingSchema = z.object({
  artistId: z.string().min(1, "Artist is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  scheduledAt: z.string().min(1, "Date and time required"),
  durationMinutes: z.coerce.number().min(30).default(120),
  depositCents: z.coerce.number().optional(),
  totalPriceCents: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

type BookingStatus = "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED";

export default function BookingsPage() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: bookings = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/bookings", { status: statusFilter }],
    queryFn: async () => {
      const url = statusFilter === "ALL" 
        ? "/api/bookings" 
        : `/api/bookings?status=${statusFilter}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: artists = [] } = useQuery<any[]>({
    queryKey: ["/api/users", { type: "ARTIST" }],
    queryFn: async () => {
      const res = await fetch("/api/users?type=ARTIST", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch artists");
      return res.json();
    },
    enabled: !!token && createDialogOpen,
    staleTime: 0,
  });

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      artistId: "",
      title: "",
      description: "",
      scheduledAt: "",
      durationMinutes: 120,
      depositCents: 0,
      totalPriceCents: 0,
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      return apiRequest("POST", "/api/bookings", {
        ...data,
        scheduledAt: new Date(data.scheduledAt).toISOString(),
      });
    },
    onSuccess: () => {
      toast({ title: "Booking created", description: "Your booking request has been sent" });
      queryClient.refetchQueries({ queryKey: ["/api/bookings"] });
      setCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BookingStatus }) => {
      return apiRequest("PUT", `/api/bookings/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["/api/bookings"] });
      toast({ title: "Booking updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/bookings/${id}`);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["/api/bookings"] });
      toast({ title: "Booking cancelled" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Server handles filtering via status query parameter

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "APPROVED": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "REJECTED": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "COMPLETED": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "CANCELLED": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const formatPrice = (cents?: number) => {
    if (!cents) return "N/A";
    return `$${(cents / 100).toFixed(2)}`;
  };

  const onSubmit = (data: BookingFormData) => {
    createMutation.mutate(data);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-black">
        <SidebarNav />
        <div className="lg:ml-64">
          <div className="flex items-center justify-center h-screen">
            <p className="text-black dark:text-white">Please log in to view bookings</p>
          </div>
        </div>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <SidebarNav />
      
      <div className="lg:ml-64 pb-20 lg:pb-8">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-black dark:text-white uppercase tracking-tight">
              Bookings
            </h1>
            
            {user.role !== "STUDIO" && (
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                    data-testid="button-create-booking"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Booking
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white dark:bg-black border-black dark:border-white max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-black dark:text-white uppercase tracking-tight">
                      Create Booking
                    </DialogTitle>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="artistId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-black dark:text-white">Artist</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger 
                                  className="bg-white dark:bg-black border-black dark:border-white text-black dark:text-white"
                                  data-testid="select-artist"
                                >
                                  <SelectValue placeholder="Select an artist" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-white dark:bg-black border-black dark:border-white">
                                {artists.map((artist: any) => (
                                  <SelectItem key={artist.id} value={artist.id}>
                                    {artist.username} - {artist.profile?.displayName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-black dark:text-white">Title</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="bg-white dark:bg-black border-black dark:border-white text-black dark:text-white"
                                placeholder="e.g., Rose Sleeve Tattoo"
                                data-testid="input-booking-title"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-black dark:text-white">Description</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                className="bg-white dark:bg-black border-black dark:border-white text-black dark:text-white resize-none"
                                placeholder="Describe your tattoo idea..."
                                rows={3}
                                data-testid="textarea-booking-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="scheduledAt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-black dark:text-white">Date & Time</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="datetime-local"
                                  className="bg-white dark:bg-black border-black dark:border-white text-black dark:text-white"
                                  data-testid="input-scheduled-at"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="durationMinutes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-black dark:text-white">Duration (minutes)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  min="30"
                                  step="30"
                                  className="bg-white dark:bg-black border-black dark:border-white text-black dark:text-white"
                                  data-testid="input-duration"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="depositCents"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-black dark:text-white">Deposit ($)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="bg-white dark:bg-black border-black dark:border-white text-black dark:text-white"
                                  placeholder="0.00"
                                  data-testid="input-deposit"
                                  onChange={(e) => field.onChange(Math.round(parseFloat(e.target.value || "0") * 100))}
                                  value={field.value ? (field.value / 100).toFixed(2) : ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="totalPriceCents"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-black dark:text-white">Total Price ($)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="bg-white dark:bg-black border-black dark:border-white text-black dark:text-white"
                                  placeholder="0.00"
                                  data-testid="input-total-price"
                                  onChange={(e) => field.onChange(Math.round(parseFloat(e.target.value || "0") * 100))}
                                  value={field.value ? (field.value / 100).toFixed(2) : ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-black dark:text-white">Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                className="bg-white dark:bg-black border-black dark:border-white text-black dark:text-white resize-none"
                                placeholder="Any additional notes..."
                                rows={2}
                                data-testid="textarea-booking-notes"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end gap-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCreateDialogOpen(false)}
                          className="border-black dark:border-white text-black dark:text-white"
                          data-testid="button-cancel-booking"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={createMutation.isPending}
                          className="bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                          data-testid="button-submit-booking"
                        >
                          {createMutation.isPending ? "Creating..." : "Create Booking"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-6">
            <TabsList className="bg-white dark:bg-black border border-black dark:border-white">
              <TabsTrigger value="ALL" className="data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black" data-testid="tab-all">
                All
              </TabsTrigger>
              <TabsTrigger value="PENDING" className="data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black" data-testid="tab-pending">
                Pending
              </TabsTrigger>
              <TabsTrigger value="APPROVED" className="data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black" data-testid="tab-approved">
                Approved
              </TabsTrigger>
              <TabsTrigger value="COMPLETED" className="data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black" data-testid="tab-completed">
                Completed
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-500 dark:text-gray-400">Loading bookings...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No bookings found</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {bookings.map((booking: any) => {
                const isArtist = booking.artistId === user.id;
                const isClient = booking.clientId === user.id;

                return (
                  <Card key={booking.id} className="bg-white dark:bg-black border-black dark:border-white p-6" data-testid={`card-booking-${booking.id}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-black dark:text-white uppercase tracking-tight" data-testid={`text-booking-title-${booking.id}`}>
                            {booking.title}
                          </h3>
                          <Badge className={getStatusColor(booking.status)} data-testid={`badge-status-${booking.id}`}>
                            {booking.status}
                          </Badge>
                        </div>
                        
                        {booking.description && (
                          <p className="text-gray-600 dark:text-gray-400 mb-3" data-testid={`text-description-${booking.id}`}>
                            {booking.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span data-testid={`text-scheduled-${booking.id}`}>
                              {format(new Date(booking.scheduledAt), "PPp")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span data-testid={`text-duration-${booking.id}`}>
                              {booking.durationMinutes} min
                            </span>
                          </div>
                          {booking.depositCents && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4" />
                              <span data-testid={`text-deposit-${booking.id}`}>
                                Deposit: {formatPrice(booking.depositCents)}
                              </span>
                            </div>
                          )}
                          {booking.totalPriceCents && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4" />
                              <span data-testid={`text-total-${booking.id}`}>
                                Total: {formatPrice(booking.totalPriceCents)}
                              </span>
                            </div>
                          )}
                        </div>

                        {booking.notes && (
                          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 border border-black dark:border-white">
                            <p className="text-sm text-gray-700 dark:text-gray-300" data-testid={`text-notes-${booking.id}`}>
                              <strong>Notes:</strong> {booking.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-4 border-t border-black dark:border-white">
                      {isArtist && booking.status === "PENDING" && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 text-white hover:bg-green-700"
                            onClick={() => updateStatusMutation.mutate({ id: booking.id, status: "APPROVED" })}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`button-approve-${booking.id}`}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                            onClick={() => updateStatusMutation.mutate({ id: booking.id, status: "REJECTED" })}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`button-reject-${booking.id}`}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      
                      {isArtist && booking.status === "APPROVED" && (
                        <Button
                          size="sm"
                          className="bg-blue-600 text-white hover:bg-blue-700"
                          onClick={() => updateStatusMutation.mutate({ id: booking.id, status: "COMPLETED" })}
                          disabled={updateStatusMutation.isPending}
                          data-testid={`button-complete-${booking.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Mark Complete
                        </Button>
                      )}

                      {isClient && ["PENDING", "APPROVED"].includes(booking.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-black dark:border-white text-black dark:text-white"
                          onClick={() => deleteMutation.mutate(booking.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-cancel-${booking.id}`}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Cancel Booking
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
