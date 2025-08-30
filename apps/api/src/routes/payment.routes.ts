import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { customerService, subscriptionService, paymentService, webhookService, paymentMethodService } from '@sk-clone/payment';
import express from 'express';

const router = Router();

// Webhook endpoint
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  try {
    await webhookService.handleWebhook(req.body, sig);
    res.json({ received: true });
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

router.use(authenticate);

// Checkout
router.post('/checkout', async (req: Request, res: Response) => {
  try {
    const { type, tier, interval, courseId, amount } = req.body;

    if (type === 'subscription' && (!tier || !interval)) {
      return res.status(400).json({
        success: false,
        error: 'Tier and interval are required for subscriptions'
      });
    }

    if (type === 'payment' && (!courseId || !amount)) {
      return res.status(400).json({
        success: false,
        error: 'Course ID and amount are required for one-time payments'
      });
    }

    if (type === 'subscription') {
      const subscription = await subscriptionService.createSubscription(
        req.user.id,
        req.user.email,
        tier,
        interval
      );
      res.json({
        success: true,
        data: { sessionUrl: subscription.url }
      });
    } else if (type === 'payment') {
      const paymentIntent = await paymentService.createPaymentIntent(
        req.user.id,
        req.user.email,
        Math.round(amount * 100), // Convert to cents
        `Course purchase: ${courseId}`,
        courseId
      );

      res.json({
        success: true,
        data: { clientSecret: paymentIntent.client_secret }
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid checkout type'
      });
    }
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create checkout session'
    });
  }
});

// Subscriptions
router.get('/subscription', async (req: Request, res: Response) => {
  try {
    const subscription = await subscriptionService.getUserSubscription(req.user.id);
    res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subscription'
    });
  }
});

router.post('/subscription', async (req: Request, res: Response) => {
  try {
    const { tier, interval } = req.body;
    const subscription = await subscriptionService.createSubscription(req.user.id, req.user.email, tier, interval);
    res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create subscription'
    });
  }
});

router.delete('/subscription/:id', async (req: Request, res: Response) => {
  try {
    await subscriptionService.cancelSubscription(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription'
    });
  }
});

// Customer Portal
router.post('/portal', async (req: Request, res: Response) => {
  try {
    const { returnUrl } = req.body;
    const url = await customerService.createPortalSession(req.user.id, returnUrl);
    res.json({
      success: true,
      data: { url }
    });
  } catch (error) {
    console.error('Portal session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create portal session'
    });
  }
});

// Payment Methods
router.get('/payment-methods', async (req: Request, res: Response) => {
  try {
    const paymentMethods = await paymentMethodService.listPaymentMethods(req.user.id);
    res.json({
      success: true,
      data: paymentMethods
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment methods'
    });
  }
});

router.post('/payment-methods', async (req: Request, res: Response) => {
  try {
    const { paymentMethodId, setAsDefault = false } = req.body;
    const paymentMethod = await paymentMethodService.addPaymentMethod(req.user.id, paymentMethodId, setAsDefault);
    res.json({
      success: true,
      data: paymentMethod
    });
  } catch (error) {
    console.error('Add payment method error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add payment method'
    });
  }
});

router.delete('/payment-methods/:id', async (req: Request, res: Response) => {
  try {
    await paymentMethodService.removePaymentMethod(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Remove payment method error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove payment method'
    });
  }
});

// Payment History
router.get('/payments', async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    const payments = await paymentService.getPaymentHistory(req.user.id, Number(limit));
    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment history'
    });
  }
});


export default router;