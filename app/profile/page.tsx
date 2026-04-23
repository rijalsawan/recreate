"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Camera,
  Check,
  CreditCard,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { PricingModal } from '@/components/shared/PricingModal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/useUserStore';
import { WorkspaceSidebarShell } from '@/components/layout/WorkspaceSidebarShell';
import {
  type BillingInterval,
  type PlanSlug,
  PUBLIC_PLAN_CARDS,
} from '@/lib/plans';

type ProfileTab = 'personal' | 'subscription';
type UserPlan = PlanSlug;

type ProfileResponse = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  credits: number;
  plan: UserPlan;
  role: 'USER' | 'ADMIN';
  subscriptionStatus: string | null;
  subscriptionCurrentPeriodEnd: string | null;
  subscriptionCancelAtPeriodEnd: boolean;
  createdAt: string;
};

function getInitial(name: string | null | undefined, email: string | null | undefined): string {
  const source = (name || email || 'U').trim();
  return source.charAt(0).toUpperCase() || 'U';
}

function formatJoinDate(value: string | undefined): string {
  if (!value) return 'Unknown';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown';
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatBillingDate(value: string | null | undefined): string {
  if (!value) return 'Unknown';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown';
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ProfilePage() {
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);

  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('month');
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<'pro' | 'business' | null>(null);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const billing = params.get('billing');

    if (tab === 'subscription') {
      setActiveTab('subscription');
    }

    if (billing === 'success') {
      toast.success('Subscription updated successfully');
    }
    if (billing === 'cancelled') {
      toast.info('Checkout cancelled');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/user/profile', { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to load profile');
        const data = (await response.json()) as ProfileResponse;

        if (cancelled) return;
        setProfile(data);
        setNameInput(data.name || '');
      } catch {
        if (!cancelled) {
          toast.error('Could not load your profile');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const onChooseAvatar = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }

    const maxBytes = 8 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error('Profile icon must be 8MB or smaller');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setAvatarFile(file);
    setAvatarPreviewUrl((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return objectUrl;
    });
  };

  const effectiveAvatarUrl = avatarPreviewUrl || profile?.image || user?.avatarUrl || null;

  const hasPendingPersonalChanges = useMemo(() => {
    if (!profile) return false;
    const nameChanged = nameInput.trim() !== (profile.name || '');
    return nameChanged || !!avatarFile;
  }, [avatarFile, nameInput, profile]);

  const savePersonalSettings = async () => {
    if (!profile || !hasPendingPersonalChanges || isSaving) return;

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', nameInput.trim());
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to save profile');
      }

      const updated = (await response.json()) as ProfileResponse;
      setProfile(updated);
      setNameInput(updated.name || '');
      setAvatarFile(null);
      setAvatarPreviewUrl((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return null;
      });

      setUser({
        id: updated.id,
        email: updated.email,
        name: updated.name || '',
        avatarUrl: updated.image || undefined,
        credits: updated.credits,
        plan: updated.plan,
        role: updated.role ?? 'USER',
      });

      toast.success('Profile updated');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save profile';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const openCheckout = async (targetPlan: 'pro' | 'business') => {
    if (isCheckoutLoading) return;

    setIsCheckoutLoading(true);
    setCheckoutPlan(targetPlan);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: targetPlan,
          interval: billingInterval,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to create checkout session');
      }

      if (!payload.url) {
        throw new Error('Stripe did not return a checkout URL');
      }

      window.location.href = payload.url;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to start checkout';
      toast.error(message);
    } finally {
      setIsCheckoutLoading(false);
      setCheckoutPlan(null);
    }
  };

  const openPortal = async () => {
    if (isPortalLoading) return;

    setIsPortalLoading(true);

    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to open Stripe portal');
      }

      if (!payload.url) {
        throw new Error('Stripe did not return a portal URL');
      }

      window.location.href = payload.url;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not open Stripe portal';
      toast.error(message);
    } finally {
      setIsPortalLoading(false);
    }
  };

  const plan = (profile?.plan || user?.plan || 'free') as UserPlan;
  const credits = profile?.credits ?? user?.credits ?? 0;
  const currentPlanCard =
    PUBLIC_PLAN_CARDS.find((entry) => entry.slug === plan) || PUBLIC_PLAN_CARDS[0];
  const isPaidPlan = plan !== 'free';
  const statusText = profile?.subscriptionStatus
    ? profile.subscriptionStatus.replace(/_/g, ' ')
    : (isPaidPlan ? 'active' : 'free plan');
  const renewalText = profile?.subscriptionCurrentPeriodEnd
    ? formatBillingDate(profile.subscriptionCurrentPeriodEnd)
    : 'N/A';

  return (
    <WorkspaceSidebarShell activeSection="profile">
      <div className="h-full overflow-y-auto bg-[#0A0A0B]">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 py-8 lg:py-10 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl lg:text-4xl font-display font-bold tracking-tight text-white">Profile</h1>
          <p className="text-muted-foreground">
            Manage your account settings, profile icon, subscription, and credits.
          </p>
        </div>

        <div className="inline-flex items-center bg-elevated border border-white/10 rounded-xl p-1 gap-1">
          <button
            onClick={() => setActiveTab('personal')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'personal' ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'
            )}
          >
            Personal settings / account
          </button>
          <button
            onClick={() => setActiveTab('subscription')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'subscription' ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'
            )}
          >
            Manage subscription / credits
          </button>
        </div>

        {isLoading ? (
          <div className="h-72 rounded-3xl border border-white/10 bg-card flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : activeTab === 'personal' ? (
          <div className="space-y-5">
            <section className="rounded-3xl border border-white/10 bg-card p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
                <div className="relative w-24 h-24 rounded-2xl border border-white/15 bg-elevated overflow-hidden shrink-0 flex items-center justify-center">
                  {effectiveAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={effectiveAvatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-primary">
                      {getInitial(profile?.name, profile?.email || user?.email)}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <h2 className="text-xl font-semibold text-white">Profile icon</h2>
                  <p className="text-sm text-muted-foreground">
                    Upload a new image to personalize your account identity across the app.
                  </p>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-sm font-medium text-white transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      Change profile icon
                    </button>
                    {avatarFile && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-primary">
                        <Check className="w-3.5 h-3.5" />
                        New icon ready to save
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={onChooseAvatar}
                className="hidden"
              />
            </section>

            <section className="rounded-3xl border border-white/10 bg-card p-5 sm:p-6 space-y-5">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-white">Account details</h3>
                <p className="text-sm text-muted-foreground">Keep your profile information up to date.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">Display name</label>
                  <input
                    value={nameInput}
                    onChange={(event) => setNameInput(event.target.value)}
                    placeholder="Your name"
                    className="w-full h-11 rounded-xl border border-white/10 bg-elevated px-3.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">Email</label>
                  <div className="h-11 rounded-xl border border-white/10 bg-black/20 px-3.5 text-sm text-white/85 flex items-center">
                    {profile?.email || user?.email || 'Not available'}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">Current plan</label>
                  <div className="h-11 rounded-xl border border-white/10 bg-black/20 px-3.5 text-sm text-white/85 flex items-center capitalize">
                    {currentPlanCard.name}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">Member since</label>
                  <div className="h-11 rounded-xl border border-white/10 bg-black/20 px-3.5 text-sm text-white/85 flex items-center">
                    {formatJoinDate(profile?.createdAt)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  onClick={savePersonalSettings}
                  disabled={!hasPendingPersonalChanges || isSaving}
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Save changes
                </button>
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-5">
            <section className="rounded-3xl border border-white/10 bg-card p-5 sm:p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div>
                  <h2 className="text-[2rem] font-display font-bold text-white">Subscription</h2>
                  <h3 className="text-3xl font-semibold text-white mt-4 capitalize">{currentPlanCard.name}</h3>
                  <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                    <p className="capitalize">Status: {statusText}</p>
                    <p>
                      Renewal: {renewalText}
                      {profile?.subscriptionCancelAtPeriodEnd ? ' (canceling at period end)' : ''}
                    </p>
                    <p>{currentPlanCard.creditsLabel}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 w-full lg:w-56">
                  <button
                    type="button"
                    onClick={() => setShowPricingModal(true)}
                    className="h-12 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold text-base flex items-center justify-center transition-colors"
                  >
                    Change plan
                  </button>
                  <button
                    type="button"
                    onClick={openPortal}
                    disabled={isPortalLoading}
                    className="h-12 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-base disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isPortalLoading ? 'Opening portal...' : 'Manage billing details'}
                  </button>
                </div>
              </div>

              <div className="h-px bg-white/10 my-8" />

              <div className="space-y-2">
                <p className="text-4xl sm:text-5xl font-bold text-primary inline-flex items-center gap-2">
                  <Sparkles className="w-8 h-8" />
                  {credits.toLocaleString()} credits
                </p>
                <p className="text-muted-foreground text-lg">Available in your balance right now</p>
              </div>

              <div className="mt-8 rounded-2xl border border-white/10 bg-elevated/40 p-5 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                <div className="max-w-xl">
                  <h4 className="text-3xl font-display font-bold text-white">Unlock the full power of Recraft</h4>
                  <p className="mt-3 text-muted-foreground text-lg leading-relaxed">
                    No daily limits. Faster generations. Private styles, commercial rights, and smarter editing tools for production workflows.
                  </p>
                  {!isPaidPlan && (
                    <button
                      onClick={() => openCheckout('pro')}
                      disabled={isCheckoutLoading}
                      className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isCheckoutLoading && checkoutPlan === 'pro' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                      Upgrade to Pro
                    </button>
                  )}
                </div>

                <div className="hidden md:flex items-center justify-center w-40 h-40 rounded-2xl bg-black/25 border border-white/10 text-primary">
                  <Sparkles className="w-16 h-16" />
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-card p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-white">Plans and billing</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-5">
                Choose a billing cadence and start checkout directly. Existing subscribers can manage upgrades, invoices, and payment methods in Stripe portal.
              </p>

              <div className="inline-flex items-center bg-elevated border border-white/10 rounded-xl p-1 gap-1 mb-5">
                <button
                  onClick={() => setBillingInterval('month')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors',
                    billingInterval === 'month' ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingInterval('year')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors',
                    billingInterval === 'year' ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'
                  )}
                >
                  Annual (save 20%)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PUBLIC_PLAN_CARDS.map((entry) => {
                  const isCurrent = entry.slug === plan;
                  const price = billingInterval === 'year' ? entry.yearlyPrice : entry.monthlyPrice;
                  const canCheckout = entry.slug === 'pro' || entry.slug === 'business';

                  const buttonLabel = isCurrent
                    ? 'Current plan'
                    : canCheckout
                      ? `Choose ${entry.name}`
                      : 'Included';

                  const buttonAction = () => {
                    if (isCurrent) return;
                    if (entry.slug === 'free') {
                      if (isPaidPlan) {
                        void openPortal();
                      }
                      return;
                    }
                    if (isPaidPlan) {
                      void openPortal();
                      return;
                    }
                    void openCheckout(entry.slug as 'pro' | 'business');
                  };

                  const isThisCheckoutLoading =
                    isCheckoutLoading && checkoutPlan === (entry.slug === 'pro' || entry.slug === 'business' ? entry.slug : null);

                  return (
                    <div
                      key={entry.slug}
                      className={cn(
                        'rounded-2xl border p-4 flex flex-col gap-3',
                        entry.highlighted
                          ? 'border-primary/60 bg-primary/10'
                          : 'border-white/10 bg-black/20'
                      )}
                    >
                      <div>
                        <p className="text-base font-semibold text-white">{entry.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{entry.description}</p>
                      </div>

                      <div>
                        <p className="text-3xl font-bold text-white">
                          {price === 0 ? 'Free' : `$${price}/mo`}
                        </p>
                        <p className="text-xs text-primary mt-1">{entry.creditsLabel}</p>
                      </div>

                      <ul className="space-y-1.5 flex-1">
                        {entry.features.map((feature) => (
                          <li key={feature} className="text-xs text-muted-foreground flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-primary mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <button
                        type="button"
                        disabled={isCurrent || (isCheckoutLoading && !isThisCheckoutLoading) || isPortalLoading}
                        onClick={buttonAction}
                        className={cn(
                          'h-10 rounded-xl text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 inline-flex items-center justify-center gap-2',
                          entry.highlighted
                            ? 'bg-primary hover:bg-primary-hover text-white'
                            : 'bg-white/10 hover:bg-white/15 text-white'
                        )}
                      >
                        {isThisCheckoutLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {buttonLabel}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-dashed border-white/20 bg-black/20 px-5 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-5">
                <div>
                  <p className="text-white font-medium">Stripe customer portal</p>
                  <p className="text-xs text-muted-foreground mt-1">Open Stripe to manage payment methods, invoices, and subscription changes.</p>
                </div>
                <button
                  type="button"
                  onClick={openPortal}
                  disabled={isPortalLoading}
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-white/15 bg-white/5 text-white text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isPortalLoading ? 'Opening...' : 'Open Stripe portal'}
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </section>
          </div>
        )}
        </div>
      </div>
      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} />
    </WorkspaceSidebarShell>
  );
}
