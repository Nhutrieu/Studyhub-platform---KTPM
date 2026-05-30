
import { Cart, User, Product, Branch } from '../utils/models';

export async function seedCarts() {
    console.log('🛒 Seeding Carts...');

    const alice = await User.findOne({ email: 'customer1@gmail.com' });
    const bob = await User.findOne({ email: 'customer2@gmail.com' });
    const products = await Product.find({}).limit(3);
    const branch = await Branch.findOne({ code: 'B001' });

    if (!alice || !bob || products.length === 0 || !branch) {
        console.warn('⚠️ Skipping Carts seed: Missing dependencies.');
        return;
    }

    const cartsData = [
        {
            userId: alice._id,
            items: [
                {
                    productId: products[0]._id,
                    branchId: branch._id,
                    quantity: 2,
                    price: products[0].price,
                    productName: products[0].name,
                },
                {
                    productId: products[1]._id,
                    branchId: branch._id,
                    quantity: 1,
                    price: products[1].price,
                    productName: products[1].name,
                }
            ]
        },
        {
            userId: bob._id,
            items: [
                {
                    productId: products[2]._id,
                    branchId: branch._id,
                    quantity: 1,
                    price: products[2].price,
                    productName: products[2].name,
                }
            ]
        }
    ];

    const results = [];
    for (const cart of cartsData) {
        const c = await Cart.findOneAndUpdate(
            { userId: cart.userId },
            cart,
            { upsert: true, new: true }
        );
        results.push(c);
    }

    console.log(`✅ Seeded ${results.length} carts.`);
    return results;
}
