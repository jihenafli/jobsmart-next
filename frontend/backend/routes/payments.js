const router = require('express').Router();
const auth   = require('../controllers/authMiddleware');
const User   = require('../models/User');

// Plans disponibles
const PLANS = {
  basic_month:   { price: 1000, limit: 10,     period: 'month', name: 'Basic Mensuel',   months: 1  },
  basic_year:    { price: 9600, limit: 10,     period: 'year',  name: 'Basic Annuel',    months: 12 },
  pro_month:     { price: 2500, limit: 50,     period: 'month', name: 'Pro Mensuel',     months: 1  },
  pro_year:      { price: 24000,limit: 50,     period: 'year',  name: 'Pro Annuel',      months: 12 },
  premium_month: { price: 5000, limit: 999999, period: 'month', name: 'Premium Mensuel', months: 1  },
  premium_year:  { price: 48000,limit: 999999, period: 'year',  name: 'Premium Annuel',  months: 12 },
};

// Info plans pour le frontend
router.get('/plans', (req, res) => {
  res.json([
    {
      key: 'basic', name: 'Basic', limit: '10 candidatures',
      monthly: 10, yearly: 8,
      features: ['10 candidatures/mois','Analyse CV IA','Matching offres','Lettres IA'],
    },
    {
      key: 'pro', name: 'Pro', limit: '50 candidatures', popular: true,
      monthly: 25, yearly: 20,
      features: ['50 candidatures/mois','Tout du Basic','Multi-pays','Email auto'],
    },
    {
      key: 'premium', name: 'Premium', limit: 'Illimité',
      monthly: 50, yearly: 40,
      features: ['Illimité','Tout du Pro','Support dédié','Analytics'],
    },
  ]);
});

// Créer session de paiement Stripe
router.post('/create-checkout', auth, async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) return res.status(400).json({ error: 'Stripe non configuré' });
    const stripe   = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const { planKey } = req.body; // ex: "pro_month" ou "pro_year"
    const plan = PLANS[planKey];
    if (!plan) return res.status(400).json({ error: 'Plan invalide' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: plan.period === 'month' ? 'subscription' : 'payment',
      customer_email: req.user.email,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: `JobSmart AI — ${plan.name}`, description: `${plan.limit} candidatures` },
          unit_amount: plan.price,
          ...(plan.period === 'month' ? { recurring: { interval: 'month' } } : {}),
        },
        quantity: 1,
      }],
      success_url: `${process.env.FRONTEND_URL}/dashboard?payment=success&plan=${planKey}`,
      cancel_url:  `${process.env.FRONTEND_URL}/pricing`,
      metadata: { userId: req.user._id.toString(), planKey },
    });

    res.json({ url: session.url });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Webhook Stripe
router.post('/webhook', require('express').raw({ type: 'application/json' }), async (req, res) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const event  = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === 'checkout.session.completed') {
      const { userId, planKey } = event.data.object.metadata;
      const plan = PLANS[planKey];
      if (plan) {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + plan.months);
        await User.findByIdAndUpdate(userId, {
          plan: planKey.split('_')[0],
          applicationsLimit: plan.limit,
          applicationsUsed: 0,
          planExpiresAt: expiresAt,
        });
        console.log(`✅ Plan ${planKey} activé pour ${userId}`);
      }
    }
    res.json({ received: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;
