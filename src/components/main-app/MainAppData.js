export const INITIAL_ORDERS = [
  {
    orderId: 'PSK-89241',
    status: 'active', // 'active' | 'completed' | 'cancelled'
    serviceName: 'Wash & Crisp Steam Iron',
    serviceCategory: 'wash-iron',
    laundromatName: 'Poshak Care Facility',
    laundromatArea: 'Direct Doorstep Hub',
    itemsCount: 8,
    weightKg: 3.2,
    totalAmount: 268,
    paymentMethod: 'Pay on Delivery (UPI/Cash)',
    paymentStatus: 'Pending Delivery',
    pickupSlot: 'Today, 02:00 PM - 03:00 PM',
    deliveryEstimate: 'Today, 08:15 PM (6h Blitz)',
    placedAt: 'Today, 01:45 PM',
    currentStep: 3, // 0 to 5
    pickupOtp: '4892',
    deliveryOtp: '7153',
    rider: {
      name: 'Vikram Singh',
      phone: '+91 98765 43210',
      vehicle: 'Poshak EV-12 (KA-01-EQ-9812)',
      rating: '4.9 ★',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
    },
    pickupAddress: 'Flat 304, Palm Grove Apts, 12th Main Rd, HAL 2nd Stage, Indiranagar, Bengaluru - 560038',
    specialInstructions: 'Starch shirts lightly. Keep whites strictly separate in soft RO wash.',
    steps: [
      { step: 0, label: 'Order Confirmed', time: '01:45 PM', desc: 'Partner assigned & digital tamper-bag generated', done: true },
      { step: 1, label: 'Hamper Picked Up', time: '02:20 PM', desc: 'Rider Vikram weighed & sealed digital tamper lock (3.2 kg)', done: true },
      { step: 2, label: 'RO Soft Wash & Sanitization', time: '03:15 PM', desc: 'Hypoallergenic bio-enzymes & zero fabric shrinkage cycle', done: true },
      { step: 3, label: 'Italian Steam Pressing', time: 'In Progress', desc: 'Boiler steam vacuum press on wooden hangers', done: true, active: true },
      { step: 4, label: 'Out for Delivery', time: 'Est. 07:30 PM', desc: 'Captain en route to Indiranagar doorstep', done: false },
      { step: 5, label: 'Delivered Fresh & Crispy', time: 'Est. 08:15 PM', desc: 'Enjoy your clean, fragrant wardrobe!', done: false }
    ],
    itemsList: [
      { name: 'Formal Office Shirts', count: 4, type: 'piece' },
      { name: 'Cotton Trousers / Chinos', count: 2, type: 'piece' },
      { name: 'Casual T-Shirts', count: 2, type: 'piece' }
    ]
  },
  {
    orderId: 'PSK-81045',
    status: 'completed',
    serviceName: 'Sneaker Spa & Shoe Whitening',
    serviceCategory: 'shoe-spa',
    laundromatName: 'Poshak Sneaker Lab',
    laundromatArea: 'Direct Doorstep Hub',
    itemsCount: 2,
    weightKg: 1.6,
    totalAmount: 398,
    paymentMethod: 'Poshak Wallet',
    paymentStatus: 'Paid',
    pickupSlot: '13 Oct, 11:00 AM',
    deliveryEstimate: '14 Oct, 05:00 PM',
    placedAt: '13 Oct 2026',
    deliveredAt: '14 Oct 2026, 04:30 PM',
    currentStep: 5,
    pickupAddress: 'Flat 304, Palm Grove Apts, 12th Main Rd, HAL 2nd Stage, Indiranagar, Bengaluru - 560038',
    rating: 5,
    reviewText: 'My white Nike Dunks and suede loafers look straight out of the box! Zero chemical residue.',
    steps: [
      { step: 0, label: 'Order Confirmed', done: true },
      { step: 1, label: 'Picked Up', done: true },
      { step: 2, label: 'Deep Ultrasonic Clean', done: true },
      { step: 3, label: 'Midsole Whitening & UV Sterilization', done: true },
      { step: 4, label: 'Out for Delivery', done: true },
      { step: 5, label: 'Delivered', time: '14 Oct, 04:30 PM', done: true }
    ],
    itemsList: [
      { name: 'Nike Dunk Low (White/Navy)', count: 1, type: 'pair' },
      { name: 'Suede Driving Loafers (Brown)', count: 1, type: 'pair' }
    ]
  },
  {
    orderId: 'PSK-76512',
    status: 'completed',
    serviceName: 'Premium Silk Saree & Suit Dry Clean',
    serviceCategory: 'dry-clean',
    laundromatName: 'Poshak Couture & Silk Care',
    laundromatArea: 'Direct Doorstep Hub',
    itemsCount: 3,
    weightKg: 2.1,
    totalAmount: 647,
    paymentMethod: 'Google Pay (UPI)',
    paymentStatus: 'Paid',
    pickupSlot: '08 Oct, 09:30 AM',
    deliveryEstimate: '10 Oct, 06:00 PM',
    placedAt: '08 Oct 2026',
    deliveredAt: '10 Oct 2026, 05:15 PM',
    currentStep: 5,
    pickupAddress: 'Flat 304, Palm Grove Apts, 12th Main Rd, HAL 2nd Stage, Indiranagar, Bengaluru - 560038',
    rating: 5,
    reviewText: 'Handled my wedding Kanjeevaram saree and Italian wool blazer with extreme care. Came back with protective dust covers.',
    steps: [
      { step: 0, label: 'Order Confirmed', done: true },
      { step: 1, label: 'Picked Up', done: true },
      { step: 2, label: 'Hydrocarbon Eco Dry Clean', done: true },
      { step: 3, label: 'Form Steam Finishing', done: true },
      { step: 4, label: 'Out for Delivery', done: true },
      { step: 5, label: 'Delivered', time: '10 Oct, 05:15 PM', done: true }
    ],
    itemsList: [
      { name: 'Pure Zari Kanjeevaram Saree', count: 1, type: 'piece' },
      { name: '2-Piece Raymond Wool Suit', count: 1, type: 'set' },
      { name: 'Silk Dupatta', count: 1, type: 'piece' }
    ]
  }
];

