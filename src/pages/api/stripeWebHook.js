import dbConnect from '../../lib/dbConnect'
import User from '../../models/Users'
import { buffer } from "micro";

export const config = {
    api: {
      bodyParser: false,
    },
  };

export default async (req, res) => {
    if (req.method !== 'POST') return res.status(405).end();
    console.log("web hook update notification received")
    
    try {
        
        //check endpoint secret before even doing anything else 
        console.log("checking endpoint secret")
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        let event

        if (endpointSecret) {
            try {
                console.log("Checking stripe signature")
                //console.log("req: ", req)
                console.log("pre buffer ")
                const rawBody = await buffer(req)
                console.log("rawBody: ", rawBody.toString())
                const sig = req.headers['stripe-signature'];
                console.log("sig: ", sig)
                event = stripe.webhooks.constructEvent(
                    rawBody.toString(),
                    sig,
                    endpointSecret
                );
            } catch (err) {
                console.log(`⚠️  Webhook signature verification failed.`, err.message);
                return res.status(400).send(`Webhook Error: ${err.message}`);
            }
        }

        console.log("Endpoint chack completed")

        switch (event.type) {
            case 'checkout.session.completed':
                
            if (session.mode === "payment" && session.amount_total === 6999) {
                // Handle lifetime payment
                console.log("Handling lifetime payment");
                await handleLifetimePayment(session);
            } else if (session.mode === "subscription") {
                // Since no trial for annual, check amount to categorize
                console.log("Handling subscription payment");
                await handleSubscription(session);
            } else {
                console.log("Payment type not recognized.");
            }
            res.status(200).send({ received: true });
            break;
        default:
            console.log(`Unhandled event type ${event.type}.`);
            res.status(400).send(`Unhandled event type ${event.type}.`);
        }        
    } catch (error) {
        console.error(error);
        res.status(error.status || 500).send(error.message);
    }
}

async function handleLifetimePayment(session) {
    const email = session.customer_details.email || session.customer_email;
    const name = session.customer_details.name;
    const amount = session.amount_total;
    await updateUser(email, name, amount, true, 'lifetime');
}

async function handleSubscription(session) {
    const email = session.customer_details.email || session.customer_email;
    // Distinguish between annual and monthly subscriptions based on amount_total
    let subscriptionType = 'monthly'; // Default to monthly
    let today = new Date();
    today.setDate(today.getDate() + 7); // This correctly modifies the 'today' object to represent 7 days from now
    let nextPaymentDate = today;
    if (session.amount_total === 9999) {
        subscriptionType = 'annual';
        today.setMonth(today.getMonth() + 15);
        nextPaymentDate = today;
    }
    await updateUser(email, null, null, false, subscriptionType, nextPaymentDate);
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
        user = await User.create({
            name: name,
            email: email,
            lifetimeMember: lifetimeMember,
            subscriptionType: subscriptionType,
            netPay: amount,
            nextPaymentDate: nextPaymentDate,
            token: 777.777,
            confirmedAt: new Date(),
        });
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
            nextPaymentDate: nextPaymentDate,
            netPay: newNetPay,
            token: 777.777,
            confirmedAt: new Date()
        });
    }
}