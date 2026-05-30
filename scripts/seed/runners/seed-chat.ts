
import { Chat, User } from '../utils/models';

export async function seedChat() {
    console.log('💬 Seeding Chat...');

    const alice = await User.findOne({ email: 'customer1@gmail.com' });
    const staff = await User.findOne({ email: 'staff_d1@furnimart.com' });

    if (!alice || !staff) {
        console.warn('⚠️ Skipping Chat seed: Missing users.');
        return;
    }

    const chatSession = {
        customerId: alice._id,
        customerName: alice.name,
        employeeId: staff._id,
        status: 'open',
        subject: 'Order inquiry',
        lastMessageAt: new Date(),
        isReadByEmployee: false,
        isReadByCustomer: true,
        messages: [
            {
                senderId: alice._id,
                senderName: alice.name,
                senderRole: 'customer',
                message: 'Hi, when will my order arrive?',
                images: [],
                isRead: true,
                sentAt: new Date(Date.now() - 3600000),
            },
            {
                senderId: staff._id,
                senderName: staff.name,
                senderRole: 'employee',
                message: 'Hello! Let me check that for you.',
                images: [],
                isRead: false,
                sentAt: new Date(),
            }
        ]
    };

    // Check if chat already exists
    const exists = await Chat.findOne({ customerId: alice._id, status: 'open' });

    if (!exists) {
        await Chat.create(chatSession);
        console.log('✅ Created 1 chat session.');
    } else {
        console.log('ℹ️ Chat session already exists.');
    }
}
