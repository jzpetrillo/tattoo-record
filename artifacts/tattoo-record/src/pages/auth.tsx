import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Palette, Building2, Heart } from "lucide-react";

const DEMO_ROLES = ["ARTIST", "STUDIO", "ENTHUSIAST"] as const;

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ARTIST", "STUDIO", "ENTHUSIAST"]),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type AuthView = "login" | "register" | "forgot" | "reset";

export default function Auth() {
  const [authView, setAuthView] = useState<AuthView>("login");
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [location, setLocation] = useLocation();
  const { user, setAuth } = useAuth();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(window.location.search);
  const resetToken = searchParams.get("token") || "";

  useEffect(() => {
    const mode = new URLSearchParams(window.location.search).get("mode");
    setAuthView(mode === "register" ? "register" : mode === "reset" && resetToken ? "reset" : "login");
    setResetEmailSent(false);
  }, [location, resetToken]);

  // Redirect authenticated users to home
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", username: "", password: "", role: "ENTHUSIAST" as const },
  });

  const forgotPasswordForm = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const resetPasswordForm = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: z.infer<typeof loginSchema>) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return res.json();
    },
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      setLocation("/");
      toast({ title: "Welcome back!", description: "You have successfully logged in." });
    },
    onError: (error: Error) => {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    },
  });

  const demoLoginMutation = useMutation({
    mutationFn: async (role: (typeof DEMO_ROLES)[number]) => {
      const res = await apiRequest("POST", "/api/auth/demo-login", { role });
      return res.json();
    },
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      setLocation("/");
      toast({ title: "Welcome back!", description: "You have signed in to the demo account." });
    },
    onError: (error: Error) => {
      toast({ title: "Demo login failed", description: error.message, variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: z.infer<typeof registerSchema>) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return res.json();
    },
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      setLocation("/");
      toast({ title: "Welcome to Tattoo Record!", description: "Your account has been created." });
    },
    onError: (error: Error) => {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof forgotPasswordSchema>) => {
      const res = await apiRequest("POST", "/api/auth/forgot-password", data);
      return res.json();
    },
    onSuccess: () => {
      setResetEmailSent(true);
    },
    onError: (error: Error) => {
      toast({ title: "Unable to request a reset link", description: error.message, variant: "destructive" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof resetPasswordSchema>) => {
      const res = await apiRequest("POST", "/api/auth/reset-password", {
        token: resetToken,
        password: data.password,
      });
      return res.json();
    },
    onSuccess: () => {
      resetPasswordForm.reset();
      setLocation("/auth");
      toast({ title: "Password reset", description: "Your password has been updated. You can now sign in." });
    },
    onError: (error: Error) => {
      toast({ title: "Unable to reset password", description: error.message, variant: "destructive" });
    },
  });

  const handleQuickLogin = (role: (typeof DEMO_ROLES)[number]) => {
    demoLoginMutation.mutate(role);
  };

  const cardDescription = authView === "login"
    ? "Sign in to your account"
    : authView === "register"
      ? "Create a new account"
      : authView === "forgot"
        ? "Request a password reset link"
        : "Choose a new password";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl press-nameplate">Tattoo Record</CardTitle>
            <CardDescription>{cardDescription}</CardDescription>
        </CardHeader>
        <CardContent>
           {authView === "login" ? (
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="your@email.com" {...field} data-testid="input-login-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} data-testid="input-login-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loginMutation.isPending} data-testid="button-login">
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>
                <button
                  type="button"
                  onClick={() => setAuthView("forgot")}
                  className="w-full text-sm text-primary hover:underline"
                  data-testid="button-forgot-password"
                >
                  Forgot password?
                </button>
              </form>
            </Form>
          ) : authView === "register" ? (
            <Form {...registerForm}>
              <form onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={registerForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="your@email.com" 
                          {...field} 
                          id="register-email"
                          data-testid="input-register-email" 
                          autoComplete="email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder="yourname" 
                          {...field} 
                          id="register-username"
                          data-testid="input-register-username" 
                          autoComplete="username"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          {...field} 
                          id="register-password"
                          data-testid="input-register-password" 
                          autoComplete="new-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>I am a...</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-role">
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ENTHUSIAST">Tattoo Enthusiast</SelectItem>
                          <SelectItem value="ARTIST">Tattoo Artist</SelectItem>
                          <SelectItem value="STUDIO">Tattoo Studio</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={registerMutation.isPending} data-testid="button-register">
                  {registerMutation.isPending ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </Form>
           ) : authView === "forgot" ? (
             resetEmailSent ? (
               <div className="space-y-4 text-center">
                 <p className="text-sm text-muted-foreground">
                   If an account exists for that email, a password reset link is on its way.
                 </p>
                 <Button
                   type="button"
                   variant="outline"
                   className="w-full"
                   onClick={() => {
                     setAuthView("login");
                     setResetEmailSent(false);
                   }}
                 >
                   Back to sign in
                 </Button>
               </div>
             ) : (
               <Form {...forgotPasswordForm}>
                 <form
                   onSubmit={forgotPasswordForm.handleSubmit((data) => forgotPasswordMutation.mutate(data))}
                   className="space-y-4"
                 >
                   <FormField
                     control={forgotPasswordForm.control}
                     name="email"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Email</FormLabel>
                         <FormControl>
                           <Input
                             type="email"
                             placeholder="your@email.com"
                             autoComplete="email"
                             {...field}
                             data-testid="input-forgot-email"
                           />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                   <Button
                     type="submit"
                     className="w-full"
                     disabled={forgotPasswordMutation.isPending}
                     data-testid="button-send-reset"
                   >
                     {forgotPasswordMutation.isPending ? "Sending..." : "Send reset link"}
                   </Button>
                   <button
                     type="button"
                     onClick={() => setAuthView("login")}
                     className="w-full text-sm text-primary hover:underline"
                   >
                     Back to sign in
                   </button>
                 </form>
               </Form>
             )
           ) : (
             <Form {...resetPasswordForm}>
               <form
                 onSubmit={resetPasswordForm.handleSubmit((data) => resetPasswordMutation.mutate(data))}
                 className="space-y-4"
               >
                 <FormField
                   control={resetPasswordForm.control}
                   name="password"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>New password</FormLabel>
                       <FormControl>
                         <Input
                           type="password"
                           placeholder="••••••••"
                           autoComplete="new-password"
                           {...field}
                           data-testid="input-reset-password"
                         />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
                 <FormField
                   control={resetPasswordForm.control}
                   name="confirmPassword"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Confirm new password</FormLabel>
                       <FormControl>
                         <Input
                           type="password"
                           placeholder="••••••••"
                           autoComplete="new-password"
                           {...field}
                           data-testid="input-reset-password-confirm"
                         />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
                 <Button
                   type="submit"
                   className="w-full"
                   disabled={resetPasswordMutation.isPending}
                   data-testid="button-reset-password"
                 >
                   {resetPasswordMutation.isPending ? "Updating..." : "Update password"}
                 </Button>
               </form>
             </Form>
           )}

           {authView === "login" && import.meta.env.VITE_DEMO_MODE === "true" && (
            <>
              <div className="relative my-6">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground uppercase tracking-wider">
                  Quick Demo Login
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickLogin("ARTIST")}
                  disabled={demoLoginMutation.isPending}
                  className="flex items-center gap-2"
                  data-testid="quick-login-artist"
                >
                  <Palette className="w-4 h-4" />
                  Artist
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickLogin("STUDIO")}
                  disabled={demoLoginMutation.isPending}
                  className="flex items-center gap-2"
                  data-testid="quick-login-studio"
                >
                  <Building2 className="w-4 h-4" />
                  Studio
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickLogin("ENTHUSIAST")}
                  disabled={demoLoginMutation.isPending}
                  className="flex items-center gap-2"
                  data-testid="quick-login-enthusiast"
                >
                  <Heart className="w-4 h-4" />
                  Enthusiast
                </Button>
              </div>
            </>
          )}

          <div className="mt-4 text-center space-y-2">
             {authView === "login" || authView === "register" ? (
               <button
                 onClick={() => {
                   setAuthView(authView === "login" ? "register" : "login");
                   loginForm.reset();
                   registerForm.reset();
                 }}
                 className="text-sm text-primary hover:underline block w-full"
                 data-testid="button-toggle-auth"
               >
                 {authView === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
               </button>
             ) : (
               <button
                 onClick={() => {
                   setAuthView("login");
                   setResetEmailSent(false);
                 }}
                 className="text-sm text-primary hover:underline block w-full"
               >
                 Back to sign in
               </button>
             )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
