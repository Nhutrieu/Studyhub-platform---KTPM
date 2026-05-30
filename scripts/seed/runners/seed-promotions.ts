
import { Promotion } from '../utils/models';

export async function seedPromotions() {
    console.log('🏷️ Seeding Promotions...');

    const now = new Date();
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const promotions = [
        {
            code: 'WELCOME2024',
            name: 'Welcome New User',
            description: 'Get 10% off on your first order',
            type: 'percentage',
            value: 10,
            minPurchaseAmount: 500000,
            maxDiscountAmount: 100000,
            usageLimit: 1000,
            usageCount: 0,
            isActive: true,
            isCodeRequired: true,
            startDate: now,
            endDate: nextMonth,
            applicableProducts: [],
            applicableCategories: [],
            usedBy: [],
        },
        {
            code: 'SUMMER_SALE',
            name: 'Summer Sale',
            description: 'Fixed discount 50,000 VND for orders over 1,000,000 VND',
            type: 'fixed',
            value: 50000,
            minPurchaseAmount: 1000000,
            usageLimit: 500,
            usageCount: 0,
            isActive: true,
            isCodeRequired: true,
            startDate: now,
            endDate: nextMonth,
            applicableProducts: [],
            applicableCategories: [],
            usedBy: [],
        },
        {
            name: 'Free Shipping',
            description: 'Free shipping for all orders',
            type: 'free_shipping',
            value: 0,
            minPurchaseAmount: 0,
            isActive: true,
            isCodeRequired: false,
            startDate: now,
            endDate: nextMonth,
            applicableProducts: [],
            applicableCategories: [],
            usedBy: [],
        }
    ];

    const results = [];
    for (const promo of promotions) {
        const p = await Promotion.findOneAndUpdate(
            { code: promo.code || promo.name },
            promo,
            { upsert: true, new: true }
        );
        results.push(p);
    }

    console.log(`✅ Seeded ${results.length} promotions.`);
    return results;
}
