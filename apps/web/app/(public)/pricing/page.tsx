'use client';

import { useCreateSubscription } from '../../../hooks/usePayments';
import { Button } from '../../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Check } from 'lucide-react';

const tiers = [
  {
    name: 'Community',
    price: { monthly: '$49/mo', yearly: '$490/yr' },
    features: ['Up to 1,000 members', 'All core features', 'Community support'],
    tier: 'community',
  },
  // Add other tiers like 'Pro' here
];

export default function PricingPage() {
  const createSubscription = useCreateSubscription();

  const handleSubscribe = (tier: string, interval: 'monthly' | 'yearly') => {
    createSubscription.mutate({ tier, interval });
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold text-center mb-8">Pricing Plans</h1>
      <div className="grid md:grid-cols-2 gap-8">
        {tiers.map((tier) => (
          <Card key={tier.name}>
            <CardHeader>
              <CardTitle>{tier.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{tier.price.monthly}</p>
              <ul className="my-4 space-y-2">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button onClick={() => handleSubscribe(tier.tier, 'monthly')} className="w-full">
                Choose Monthly
              </Button>
              <Button onClick={() => handleSubscribe(tier.tier, 'yearly')} variant="outline" className="w-full mt-2">
                Choose Yearly
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}