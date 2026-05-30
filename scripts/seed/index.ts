
import { connectDB, disconnectDB } from './utils/db';
import { SeedMeta } from './utils/models';
import { seedBranches } from './runners/seed-branches';
import { seedUsers } from './runners/seed-users';
import { seedCategories } from './runners/seed-categories';
import { seedProducts } from './runners/seed-products';
import { seedInventory } from './runners/seed-inventory';
import { seedCarts } from './runners/seed-carts';
import { seedOrders } from './runners/seed-orders';
import { seedPayments } from './runners/seed-payments';
import { seedWallets } from './runners/seed-wallet';
import { seedReviews } from './runners/seed-reviews';
import { seedPromotions } from './runners/seed-promotions';
import { seedChat } from './runners/seed-chat';
import { seedDisputes } from './runners/seed-disputes';

async function main() {
    console.log('🚀 Starting FurniMart Production Seed...');

    await connectDB();

    try {
        // 1. Core Data
        await seedBranches();
        await seedUsers();
        await seedCategories();

        // 2. Catalog & Inventory
        await seedProducts();
        await seedInventory();

        // 3. Sales & Transactions
        await seedCarts();
        await seedWallets();
        await seedOrders();
        await seedPayments();

        // 4. Marketing & Support
        await seedPromotions();
        await seedReviews();
        await seedChat();
        await seedDisputes();

        // 5. Update Meta
        await SeedMeta.findOneAndUpdate(
            { id: 'meta' },
            {
                lastSeedDate: new Date(),
                seededModules: [
                    'branches', 'users', 'categories', 'products', 'inventory',
                    'carts', 'wallets', 'orders', 'payments',
                    'promotions', 'reviews', 'chat', 'disputes'
                ]
            },
            { upsert: true }
        );

        console.log('✅ SEED COMPLETED SUCCESSFULLY!');
    } catch (error) {
        console.error('❌ Seed Failed:', error);
        process.exit(1);
    } finally {
        await disconnectDB();
    }
}

main();
