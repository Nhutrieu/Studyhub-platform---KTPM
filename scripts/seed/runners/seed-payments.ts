
import { Payment, Order, User } from '../utils/models';

export async function seedPayments() {
    console.log('💳 Seeding Payments...');

    const orders = await Order.find({ paymentStatus: 'PAID' });
    const alice = await User.findOne({ email: 'customer1@gmail.com' });

    if (orders.length === 0 || !alice) {
        console.warn('⚠️ Skipping Payments seed: Missing paid orders or user.');
        return;
    }

    const results = [];
    for (const order of orders) {
        // Payment for paid orders
        const paymentData = {
            orderId: order._id.toString(),
            customerId: order.customerId.toString(),
            amount: order.totalPrice,
            method: 'vnpay',
            status: 'paid',
            transactionId: 'VNPAY_' + order._id.toString().slice(-8),
            completedAt: order.createdAt,
        };

        const payment = await Payment.findOneAndUpdate(
            { orderId: order._id },
            paymentData,
            { upsert: true, new: true }
        );
        results.push(payment);
    }

    console.log(`✅ Seeded ${results.length} payments.`);
    return results;
}
