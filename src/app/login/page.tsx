
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { APP_NAME } from '@/constants';
import { Loader2, Mail, LogIn, Coins } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { signInWithEmail, signInWithGoogle, loadingAuth, user } = useAuth();
  const router = useRouter();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (!loadingAuth && user) {
      router.replace('/dashboard');
    }
  }, [user, loadingAuth, router]);

  if (loadingAuth) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If user is already loaded and present, they will be redirected by useEffect.
  // We can return null or a minimal loader here to avoid rendering the form briefly.
  if (user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const onSubmit = async (data: LoginFormData) => {
    await signInWithEmail(data.email, data.password);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    await signInWithGoogle();
    // No need to setIsGoogleLoading(false) here if redirect happens or component unmounts
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <Coins className="mx-auto h-12 w-12 text-primary mb-2" />
          <CardTitle className="text-3xl font-bold font-headline">{APP_NAME}</CardTitle>
          <CardDescription>Sign in to continue to your dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
              {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting || isGoogleLoading}>
              {(isSubmitting) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In with Email
            </Button>
          </form>
          <div className="my-6 flex items-center">
            <div className="flex-grow border-t border-muted"></div>
            <span className="mx-4 flex-shrink text-xs uppercase text-muted-foreground">Or continue with</span>
            <div className="flex-grow border-t border-muted"></div>
          </div>
          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isGoogleLoading || isSubmitting}>
            {isGoogleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
             {/* Using Chrome icon as a stand-in for Google branding for simplicity */}
            <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4"><title>Google</title><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.08-2.58 2.03-4.66 2.03-3.86 0-6.99-3.08-6.99-7.11s3.13-7.11 6.99-7.11c1.93 0 3.21.79 4.18 1.58l2.64-2.58C18.07 1.62 15.51 0 12.48 0 5.88 0 0 5.56 0 12.31s5.88 12.31 12.48 12.31c2.89 0 5.21-.96 6.95-2.65 1.83-1.74 2.76-4.22 2.76-7.31 0-.6-.05-1.18-.15-1.72H12.48z"/></svg>
            Sign In with Google
          </Button>
        </CardContent>
        <CardFooter className="text-center">
          <p className="w-full text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Button variant="link" asChild className="p-0 h-auto">
              <Link href="/signup">Sign up</Link>
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
