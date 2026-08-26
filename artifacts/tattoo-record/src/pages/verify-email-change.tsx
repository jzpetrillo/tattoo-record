import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/api";

type VerificationStatus = "loading" | "success" | "error";

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

export default function VerifyEmailChange() {
  const [, setLocation] = useLocation();
  const { user, token, setAuth } = useAuth();
  const verificationToken = new URLSearchParams(window.location.search).get("token") || "";
  const [status, setStatus] = useState<VerificationStatus>("loading");
  const [message, setMessage] = useState("");

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        "/api/auth/confirm-email-change",
        { token: verificationToken },
        token || undefined,
      );
      return res.json();
    },
    onSuccess: (data: { message: string; user?: Parameters<typeof setAuth>[0] }) => {
      if (data.user && token && user?.id === data.user.id) {
        setAuth(data.user, token);
      }
      setStatus("success");
      setMessage(
        data.user && token && user && user.id !== data.user.id
          ? `${data.message} You are currently signed in to a different account, which was not changed.`
          : data.message,
      );
    },
    onError: (error: Error) => {
      setStatus("error");
      setMessage(getApiErrorMessage(error));
    },
  });

  useEffect(() => {
    if (!verificationToken) {
      setStatus("error");
      setMessage("This email verification link is missing its token.");
      return;
    }
    confirmMutation.mutate();
  }, [verificationToken]);

  const returnPath = user ? "/settings?section=account&emailChanged=1" : "/auth";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2">
            {status === "loading" && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
            {status === "success" && <CheckCircle2 className="h-8 w-8 text-primary" />}
            {status === "error" && <AlertCircle className="h-8 w-8 text-destructive" />}
          </div>
          <CardTitle data-testid="email-change-verification-title">
            {status === "loading"
              ? "Verifying your email"
              : status === "success"
                ? "Email address verified"
                : "Email verification failed"}
          </CardTitle>
          <CardDescription data-testid="email-change-verification-message">
            {status === "loading"
              ? "Please wait while we confirm your new email address."
              : message}
          </CardDescription>
        </CardHeader>
        {status !== "loading" && (
          <CardContent className="space-y-3">
            {status === "error" && verificationToken && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setStatus("loading");
                  setMessage("");
                  confirmMutation.reset();
                  confirmMutation.mutate();
                }}
                data-testid="button-retry-email-verification"
              >
                Try again
              </Button>
            )}
            <Button
              className="w-full"
              onClick={() => setLocation(returnPath)}
              data-testid="button-return-from-email-verification"
            >
              {user ? "Back to account settings" : "Go to sign in"}
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}