export const INITIAL_ADDRESSES = [
  {
    id: 'addr-1',
    label: 'Home',
    isDefault: true,
    flatBuilding: 'Flat 304, Palm Grove Apts',
    streetArea: '12th Main Rd, HAL 2nd Stage, Indiranagar',
    landmark: 'Near 100ft Road Corner House',
    city: 'Bengaluru',
    pincode: '560038',
    tag: 'Primary'
  },
  {
    id: 'addr-2',
    label: 'Work / Studio',
    isDefault: false,
    flatBuilding: '4th Floor, WeWork Galaxy',
    streetArea: '43 Residency Road, Shanthala Nagar',
    landmark: 'Opposite Garuda Mall',
    city: 'Bengaluru',
    pincode: '560025',
    tag: 'Work'
  },
  {
    id: 'addr-3',
    label: 'Parents House',
    isDefault: false,
    flatBuilding: '#42, 14th Main, 2nd Block',
    streetArea: 'Jayanagar',
    landmark: 'Near Madhavan Park',
    city: 'Bengaluru',
    pincode: '560011',
    tag: 'Family'
  }
];

export const INITIAL_TRANSACTIONS = [
  {
    id: 'tx-101',
    type: 'credit',
    amount: 150,
    title: 'Welcome Joining Bonus',
    desc: 'Credited on Google One-Tap verification',
    date: 'Today, 01:00 PM',
    status: 'Completed'
  },
  {
    id: 'tx-102',
    type: 'debit',
    amount: 268,
    title: 'Order PSK-89241 Reserved',
    desc: 'Wash & Crisp Steam Iron',
    date: 'Today, 01:45 PM',
    status: 'Hold for Delivery'
  },
  {
    id: 'tx-103',
    type: 'credit',
    amount: 50,
    title: 'Referral Cash Bonus',
    desc: 'Friend Rohan signed up using your code',
    date: '12 Oct 2026',
    status: 'Completed'
  },
  {
    id: 'tx-104',
    type: 'credit',
    amount: 500,
    title: 'Wallet Top-Up via UPI',
    desc: 'Added via GPay (HDFC Bank)',
    date: '10 Oct 2026',
    status: 'Completed'
  }
];

