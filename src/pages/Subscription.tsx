import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Sparkles, Zap, Crown, Users, Star, Film, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// Stripe price IDs mapped to tiers
const STRIPE_PRICES = {
  plus: 'price_1SbAVaPIKsN0mOiuIdjhDGaO',
  pro: 'price_1SbAVnPIKsN0mOiupPwbzMGC',
  vip: 'price_1SbAayPIKsN0mOiuPa78gKME',
  family: 'price_1SbAgePIKsN0mOiuW8G3COpp',
  creator_pro: 'price_1SbAhuPIKsN0mOiuZGLCO9uC',
} as const;

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'Basic access to content',
    icon: Star,
    features: [
      'Limited content library',
      'SD quality streaming',
      '1 device at a time',
      'Ads supported',
    ],
    color: 'from-gray-500 to-gray-600'
  },
  {
    id: 'plus',
    name: 'Plus',
    price: 9.99,
    period: '/month',
    description: 'Enhanced viewing experience',
    icon: Zap,
    features: [
      'Full content library',
      'HD quality streaming',
      '2 devices at a time',
      'Limited ads',
      'Download for offline',
    ],
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 14.99,
    period: '/month',
    description: 'Premium entertainment',
    icon: Sparkles,
    popular: true,
    features: [
      'Full content library',
      '4K Ultra HD streaming',
      '4 devices at a time',
      'Ad-free experience',
      'Download for offline',
      'Early access to originals',
    ],
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: 'vip',
    name: 'VIP',
    price: 24.99,
    period: '/month',
    description: 'Ultimate streaming experience',
    icon: Crown,
    features: [
      'Everything in Pro',
      '6 devices at a time',
      'Priority customer support',
      'Behind-the-scenes content',
      'Virtual premieres access',
      'AI Studio access',
    ],
    color: 'from-primary to-accent'
  },
];

const Subscription = () => {
  const { user, subscription, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({ title: 'Payment Successful!', description: 'Your subscription is now active.' });
      // Refresh subscription status
      checkSubscription();
    } else if (searchParams.get('canceled') === 'true') {
      toast({ title: 'Payment Canceled', description: 'Your subscription was not changed.', variant: 'destructive' });
    }
  }, [searchParams]);

  const checkSubscription = async () => {
    if (!user) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.functions.invoke('check-subscription', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (planId === 'free') {
      toast({ title: 'Free Plan', description: 'You are already on the free plan!' });
      return;
    }

    const priceId = STRIPE_PRICES[planId as keyof typeof STRIPE_PRICES];
    if (!priceId) {
      toast({ title: 'Error', description: 'Invalid plan selected', variant: 'destructive' });
      return;
    }

    setSelectedPlan(planId);
    setProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to start checkout', 
        variant: 'destructive' 
      });
    } finally {
      setProcessing(false);
      setSelectedPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to open billing portal', 
        variant: 'destructive' 
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-display font-bold mb-4"
            >
              Choose Your Plan
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-muted-foreground max-w-2xl mx-auto"
            >
              Unlock unlimited entertainment with our flexible subscription plans
            </motion.p>
          </div>

          {/* Current Plan Badge & Manage Button */}
          {subscription && subscription.tier !== 'free' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30">
                <span className="text-sm text-muted-foreground">Current plan:</span>
                <span className="font-semibold text-primary capitalize">{subscription.tier.replace('_', ' ')}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleManageSubscription}
                disabled={processing}
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage Subscription
              </Button>
            </motion.div>
          )}

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              const isCurrentPlan = subscription?.tier === plan.id;
              
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative glass-card rounded-2xl p-6 border ${
                    plan.popular 
                      ? 'border-primary shadow-lg shadow-primary/20' 
                      : 'border-white/10'
                  } ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-primary to-accent text-xs font-semibold">
                      Most Popular
                    </div>
                  )}

                  {isCurrentPlan && (
                    <div className="absolute -top-3 right-4 px-3 py-1 rounded-full bg-green-500 text-xs font-semibold">
                      Current
                    </div>
                  )}

                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>

                  <h3 className="text-2xl font-display font-bold mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>

                  <div className="flex items-baseline mb-6">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground ml-1">{plan.period}</span>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="w-5 h-5 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full ${
                      plan.popular 
                        ? 'bg-gradient-to-r from-primary to-accent hover:opacity-90' 
                        : ''
                    }`}
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={isCurrentPlan || processing}
                  >
                    {processing && selectedPlan === plan.id ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : isCurrentPlan ? (
                      'Current Plan'
                    ) : plan.id === 'free' ? (
                      'Free Forever'
                    ) : (
                      `Get ${plan.name}`
                    )}
                  </Button>
                </motion.div>
              );
            })}
          </div>

          {/* Additional Plans */}
          <div className="mt-16 max-w-4xl mx-auto">
            <h2 className="text-2xl font-display font-bold mb-6 text-center">Special Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Family Plan */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`glass-card rounded-2xl p-6 border border-green-500/30 ${subscription?.tier === 'family' ? 'ring-2 ring-green-500' : ''}`}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Family</h3>
                    <p className="text-muted-foreground">$29.99/month</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Share with up to 6 family members with individual profiles and parental controls.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full border-green-500/30 hover:bg-green-500/10"
                  onClick={() => handleSelectPlan('family')}
                  disabled={subscription?.tier === 'family' || processing}
                >
                  {subscription?.tier === 'family' ? 'Current Plan' : 'Get Family Plan'}
                </Button>
              </motion.div>

              {/* Creator Pro */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`glass-card rounded-2xl p-6 border border-pink-500/30 ${subscription?.tier === 'creator_pro' ? 'ring-2 ring-pink-500' : ''}`}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                    <Film className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Creator Pro</h3>
                    <p className="text-muted-foreground">$49.99/month</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Everything in VIP plus Creator Studio access, analytics, and monetization tools.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full border-pink-500/30 hover:bg-pink-500/10"
                  onClick={() => handleSelectPlan('creator_pro')}
                  disabled={subscription?.tier === 'creator_pro' || processing}
                >
                  {subscription?.tier === 'creator_pro' ? 'Current Plan' : 'Get Creator Pro'}
                </Button>
              </motion.div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-16 max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-display font-bold mb-4">Questions?</h2>
            <p className="text-muted-foreground mb-4">
              Contact our support team 24/7 for any questions about subscriptions.
            </p>
            <Button variant="link" className="text-primary">
              View FAQ →
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Subscription;
