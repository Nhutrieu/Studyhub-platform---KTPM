
import { Wallet, User } from '../utils/models';

export async function seedWallets() {
    console.log('💰 Seeding Wallets...');

    const users = await User.find({ role: 'customer' });
    const results = [];

    for (const user of users) {
        const walletData = {
            userId: user._id.toString(),
            balance: 5000000, // 5 million VND default balance
            lockedBalance: 0,
            totalDeposited: 5000000,
            totalWithdrawn: 0,
            isActive: true,
        };

        const wallet = await Wallet.findOneAndUpdate(
            { userId: user._id.toString() },
            walletData,
            { upsert: true, new: true }
        );
        results.push(wallet);
    }

    console.log(`✅ Seeded ${results.length} wallets for customers.`);
    return results;
}
