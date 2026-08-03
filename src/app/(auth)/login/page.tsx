"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { schemas } from "@/lib/validation";
import type { z } from "zod";

type FormValues = z.infer<typeof schemas.login>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schemas.login),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error?.message ?? "Login failed");
        return;
      }
      toast.success("Welcome back");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vw-card">
      <div className="mb-6">
        <h1 className="vw-display text-2xl">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Access your election workspace.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
        <Button type="submit" disabled={loading} className="mt-2">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
        New to VoteWise?{" "}
        <Link href="/register" className="text-foreground underline-offset-4 hover:underline">
          Create an organization
        </Link>
      </div>

      <div className="mt-4 rounded-lg bg-background-subtle p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Demo credentials</p>
        <p className="mt-1">Org owner: <code className="vw-mono">owner@achema.edu</code> / <code className="vw-mono">owner123</code></p>
        <p>Platform admin: <code className="vw-mono">admin@votewise.app</code> / <code className="vw-mono">platform123</code></p>
      </div>
    </div>
  );
}