export const QUICK_SERVICES = [
  {
    id: 'wash-fold',
    name: 'Wash, Dry & Fold',
    category: 'Daily Wear',
    price: '₹49/kg',
    unitPrice: 49,
    unit: 'kg',
    turnaround: '24 Hours',
    rating: '4.8 ★ (2.1k+)',
    image: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=400&q=80',
    desc: 'Separated whites & colors, RO water soft wash, allergen-free & crisply folded.'
  },
  {
    id: 'wash-iron',
    name: 'Wash & Steam Iron',
    category: 'Workwear',
    price: '₹69/kg',
    unitPrice: 69,
    unit: 'kg',
    turnaround: '24 Hours',
    rating: '4.9 ★ (4.5k+)',
    image: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=400&q=80',
    desc: 'Deep clean wash followed by Italian boiler steam vacuum press on hangers.'
  },
  {
    id: 'express-6h',
    name: 'Express 6-Hr Blitz Wash',
    category: 'Blitz Express',
    price: '₹99/kg',
    unitPrice: 99,
    unit: 'kg',
    turnaround: '6 Hours Blitz',
    rating: '4.9 ★ (1.8k+)',
    image: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=400&q=80',
    desc: 'Priority queue slot. 20-min doorstep pickup, sanitized wash & delivered before dinner.'
  },
  {
    id: 'dry-clean',
    name: 'Premium Suit & Silk Dry Clean',
    category: 'Delicates',
    price: '₹199/pc',
    unitPrice: 199,
    unit: 'pc',
    turnaround: '48 Hours',
    rating: '4.95 ★ (890+)',
    image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=400&q=80',
    desc: 'Hydrocarbon zero-bleed eco solvents for pure zari, silks, suits, and cashmere.'
  },
  {
    id: 'steam-press',
    name: 'Steam Press Only',
    category: 'Wrinkle-Free',
    price: '₹19/pc',
    unitPrice: 19,
    unit: 'pc',
    turnaround: 'Same Day',
    rating: '4.7 ★ (3.2k+)',
    image: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=400&q=80',
    desc: 'Italian boiler suction steam table pressing. Zero shine and razor-sharp crease.'
  },
  {
    id: 'shoe-spa',
    name: 'Sneaker & Shoe Spa',
    category: 'Footwear',
    price: '₹249/pair',
    unitPrice: 249,
    unit: 'pair',
    turnaround: '48 Hours',
    rating: '4.9 ★ (1.4k+)',
    image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=400&q=80',
    desc: 'Ultrasonic scrub, suede brushing, insole sterilization & sole un-yellowing.'
  },
  {
    id: 'heavy-home',
    name: 'Duvets, Blankets & Quilts',
    category: 'Home & Bedding',
    price: '₹199/pc',
    unitPrice: 199,
    unit: 'pc',
    turnaround: '48 Hours',
    rating: '4.8 ★ (950+)',
    image: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=400&q=80',
    desc: 'Deep sterilization wash targeting dust mites and pet dander with high-fluff drying.'
  }
];

export const TIME_SLOTS = [
  { id: 'slot-1', time: '07:00 AM - 09:00 AM', label: 'Morning First Slot', badge: 'High Availability' },
  { id: 'slot-2', time: '09:00 AM - 11:00 AM', label: 'Mid-Morning Slot', badge: 'Popular' },
  { id: 'slot-3', time: '01:00 PM - 03:00 PM', label: 'Afternoon Quiet Slot', badge: 'Fastest Dispatch' },
  { id: 'slot-4', time: '04:00 PM - 06:00 PM', label: 'Evening Return Slot', badge: 'After Work' },
  { id: 'slot-5', time: '07:00 PM - 09:00 PM', label: 'Late Evening Slot', badge: 'Express 6h Blitz' }
];

export const PROMO_CODES = [
  { code: 'POSHAKGOLD', discount: 20, type: 'percent', desc: '20% OFF for Gold Pass members' },
  { code: 'BENGALURU150', discount: 150, type: 'flat', desc: 'Flat ₹150 OFF on first 3 orders' },
  { code: 'BLITZFREE', discount: 49, type: 'flat', desc: 'Free express express upgrade' }
];
