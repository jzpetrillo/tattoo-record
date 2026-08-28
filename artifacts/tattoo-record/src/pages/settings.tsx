import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, uploadFile } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Lock, Mail, User, Trash2 } from "lucide-react";

const profileSchema = z.object({
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const emailChangeSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;
type EmailChangeFormValues = z.infer<typeof emailChangeSchema>;

function getApiErrorMessage(error: Error) {
  const rawMessage = error.message;
  const jsonStart = rawMessage.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(rawMessage.slice(jsonStart));
      if (typeof parsed.message === "string") return parsed.message;
    } catch {
      // Keep the original message when the response was not JSON.
    }
  }
  return rawMessage;
}

export default function Settings() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(window.location.search);
  const emailChangeConfirmed = searchParams.get("emailChanged") === "1";
  const [activeSection, setActiveSection] = useState<"profile" | "password" | "account">(
    searchParams.get("section") === "account" ? "account" : "profile",
  );
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      bio: user?.bio ?? "",
      website: user?.website ?? "",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const emailChangeForm = useForm<EmailChangeFormValues>({
    resolver: zodResolver(emailChangeSchema),
    defaultValues: { email: "" },
  });

  const pendingEmailQuery = useQuery<{ pending: { email: string; expiresAt: string } | null }>({
    queryKey: ["/api/auth/email-change-status", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/auth/email-change-status", undefined, token!);
      return res.json();
    },
    enabled: Boolean(token && user),
  });

  const displayedPendingEmail = pendingEmail ?? pendingEmailQuery.data?.pending?.email ?? null;
  const uploadStatusQuery = useQuery<{ available: boolean }>({
    queryKey: ["/api/upload/status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/upload/status", undefined, token!);
      return res.json();
    },
    enabled: Boolean(token),
  });
  const uploadsAvailable = uploadStatusQuery.data?.available === true;

  const profileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const avatarUrl = avatarFile
        ? (await uploadFile(avatarFile, `avatars/${user!.id}`, token!)).url
        : undefined;
      const bannerImageUrl = bannerFile
        ? (await uploadFile(bannerFile, `banners/${user!.id}`, token!)).url
        : undefined;
      const res = await apiRequest("PUT", "/api/users/me", {
        ...data,
        ...(avatarUrl ? { avatarUrl } : {}),
        ...(bannerImageUrl ? { bannerImageUrl } : {}),
      }, token!);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      setAvatarFile(null);
      setBannerFile(null);
      toast({ description: "Profile updated successfully." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", description: error.message });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (data: PasswordFormValues) => {
      const res = await apiRequest("POST", "/api/auth/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }, token!);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to change password");
      }
      return res.json();
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({ description: "Password changed successfully." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", description: error.message });
    },
  });

  const emailChangeMutation = useMutation({
    mutationFn: async (data: EmailChangeFormValues) => {
      const res = await apiRequest("POST", "/api/auth/request-email-change", data, token!);
      return res.json();
    },
    onSuccess: (data: { email: string }) => {
      setPendingEmail(data.email);
      emailChangeForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/email-change-status", user?.id] });
      toast({
        title: "Verification link sent",
        description: `Check ${data.email} to finish changing your email address.`,
      });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Unable to change email", description: getApiErrorMessage(error) });
    },
  });

  const sections = [
    { id: "profile" as const, label: "Edit Profile", icon: User },
    { id: "password" as const, label: "Change Password", icon: Lock },
    { id: "account" as const, label: "Account", icon: Trash2 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      <main className="lg:ml-64 pb-20 lg:pb-8 pt-4">
        <div className="max-w-3xl mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1" data-testid="page-title">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your account preferences</p>
          </div>

          <div className="grid lg:grid-cols-4 gap-6">
            {/* Sidebar navigation */}
            <nav className="lg:col-span-1">
              <div className="space-y-1">
                {sections.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveSection(id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors border-l-2 ${
                      activeSection === id
                        ? "border-foreground font-semibold"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid={`settings-nav-${id}`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            </nav>

            {/* Content */}
            <div className="lg:col-span-3">
              {activeSection === "profile" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Edit Profile</CardTitle>
                    <CardDescription>Update your public profile information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...profileForm}>
                      <form onSubmit={profileForm.handleSubmit((d) => profileMutation.mutate(d))} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={profileForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="First name" data-testid="input-first-name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={profileForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Last name" data-testid="input-last-name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={profileForm.control}
                          name="bio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bio</FormLabel>
                              <FormControl>
                                <Input placeholder="Tell people about yourself" data-testid="input-bio" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="website"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Website</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. yourwebsite.com" data-testid="input-website" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="avatar-upload">Profile photo</label>
                            <Input
                              id="avatar-upload"
                              type="file"
                              accept="image/*"
                              disabled={!uploadsAvailable || profileMutation.isPending}
                              onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
                              data-testid="input-avatar-upload"
                            />
                            {avatarFile && <p className="text-xs text-muted-foreground">{avatarFile.name}</p>}
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="banner-upload">Banner image</label>
                            <Input
                              id="banner-upload"
                              type="file"
                              accept="image/*"
                              disabled={!uploadsAvailable || profileMutation.isPending}
                              onChange={(event) => setBannerFile(event.target.files?.[0] ?? null)}
                              data-testid="input-banner-upload"
                            />
                            {bannerFile && <p className="text-xs text-muted-foreground">{bannerFile.name}</p>}
                          </div>
                        </div>
                        {uploadStatusQuery.data && !uploadsAvailable && (
                          <p className="text-sm text-muted-foreground">
                            Image uploads are temporarily unavailable.
                          </p>
                        )}
                        <Button type="submit" disabled={profileMutation.isPending} data-testid="button-save-profile">
                          {profileMutation.isPending ? "Saving…" : "Save Changes"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              )}

              {activeSection === "password" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>Choose a strong password to keep your account secure</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...passwordForm}>
                      <form onSubmit={passwordForm.handleSubmit((d) => passwordMutation.mutate(d))} className="space-y-4">
                        <FormField
                          control={passwordForm.control}
                          name="currentPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Current password" data-testid="input-current-password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={passwordForm.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="At least 8 characters" data-testid="input-new-password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={passwordForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm New Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Repeat new password" data-testid="input-confirm-password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" disabled={passwordMutation.isPending} data-testid="button-change-password">
                          {passwordMutation.isPending ? "Updating…" : "Update Password"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              )}

              {activeSection === "account" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Account</CardTitle>
                    <CardDescription>Manage your account data</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {emailChangeConfirmed && (
                      <div
                        className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm"
                        data-testid="email-change-success"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <p>Your email address has been updated and verified.</p>
                      </div>
                    )}
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Email address</p>
                          <p className="text-sm text-muted-foreground" data-testid="text-current-email">
                            {user?.email || "—"}
                          </p>
                        </div>
                      </div>
                      {displayedPendingEmail && (
                        <div
                          className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm"
                          data-testid="email-change-pending"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <p>
                            A verification link was sent to <strong>{displayedPendingEmail}</strong>. It expires within 30 minutes.
                            Requesting another link will invalidate this one.
                          </p>
                        </div>
                      )}
                      <Form {...emailChangeForm}>
                        <form
                          onSubmit={emailChangeForm.handleSubmit((data) => emailChangeMutation.mutate(data))}
                          className="space-y-4"
                        >
                          <FormField
                            control={emailChangeForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>New email address</FormLabel>
                                <FormControl>
                                  <Input
                                    type="email"
                                    placeholder="new@email.com"
                                    autoComplete="email"
                                    data-testid="input-new-email"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button
                            type="submit"
                            disabled={emailChangeMutation.isPending}
                            data-testid="button-request-email-change"
                          >
                            {emailChangeMutation.isPending
                              ? "Sending…"
                              : displayedPendingEmail
                                ? "Send another verification link"
                                : "Send verification link"}
                          </Button>
                        </form>
                      </Form>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-1">Username</p>
                      <p className="text-sm text-muted-foreground" data-testid="text-username">@{user?.username}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Role</p>
                      <p className="text-sm text-muted-foreground capitalize" data-testid="text-role">{user?.role?.toLowerCase()}</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-sm font-semibold text-destructive mb-1">Danger Zone</p>
                      <p className="text-sm text-muted-foreground mb-2">
                        To delete your account, please contact our support team.
                      </p>
                      <a
                        href="mailto:support@tattoorecord.com"
                        className="text-sm text-primary underline"
                        data-testid="link-contact-support"
                      >
                        Contact support
                      </a>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
