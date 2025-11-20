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
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

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

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [, setLocation] = useLocation();
  const { user, setAuth } = useAuth();
  const { toast } = useToast();

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

  const registerMutation = useMutation({
    mutationFn: async (data: z.infer<typeof registerSchema>) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return res.json();
    },
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      setLocation("/");
      toast({ title: "Welcome to Inktagram!", description: "Your account has been created." });
    },
    onError: (error: Error) => {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl gradient-text">Inktagram</CardTitle>
          <CardDescription>
            {isLogin ? "Sign in to your account" : "Create a new account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLogin ? (
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
              </form>
            </Form>
          ) : (
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
          )}

          <div className="mt-4 text-center space-y-2">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                loginForm.reset();
                registerForm.reset();
              }}
              className="text-sm text-primary hover:underline block w-full"
              data-testid="button-toggle-auth"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
            <button
              onClick={() => setLocation("/admin")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-admin-link"
            >
              Admin Access →
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
