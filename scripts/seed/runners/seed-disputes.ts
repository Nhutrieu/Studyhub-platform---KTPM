
import { Dispute, Order, User } from '../utils/models';

export async function seedDisputes() {
    console.log('⚖️ Seeding Disputes...');

    // Use delivered orders for disputes
    const orders = await Order.find({ status: 'DELIVERED' });
    const alice = await User.findOne({ email: 'customer1@gmail.com' });

    if (orders.length === 0 || !alice) {
        console.warn('⚠️ Skipping Dispute seed: Missing delivered orders or user.');
        return;
    }

    const order = orders[0];

    const disputeData = {
        orderId: order._id,
        customerId: order.customerId,
        customerName: alice.name,
        branchId: order.branchId,
        type: 'damage',
        reason: 'Product received damaged',
        description: 'The product arrived with scratches and dents. I would like a replacement or refund.',
        images: [],
        status: 'OPEN',
        refundAmount: 0,
    };

    const dispute = await Dispute.findOneAndUpdate(
        { orderId: order._id },
        disputeData,
        { upsert: true, new: true }
    );

    console.log('✅ Seeded 1 dispute.');
    return [dispute];
}
