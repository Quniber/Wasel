import { PrismaClient, OperatorRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ==================== DOCUMENT TYPES ====================
  console.log('📄 Seeding document types...');
  const documentTypes = await Promise.all([
    prisma.documentType.upsert({
      where: { id: 1 },
      update: {},
      create: { name: "Driver's License", description: 'Valid driver license', isRequired: true, hasExpiry: true, sortOrder: 1 },
    }),
    prisma.documentType.upsert({
      where: { id: 2 },
      update: {},
      create: { name: 'Vehicle Registration', description: 'Vehicle registration document', isRequired: true, hasExpiry: true, sortOrder: 2 },
    }),
    prisma.documentType.upsert({
      where: { id: 3 },
      update: {},
      create: { name: 'Insurance Certificate', description: 'Valid vehicle insurance', isRequired: true, hasExpiry: true, sortOrder: 3 },
    }),
    prisma.documentType.upsert({
      where: { id: 4 },
      update: {},
      create: { name: 'Profile Photo', description: 'Clear face photo', isRequired: true, hasExpiry: false, sortOrder: 4 },
    }),
    prisma.documentType.upsert({
      where: { id: 5 },
      update: {},
      create: { name: 'Vehicle Photo (Front)', description: 'Front view of vehicle', isRequired: true, hasExpiry: false, sortOrder: 5 },
    }),
    prisma.documentType.upsert({
      where: { id: 6 },
      update: {},
      create: { name: 'Vehicle Photo (Back)', description: 'Back view of vehicle', isRequired: false, hasExpiry: false, sortOrder: 6 },
    }),
  ]);
  console.log(`✅ Created ${documentTypes.length} document types`);

  // ==================== CAR MODELS ====================
  console.log('🚗 Seeding car models...');
  const carModels = await Promise.all([
    prisma.carModel.upsert({ where: { id: 1 }, update: {}, create: { brand: 'Toyota', model: 'Camry' } }),
    prisma.carModel.upsert({ where: { id: 2 }, update: {}, create: { brand: 'Toyota', model: 'Corolla' } }),
    prisma.carModel.upsert({ where: { id: 3 }, update: {}, create: { brand: 'Honda', model: 'Accord' } }),
    prisma.carModel.upsert({ where: { id: 4 }, update: {}, create: { brand: 'Honda', model: 'Civic' } }),
    prisma.carModel.upsert({ where: { id: 5 }, update: {}, create: { brand: 'Nissan', model: 'Altima' } }),
    prisma.carModel.upsert({ where: { id: 6 }, update: {}, create: { brand: 'Hyundai', model: 'Sonata' } }),
    prisma.carModel.upsert({ where: { id: 7 }, update: {}, create: { brand: 'Kia', model: 'Optima' } }),
    prisma.carModel.upsert({ where: { id: 8 }, update: {}, create: { brand: 'BMW', model: '3 Series' } }),
    prisma.carModel.upsert({ where: { id: 9 }, update: {}, create: { brand: 'Mercedes', model: 'C-Class' } }),
    prisma.carModel.upsert({ where: { id: 10 }, update: {}, create: { brand: 'Lexus', model: 'ES' } }),
  ]);
  console.log(`✅ Created ${carModels.length} car models`);

  // ==================== CAR COLORS ====================
  console.log('🎨 Seeding car colors...');
  const carColors = await Promise.all([
    prisma.carColor.upsert({ where: { id: 1 }, update: {}, create: { name: 'Black', hexCode: '#000000' } }),
    prisma.carColor.upsert({ where: { id: 2 }, update: {}, create: { name: 'White', hexCode: '#FFFFFF' } }),
    prisma.carColor.upsert({ where: { id: 3 }, update: {}, create: { name: 'Silver', hexCode: '#C0C0C0' } }),
    prisma.carColor.upsert({ where: { id: 4 }, update: {}, create: { name: 'Gray', hexCode: '#808080' } }),
    prisma.carColor.upsert({ where: { id: 5 }, update: {}, create: { name: 'Red', hexCode: '#FF0000' } }),
    prisma.carColor.upsert({ where: { id: 6 }, update: {}, create: { name: 'Blue', hexCode: '#0000FF' } }),
    prisma.carColor.upsert({ where: { id: 7 }, update: {}, create: { name: 'Green', hexCode: '#008000' } }),
    prisma.carColor.upsert({ where: { id: 8 }, update: {}, create: { name: 'Brown', hexCode: '#8B4513' } }),
    prisma.carColor.upsert({ where: { id: 9 }, update: {}, create: { name: 'Beige', hexCode: '#F5F5DC' } }),
    prisma.carColor.upsert({ where: { id: 10 }, update: {}, create: { name: 'Gold', hexCode: '#FFD700' } }),
  ]);
  console.log(`✅ Created ${carColors.length} car colors`);

  // ==================== CANCEL REASONS (CUSTOMER) ====================
  console.log('❌ Seeding cancel reasons...');
  const cancelReasons = await Promise.all([
    // Customer reasons
    prisma.orderCancelReason.upsert({ where: { id: 1 }, update: {}, create: { title: 'Changed my mind', isForRider: true, isForDriver: false } }),
    prisma.orderCancelReason.upsert({ where: { id: 2 }, update: {}, create: { title: 'Driver is taking too long', isForRider: true, isForDriver: false } }),
    prisma.orderCancelReason.upsert({ where: { id: 3 }, update: {}, create: { title: 'Found another ride', isForRider: true, isForDriver: false } }),
    prisma.orderCancelReason.upsert({ where: { id: 4 }, update: {}, create: { title: 'Emergency situation', isForRider: true, isForDriver: false } }),
    prisma.orderCancelReason.upsert({ where: { id: 5 }, update: {}, create: { title: 'Wrong pickup location', isForRider: true, isForDriver: false } }),
    prisma.orderCancelReason.upsert({ where: { id: 6 }, update: {}, create: { title: 'Other', isForRider: true, isForDriver: false } }),
    // Driver reasons
    prisma.orderCancelReason.upsert({ where: { id: 7 }, update: {}, create: { title: 'Customer not at pickup location', isForRider: false, isForDriver: true } }),
    prisma.orderCancelReason.upsert({ where: { id: 8 }, update: {}, create: { title: 'Customer requested cancellation', isForRider: false, isForDriver: true } }),
    prisma.orderCancelReason.upsert({ where: { id: 9 }, update: {}, create: { title: 'Vehicle issue', isForRider: false, isForDriver: true } }),
    prisma.orderCancelReason.upsert({ where: { id: 10 }, update: {}, create: { title: 'Emergency', isForRider: false, isForDriver: true } }),
    prisma.orderCancelReason.upsert({ where: { id: 11 }, update: {}, create: { title: 'Wrong address provided', isForRider: false, isForDriver: true } }),
    prisma.orderCancelReason.upsert({ where: { id: 12 }, update: {}, create: { title: 'Other', isForRider: false, isForDriver: true } }),
  ]);
  console.log(`✅ Created ${cancelReasons.length} cancel reasons`);

  // ==================== SERVICE CATEGORY ====================
  console.log('📁 Seeding service categories...');
  const category = await prisma.serviceCategory.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Taxi', description: 'Standard taxi services', sortOrder: 1 },
  });
  console.log(`✅ Created service category: ${category.name}`);

  // ==================== SERVICES ====================
  console.log('🚕 Seeding services...');
  const services = await Promise.all([
    prisma.service.upsert({
      where: { id: 1 },
      update: {},
      create: {
        categoryId: 1,
        name: 'Economy',
        description: 'Affordable rides for everyday trips',
        personCapacity: 4,
        baseFare: 3.00,
        perHundredMeters: 0.15, // $1.5 per km = $0.15 per 100m
        perMinuteDrive: 0.30,
        perMinuteWait: 0.20,
        minimumFare: 5.00,
        cancellationFee: 3.00,
        cancellationDriverShare: 2.00,
        providerSharePercent: 20,
        searchRadius: 10000,
        displayPriority: 1,
      },
    }),
    prisma.service.upsert({
      where: { id: 2 },
      update: {},
      create: {
        categoryId: 1,
        name: 'Premium',
        description: 'Comfortable rides with premium vehicles',
        personCapacity: 4,
        baseFare: 5.00,
        perHundredMeters: 0.25, // $2.5 per km
        perMinuteDrive: 0.50,
        perMinuteWait: 0.30,
        minimumFare: 8.00,
        cancellationFee: 5.00,
        cancellationDriverShare: 3.00,
        providerSharePercent: 20,
        searchRadius: 10000,
        displayPriority: 2,
      },
    }),
    prisma.service.upsert({
      where: { id: 3 },
      update: {},
      create: {
        categoryId: 1,
        name: 'XL',
        description: 'Spacious vehicles for larger groups',
        personCapacity: 6,
        baseFare: 7.00,
        perHundredMeters: 0.30, // $3 per km
        perMinuteDrive: 0.60,
        perMinuteWait: 0.40,
        minimumFare: 10.00,
        cancellationFee: 5.00,
        cancellationDriverShare: 3.00,
        providerSharePercent: 20,
        searchRadius: 15000,
        displayPriority: 3,
      },
    }),
  ]);
  console.log(`✅ Created ${services.length} services`);

  // ==================== SETTINGS ====================
  console.log('⚙️ Seeding settings...');
  const settings = await Promise.all([
    prisma.setting.upsert({ where: { key: 'currency' }, update: {}, create: { key: 'currency', value: 'USD', description: 'Default currency' } }),
    prisma.setting.upsert({ where: { key: 'currency_symbol' }, update: {}, create: { key: 'currency_symbol', value: '$', description: 'Currency symbol' } }),
    prisma.setting.upsert({ where: { key: 'commission_percent' }, update: {}, create: { key: 'commission_percent', value: '20', description: 'Platform commission percentage' } }),
    prisma.setting.upsert({ where: { key: 'driver_accept_timeout' }, update: {}, create: { key: 'driver_accept_timeout', value: '15', description: 'Seconds for driver to accept order' } }),
    prisma.setting.upsert({ where: { key: 'free_cancellation_minutes' }, update: {}, create: { key: 'free_cancellation_minutes', value: '2', description: 'Minutes for free cancellation' } }),
    prisma.setting.upsert({ where: { key: 'default_cancellation_fee' }, update: {}, create: { key: 'default_cancellation_fee', value: '3', description: 'Default cancellation fee in currency' } }),
    prisma.setting.upsert({ where: { key: 'timezone' }, update: {}, create: { key: 'timezone', value: 'America/New_York', description: 'Default timezone' } }),
    prisma.setting.upsert({ where: { key: 'app_name' }, update: {}, create: { key: 'app_name', value: 'Taxi Platform', description: 'Application name' } }),
    prisma.setting.upsert({ where: { key: 'support_email' }, update: {}, create: { key: 'support_email', value: 'support@taxi.com', description: 'Support email address' } }),
    prisma.setting.upsert({ where: { key: 'support_phone' }, update: {}, create: { key: 'support_phone', value: '+1-800-TAXI', description: 'Support phone number' } }),
  ]);
  console.log(`✅ Created ${settings.length} settings`);

  // ==================== REVIEW PARAMETERS ====================
  console.log('⭐ Seeding review parameters...');
  const reviewParams = await Promise.all([
    prisma.reviewParameter.upsert({ where: { id: 1 }, update: {}, create: { title: 'Professional driver', isGood: true } }),
    prisma.reviewParameter.upsert({ where: { id: 2 }, update: {}, create: { title: 'Clean vehicle', isGood: true } }),
    prisma.reviewParameter.upsert({ where: { id: 3 }, update: {}, create: { title: 'Great route', isGood: true } }),
    prisma.reviewParameter.upsert({ where: { id: 4 }, update: {}, create: { title: 'Smooth ride', isGood: true } }),
    prisma.reviewParameter.upsert({ where: { id: 5 }, update: {}, create: { title: 'Unprofessional behavior', isGood: false } }),
    prisma.reviewParameter.upsert({ where: { id: 6 }, update: {}, create: { title: 'Dirty vehicle', isGood: false } }),
    prisma.reviewParameter.upsert({ where: { id: 7 }, update: {}, create: { title: 'Bad route', isGood: false } }),
    prisma.reviewParameter.upsert({ where: { id: 8 }, update: {}, create: { title: 'Reckless driving', isGood: false } }),
  ]);
  console.log(`✅ Created ${reviewParams.length} review parameters`);

  // ==================== SUPER ADMIN ====================
  console.log('👤 Seeding super admin...');
  const hashedPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.operator.upsert({
    where: { email: 'admin@taxi.com' },
    update: {},
    create: {
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@taxi.com',
      password: hashedPassword,
      role: OperatorRole.admin,
      isActive: true,
    },
  });
  console.log(`✅ Created super admin: ${admin.email}`);

  // ==================== FAKE PAYMENT GATEWAY ====================
  console.log('💳 Seeding fake payment gateway...');
  const paymentGateway = await prisma.paymentGateway.upsert({
    where: { id: 1 },
    update: {},
    create: {
      type: 'cash',
      title: 'Cash Payment',
      description: 'Pay with cash to the driver',
      privateKey: 'not_required',
      isEnabled: true,
    },
  });
  console.log(`✅ Created payment gateway: ${paymentGateway.title}`);

  console.log('');
  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   - Document Types: 6`);
  console.log(`   - Car Models: 10`);
  console.log(`   - Car Colors: 10`);
  console.log(`   - Cancel Reasons: 12`);
  console.log(`   - Services: 3 (Economy, Premium, XL)`);
  console.log(`   - Settings: 10`);
  console.log(`   - Review Parameters: 8`);
  console.log(`   - Super Admin: admin@taxi.com / Admin123!`);
  console.log(`   - Payment Gateway: Cash`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
