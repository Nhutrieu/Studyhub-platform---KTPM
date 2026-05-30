
import { Order, User, Product, Branch } from '../utils/models';

export async function seedOrders() {
    console.log('📦 Seeding Orders...');

    const alice = await User.findOne({ email: 'customer1@gmail.com' });
    const bob = await User.findOne({ email: 'customer2@gmail.com' });
    const products = await Product.find({});
    const branch1 = await Branch.findOne({ code: 'B001' });
    const branch2 = await Branch.findOne({ code: 'B002' });

    if (!alice || !bob || products.length < 3 || !branch1 || !branch2) {
        console.warn('⚠️ Skipping Orders seed: Missing dependencies.');
        return;
    }

    const ordersData = [
        // Order 1: Delivered (Alice)
        {
            customerId: alice._id,
            branchId: branch1._id,
            items: [
                {
                    productId: products[0]._id,
                    productName: products[0].name,
                    quantity: 1,
                    price: products[0].price,
                    discount: 0,
                },
                {
                    productId: products[1]._id,
                    productName: products[1].name,
                    quantity: 2,
                    price: products[1].price,
                    discount: 0,
                }
            ],
            totalPrice: products[0].price * 1 + products[1].price * 2,
            status: 'DELIVERED',
            shippingAddress: `${alice.addresses[0].street}, ${alice.addresses[0].ward}, ${alice.addresses[0].district}, ${alice.addresses[0].city}`,
            phone: alice.addresses[0].phone,
            paymentMethod: 'vnpay',
            paymentStatus: 'PAID',
            isPaid: true,
            deliveredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        },
        // Order 2: Pending Confirmation (Bob)
        {
            customerId: bob._id,
            branchId: branch2._id,
            items: [
                {
                    productId: products[2]._id,
                    productName: products[2].name,
                    quantity: 1,
                    price: products[2].price,
                    discount: 0,
                }
            ],
            totalPrice: products[2].price,
            status: 'PENDING_CONFIRMATION',
            shippingAddress: `${bob.addresses[0].street}, ${bob.addresses[0].ward}, ${bob.addresses[0].district}, ${bob.addresses[0].city}`,
            phone: bob.addresses[0].phone,
            paymentMethod: 'cod',
            paymentStatus: 'UNPAID',
            isPaid: false,
            createdAt: new Date(), // Now
        },
        // Order 3: Shipping (Alice)
        {
            customerId: alice._id,
            branchId: branch1._id,
            items: [
                {
                    productId: products[3]._id,
                    productName: products[3].name,
                    quantity: 1,
                    price: products[3].price,
                    discount: 0,
                }
            ],
            totalPrice: products[3].price,
            status: 'SHIPPING',
            shippingAddress: `${alice.addresses[0].street}, ${alice.addresses[0].ward}, ${alice.addresses[0].district}, ${alice.addresses[0].city}`,
            phone: alice.addresses[0].phone,
            paymentMethod: 'vnpay',
            paymentStatus: 'PAID',
            isPaid: true,
            trackingNumber: 'TRK-' + Date.now(),
            shippedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        }
    ];

    const results = [];
    for (const o of ordersData) {
        const order = await Order.create(o);
        results.push(order);
    }
    console.log(`✅ Seeded ${results.length} orders.`);
    return results;
}
