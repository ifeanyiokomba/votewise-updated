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
import { Textarea } from "@/components/ui/textarea";
import { schemas } from "@/lib/validation";
import type { z } from "zod";
import { ORG_CATEGORIES } from "@/lib/constants";

type FormValues = z.infer<typeof schemas.register>;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schemas.register),
    defaultValues: {
      organizationName: "",
      subdomain: "",
      category: "UNIVERSITY",
      ownerName: "",
      ownerEmail: "",
      password: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error?.message ?? "Registration failed");
        return;
      }
      toast.success("Organization created");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vw-card vw-fade-up">
      <div className="mb-6">
        <h1 className="vw-display text-2xl">Create your organization</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up a secure election workspace in under a minute.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="orgName">Organization name</Label>
          <Input id="orgName" placeholder="Achema State University" {...register("organizationName")} />
          {errors.organizationName && <p className="text-xs text-destructive">{errors.organizationName.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subdomain">Subdomain</Label>
            <div className="flex items-center rounded-md border border-input bg-background">
              <Input
                id="subdomain"
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder="achema"
                {...register("subdomain")}
              />
              <span className="px-2 text-xs text-muted-foreground">.votewise</span>
            </div>
            {errors.subdomain && <p className="text-xs text-destructive">{errors.subdomain.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category">Type</Label>
            <select
              id="category"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              {...register("category")}
            >
              {ORG_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="mb-3 text-xs font-medium text-muted-foreground">Owner account</p>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ownerName">Your name</Label>
              <Input id="ownerName" placeholder="Dr. Adaeze Nwosu" {...register("ownerName")} />
              {errors.ownerName && <p className="text-xs text-destructive">{errors.ownerName.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ownerEmail">Email</Label>
              <Input id="ownerEmail" type="email" placeholder="you@org.edu" {...register("ownerEmail")} />
              {errors.ownerEmail && <p className="text-xs text-destructive">{errors.ownerEmail.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="At least 8 characters" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
          </div>
        </div>

        <Button type="submit" disabled={loading} className="mt-2">
          {loading ? "Creating…" : "Create organization"}
        </Button>
      </form>

      <div className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
