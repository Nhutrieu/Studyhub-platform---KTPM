
import { Branch } from '../utils/models';

export const branchesData = [
    {
        code: 'B001', // Keep for backward compatibility in other seeds
        name: 'FurniMart Central (District 1)',
        description: 'Flagship showroom in the heart of HCMC.',
        address: {
            street: '123 Nguyen Hue',
            ward: 'Ben Nghe',
            district: 'District 1',
            city: 'Ho Chi Minh City',
            coordinates: { lat: 10.7769, lng: 106.7009 },
        },
        phone: '02811112222',
        email: 'hcm_center@furnimart.com',
        status: 'active',
        isActive: true,
        totalOrders: 0,
        totalRevenue: 0,
    },
    {
        code: 'B002', // Keep for backward compatibility in other seeds
        name: 'FurniMart Riverside (District 7)',
        description: 'Spacious showroom with full inventory.',
        address: {
            street: '456 Nguyen Thi Thap',
            ward: 'Tan Phong',
            district: 'District 7',
            city: 'Ho Chi Minh City',
            coordinates: { lat: 10.7324, lng: 106.7214 },
        },
        phone: '02833334444',
        email: 'hcm_d7@furnimart.com',
        status: 'active',
        isActive: true,
        totalOrders: 0,
        totalRevenue: 0,
    },
];

export async function seedBranches() {
    console.log('🏢 Seeding Branches...');
    const results = [];
    for (const branch of branchesData) {
        const b = await Branch.findOneAndUpdate(
            { name: branch.name }, // Use name as unique identifier
            branch,
            { upsert: true, new: true }
        );
        // Store code in memory for other seeds to use
        (b as any).code = branch.code;
        results.push(b);
    }
    console.log(`✅ Seeded ${results.length} branches.`);
    return results;
}
