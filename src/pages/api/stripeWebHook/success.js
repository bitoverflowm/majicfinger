import dbConnect from '@/lib/dbConnect'
import User from '@/models/Users'
import { buffer } from "micro";

export const config = {
    api: {
      bodyParser: false,
    },
  };

export default async (req, res) => {
    if (req.method !== 'POST') return res.status(405).end();
    console.log("web hook update notification received")
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    let event
    const rawBody = await buffer(req)
    const sig = String(req.headers.get('stripe-signature'));
    try{
        event = stripe.webhooks.constructEvent(rawBody.toString(), sig, endpointSecret);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log("Endpoint check completed")

    const data = event.data.objects

    switch(event.type){
        case "checkout.session.completed":
            await handleLifetimePayment(data);
        case "charge.succeeded":
            await handleSubscription(data)
        case "checkout.session.async_payment_succeeded":
            await handleLifetimePayment(data)
        default:
            console.log(`Unhandled event type ${event.type}.`);
            res.status(400).send(`Unhandled event type ${event.type}.`);
    }

    res.status(200).send({ received: true });
}

async function handleLifetimePayment(data) {
    const email = data.customer_details.email;
    const name = data.customer_details.name;
    const amount = data.amount_total;
    if(amount !== 9999 ){
        return
    }else if(amount === 100){
        await updateUser(email, name, amount, true, 'testtime');
    }
    await updateUser(email, name, amount, true, 'lifetime');
}

async function handleSubscription(data) {
    const email = data.billing_details.email;
    // Distinguish between annual and monthly subscriptions based on amount_total
    let subscriptionType
    if(data.amount === 999){
        subscriptionType = data.amount === 999 && 'monthly'
    }else if(data.amount === 8999){
        subscriptionType = data.amount === 8999 && 'annual'
    }else{
        subscriptionType = 'somethingElse'
    }
    await updateUser(email, data.billing_details.name, data.amount, false, subscriptionType);
}

/*async function updateUserSubscription(email, name, amount) {
    await dbConnect()

    let user = await User.findOne({ email: email })
    console.log("user search: ", user)
    if (!user) {
        user = await User.create({
                name: name,
                email: email,
                amount: amount,
                lifetimeMember: true,
                token: 777.777,
                confirmedAt: new Date(),
            });
    } else {
        // User found in the database            
        await User.findByIdAndUpdate(user._id, { name: name, paymentTotal: amount, lifetimeMember: true, token: 777.777, confirmedAt: new Date()});
    }
}*/

async function updateUser(email, name, amount, lifetimeMember, subscriptionType, nextPaymentDate) {
    await dbConnect();

    let user = await User.findOne({ email: email });
    console.log("user search: ", user)
    if (!user) {
        console.log("creating a new user")
        let newUser = await User.create({
            name: name,
            email: email,
            lifetimeMember: lifetimeMember,
            subscriptionType: subscriptionType,
            netPay: amount,
            token: 100.000,
            confirmedAt: new Date(),
        });
        console.log('user created: ', newUser)
    } else {
        // Update user with new details, assuming amount only updates for lifetime payments
        let newNetPay
        if(user.netPay && user.netPay > 0){
            newNetPay = Number(user.netPay) + Number(amount);
        } else {
            newNetPay = amount;
        }
        await User.findByIdAndUpdate(user._id, { 
            name: name || user.name,
            lifetimeMember: lifetimeMember,
            subscriptionType: subscriptionType,
            netPay: newNetPay,
            token: 100.000,
            confirmedAt: new Date()
        });
    }
}