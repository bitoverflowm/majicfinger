'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { useUser, mutateUser } from '@/lib/hooks';
import { Magic } from 'magic-sdk';
import { useRouter } from 'next/navigation';
import { useMyStateV2 } from '@/context/stateContextV2';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';

const Login = ({ fromHome }) => {
  const router = useRouter();
  const contextStateV2 = useMyStateV2();
  const setViewing = contextStateV2?.setViewing;
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const user = useUser();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setProgress(0);
    const timer = setInterval(() => setProgress((prev) => Math.min(prev + 10, 90)), 3000);
    const body = { email, name };
    const isDevBypass = process.env.NODE_ENV === 'development' && email === 'rikesh@bitoverflow.org';
    if (isDevBypass) body.devBypass = true;

    let res;
    if (isDevBypass) {
      res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      const magic = new Magic(process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY);
      const didToken = await magic.auth.loginWithMagicLink({ email });
      res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + didToken },
        body: JSON.stringify(body),
      });
    }
    if (res.status === 200) {
      mutateUser();
      setLoading(false);
      clearInterval(timer);
      setProgress(100);
    } else {
      console.error('Magic Login Failed', await res.text());
      alert('There was an issue with login. Please message @misterrpink1 on Twitter.');
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh w-full flex-1 flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full min-h-screen flex-col p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-black" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <img src="/fruit.png" alt="Lychee" className="mr-2 h-8 w-6 brightness-0 invert" />
          <span className="text-white">Lychee</span>
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="leading-normal text-balance text-white/90">
            &ldquo;Discover something great.&rdquo;
          </blockquote>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center p-8 lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center gap-6 sm:w-[350px]">
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-muted-foreground">Enter your email below to receive a magic link</p>
          </div>
          {loading ? (
            <Progress value={progress} className="w-full" />
          ) : user ? (
            <div className="space-y-4 rounded-lg border p-4">
              <p className="text-sm">Welcome, {user.email}</p>
              <Button onClick={() => (fromHome ? router.push('/dashboard') : setViewing?.('dashboard'))} className="w-full">
                Go to dashboard
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-10" />
              </div>
              <Button type="submit" className="w-full">
                Continue with Email
              </Button>
            </form>
          )}
          <p className="px-6 text-center text-xs text-muted-foreground">
            By continuing, you agree to our <Link href="/terms" className="underline hover:text-primary">Terms of Service</Link> and <Link href="/privacy" className="underline hover:text-primary">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
