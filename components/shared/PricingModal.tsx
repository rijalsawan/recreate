"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ExternalLink, Loader2, Sparkles, X, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PUBLIC_PLAN_CARDS, type BillingInterval, type PlanSlug } from '@/lib/plans';
import { useUserStore } from '@/stores/useUserStore';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function PricingModal({ isOpen, onClose }: Props) {
  const { user } = useUserStore();
  const currentPlan = (user?.plan ?? 'free') as PlanSlug;

  const [billingInterval, setBillingInterval] = useState<BillingInterval>('month');
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<'pro' | 'business' | null>(null);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  const isPaidPlan = currentPlan !== 'free';

  const openCheckout = async (targetPlan: 'pro' | 'business') => {
    if (isCheckoutLoading) return;
    setIsCheckoutLoading(true);
    setCheckoutPlan(targetPlan);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: targetPlan, interval: billingInterval }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to start checkout');
      if (!data.url) throw new Error('No checkout URL returned');
      window.location.href = data.url;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to start checkout');
    } finally {
      setIsCheckoutLoading(false);
      setCheckoutPlan(null);
    }
  };

  const openPortal = async () => {
    if (isPortalLoading) return;
    setIsPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to open portal');
      if (!data.url) throw new Error('No portal URL returned');
      window.location.href = data.url;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not open Stripe portal');
    } finally {
      setIsPortalLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ duration: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="fixed inset-0 z-[81] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0A0A0B] border border-white/10 rounded-3xl shadow-[0_0_80px_-20px_rgba(124,58,237,0.3)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between px-8 pt-8 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Plans & billing</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isPaidPlan
                      ? `You're on the ${currentPlan} plan. Manage or change via portal.`
                      : 'Upgrade for unlimited generations, all models, and commercial rights.'}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Billing toggle */}
              <div className="flex items-center gap-3 px-8 pb-6 text-sm">
                <button
                  onClick={() => setBillingInterval('month')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg transition-colors font-medium',
                    billingInterval === 'month'
                      ? 'bg-white/10 text-white'
                      : 'text-muted-foreground hover:text-white'
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingInterval('year')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-2',
                    billingInterval === 'year'
                      ? 'bg-white/10 text-white'
                      : 'text-muted-foreground hover:text-white'
                  )}
                >
                  Annual
                  <span className="text-[10px] font-bold text-green-400 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded-full">
                    Save 20%
                  </span>
                </button>
              </div>

              {/* Plan cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-8 pb-8">
                {PUBLIC_PLAN_CARDS.map((card) => {
                  const isCurrent = card.slug === currentPlan;
                  const price =
                    billingInterval === 'year' ? card.yearlyPrice : card.monthlyPrice;
                  const canUpgrade = card.slug === 'pro' || card.slug === 'business';
                  const isThisLoading =
                    isCheckoutLoading &&
                    checkoutPlan === (card.slug as 'pro' | 'business');

                  const handleClick = () => {
                    if (isCurrent) return;
                    if (card.slug === 'free') {
                      if (isPaidPlan) void openPortal();
                      return;
                    }
                    if (isPaidPlan) {
                      void openPortal();
                    } else {
                      void openCheckout(card.slug as 'pro' | 'business');
                    }
                  };

                  const btnLabel = isCurrent
                    ? 'Current plan'
                    : isPaidPlan && canUpgrade
                      ? 'Manage in portal'
                      : card.slug === 'free'
                        ? isPaidPlan
                          ? 'Downgrade via portal'
                          : 'Your current plan'
                        : card.ctaLabel;

                  return (
                    <div
                      key={card.slug}
                      className={cn(
                        'relative rounded-2xl border p-6 flex flex-col gap-4',
                        card.highlighted
                          ? 'border-primary/60 bg-primary/10'
                          : 'border-white/10 bg-white/5'
                      )}
                    >
                      {card.highlighted && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                          Most popular
                        </div>
                      )}

                      <div>
                        <p className="text-base font-semibold text-white">{card.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                      </div>

                      <div>
                        <p className="text-3xl font-bold text-white">
                          {price === 0 ? 'Free' : `$${price}`}
                          {price > 0 && (
                            <span className="text-base font-normal text-muted-foreground">/mo</span>
                          )}
                        </p>
                        {billingInterval === 'year' && price > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            billed annually (${price * 12}/yr)
                          </p>
                        )}
                        <p className="text-xs text-primary mt-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          {card.creditsLabel}
                        </p>
                      </div>

                      <ul className="space-y-1.5 flex-1">
                        {card.features.map((feature) => (
                          <li
                            key={feature}
                            className="text-xs text-muted-foreground flex items-start gap-2"
                          >
                            <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <button
                        type="button"
                        disabled={
                          isCurrent ||
                          (isCheckoutLoading && !isThisLoading) ||
                          isPortalLoading
                        }
                        onClick={handleClick}
                        className={cn(
                          'h-10 rounded-xl text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 inline-flex items-center justify-center gap-2',
                          card.highlighted
                            ? 'bg-primary hover:bg-primary-hover text-white'
                            : isCurrent
                              ? 'bg-white/5 text-white/50 border border-white/10 cursor-default'
                              : 'bg-white/10 hover:bg-white/15 text-white'
                        )}
                      >
                        {isThisLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {btnLabel}
                      </button>

                      {isCurrent && (
                        <span className="text-[10px] text-center text-muted-foreground -mt-2">
                          ✓ Active
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Stripe portal link */}
              {isPaidPlan && (
                <div className="border-t border-white/10 mx-8 pt-5 pb-8 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-white">Billing portal</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Manage payment methods, invoices, and subscription changes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void openPortal()}
                    disabled={isPortalLoading}
                    className="inline-flex items-center gap-2 px-4 h-9 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                  >
                    {isPortalLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ExternalLink className="w-3.5 h-3.5" />
                    )}
                    {isPortalLoading ? 'Opening...' : 'Open Stripe portal'}
                  </button>
                </div>
              )}

              {!isPaidPlan && (
                <div className="border-t border-white/10 mx-8 pt-5 pb-8">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Zap className="w-4 h-4 text-primary shrink-0" />
                    <span>
                      Subscriptions are handled securely by Stripe. Cancel anytime from
                      your billing portal.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
