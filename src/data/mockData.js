export const SERVICE_CATEGORIES = [
  {
    id: 'wash-fold',
    name: 'Wash & Fold',
    tagline: 'Fresh everyday casuals',
    price: 'From ₹49/kg',
    deliveryTime: '24 Hours',
    icon: 'Shirt',
    color: '#0284c7',
    bgColor: '#e0f2fe',
    badge: 'Popular',
    image: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=600&q=80',
    description: 'Separated whites and colors, washed with hypoallergenic bio-detergents, machine dried and neatly folded.'
  },
  {
    id: 'wash-iron',
    name: 'Wash & Steam Iron',
    tagline: 'Crisp workwear ready',
    price: 'From ₹69/kg',
    deliveryTime: '24 Hours',
    icon: 'Sparkles',
    color: '#2563eb',
    bgColor: '#dbeafe',
    badge: 'Bestseller',
    image: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=600&q=80',
    description: 'Full cycle gentle wash followed by commercial vacuum boiler steam press on wooden hangers.'
  },
  {
    id: 'express-6h',
    name: 'Express 6-Hr Blitz',
    tagline: 'Emergency laundry run',
    price: 'From ₹99/kg',
    deliveryTime: '6 Hours',
    icon: 'Zap',
    color: '#ea580c',
    bgColor: '#ffedd5',
    badge: 'Lightning Fast',
    image: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=600&q=80',
    description: 'Priority queue slot. Picked up in 20 minutes, rapid washed, dried, steam pressed and returned before dinner.'
  },
  {
    id: 'dry-clean',
    name: 'Premium Dry Clean',
    tagline: 'Suits, Silks & Designer Wear',
    price: 'From ₹149/pc',
    deliveryTime: '48 Hours',
    icon: 'Crown',
    color: '#7c3aed',
    bgColor: '#ede9fe',
    badge: 'Woolmark Certified',
    image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=600&q=80',
    description: 'Hydrocarbon eco-solvent dry clean safe for zari, delicate embroidery, pure wool, cashmere and silks.'
  },
  {
    id: 'steam-press',
    name: 'Steam Press Only',
    tagline: 'Wrinkle-free perfection',
    price: 'From ₹15/pc',
    deliveryTime: 'Same Day',
    icon: 'Flame',
    color: '#059669',
    bgColor: '#d1fae5',
    badge: 'Quick',
    image: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=600&q=80',
    description: 'Italian suction steam pressing with crisp crease setting. No fabric shine or burn marks.'
  },
  {
    id: 'shoe-spa',
    name: 'Sneaker & Shoe Spa',
    tagline: 'Deep scrub & sole whitening',
    price: 'From ₹249/pair',
    deliveryTime: '48 Hours',
    icon: 'Footprints',
    color: '#db2777',
    bgColor: '#fce7f3',
    badge: 'Trending',
    image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=600&q=80',
    description: 'Deep ultrasonic clean, suede brushing, insole sterilization, un-yellowing mid-soles and deodorizing.'
  },
  {
    id: 'heavy-home',
    name: 'Curtains & Quilts',
    tagline: 'Duvets, Blankets & Drapes',
    price: 'From ₹199/pc',
    deliveryTime: '48 Hours',
    icon: 'Layers',
    color: '#0d9488',
    bgColor: '#ccfbf1',
    badge: 'Anti-Allergen',
    image: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=600&q=80',
    description: 'Heavy duty sterilization wash targeting dust mites, pet dander and deep seated odors.'
  }
];

export const LAUNDROMATS = [
  {
    id: 'laundromat-1',
    name: 'The White Collar & Co.',
    rating: 4.9,
    reviewsCount: 1420,
    area: 'Koramangala 4th Block',
    distance: '1.2 km away',
    pickupTime: '15 mins pickup',
    deliveryEstimate: '6-24 hrs',
    specialties: ['German Miele Washers', 'Italian Boiler Press', 'RO Soft Water'],
    tags: ['Super Fast', 'Eco Certified', 'Zomato Pick'],
    pricePerKg: 49,
    minOrder: 199,
    isPromoted: true,
    isOpen: true,
    ratingDistribution: { 5: '88%', 4: '10%', 3: '2%' },
    image: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80',
    offers: ['FLAT ₹100 OFF with code POSHAK100', 'Free Hanger Packing'],
    menu: [
      { id: 'm1', name: 'Everyday Wash & Fold', price: 49, unit: 'per kg', type: 'weight', icon: 'Shirt' },
      { id: 'm2', name: 'Wash + Crisp Steam Iron', price: 69, unit: 'per kg', type: 'weight', icon: 'Sparkles' },
      { id: 'm3', name: 'Formal Cotton Shirt Press', price: 18, unit: 'per piece', type: 'piece', icon: 'Flame' },
      { id: 'm4', name: '2-Piece Suit Dry Cleaning', price: 299, unit: 'per set', type: 'piece', icon: 'Crown' },
      { id: 'm5', name: 'Premium Silk Saree Spa', price: 249, unit: 'per piece', type: 'piece', icon: 'Sparkles' },
      { id: 'm6', name: 'Sneaker Deep Revive', price: 299, unit: 'per pair', type: 'piece', icon: 'Footprints' }
    ]
  },
  {
    id: 'laundromat-2',
    name: 'FabriKare Ultra Clean Studio',
    rating: 4.8,
    reviewsCount: 890,
    area: 'Indiranagar 100ft Road',
    distance: '2.4 km away',
    pickupTime: '20 mins pickup',
    deliveryEstimate: '12-24 hrs',
    specialties: ['Ozone Sanitized', 'Zero Bleach Formula', 'Fabric Insurance'],
    tags: ['Organic Care', 'Silk Experts'],
    pricePerKg: 55,
    minOrder: 199,
    isPromoted: false,
    isOpen: true,
    image: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=800&q=80',
    offers: ['20% Cashback on HDFC / CRED Pay'],
    menu: [
      { id: 'm7', name: 'Ozone Bio-Wash & Fold', price: 55, unit: 'per kg', type: 'weight', icon: 'Shirt' },
      { id: 'm8', name: 'Steam Iron & Hanger Delivery', price: 75, unit: 'per kg', type: 'weight', icon: 'Sparkles' },
      { id: 'm9', name: 'Blazer & Trenchcoat Dry Clean', price: 249, unit: 'per piece', type: 'piece', icon: 'Crown' },
      { id: 'm10', name: 'Designer Lehenga Gentle Clean', price: 449, unit: 'per piece', type: 'piece', icon: 'Crown' },
      { id: 'm11', name: 'King Size Quilt Sterilization', price: 249, unit: 'per piece', type: 'piece', icon: 'Layers' }
    ]
  },
  {
    id: 'laundromat-3',
    name: 'Spin & Sparkle Blitz Hub',
    rating: 4.7,
    reviewsCount: 2310,
    area: 'HSR Layout Sector 3',
    distance: '0.8 km away',
    pickupTime: '10 mins pickup',
    deliveryEstimate: '6 Hours Blitz',
    specialties: ['6hr Express Guarantee', 'Color-Lock Tech', 'Free Pickup/Drop'],
    tags: ['Fastest in Town', 'Budget Friendly'],
    pricePerKg: 45,
    minOrder: 149,
    isPromoted: true,
    isOpen: true,
    image: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=800&q=80',
    offers: ['Buy 5kg Get 1kg Wash FREE'],
    menu: [
      { id: 'm12', name: 'Standard Wash & Fold', price: 45, unit: 'per kg', type: 'weight', icon: 'Shirt' },
      { id: 'm13', name: 'Express 6-Hour Wash & Fold', price: 89, unit: 'per kg', type: 'weight', icon: 'Zap' },
      { id: 'm14', name: 'Steam Press Bundle (10 items)', price: 140, unit: 'combo', type: 'piece', icon: 'Flame' },
      { id: 'm15', name: 'Denim Jeans Deep Wash & Press', price: 35, unit: 'per piece', type: 'piece', icon: 'Sparkles' }
    ]
  },
  {
    id: 'laundromat-4',
    name: 'Velvet Touch Luxury Care',
    rating: 4.95,
    reviewsCount: 650,
    area: 'Jayanagar 4th T Block',
    distance: '3.1 km away',
    pickupTime: '30 mins pickup',
    deliveryEstimate: '24-48 hrs',
    specialties: ['Woolmark Master', 'Individual Batch Wash', 'Antiseptic Rinse'],
    tags: ['Luxury Care', 'Wedding Wear'],
    pricePerKg: 65,
    minOrder: 299,
    isPromoted: false,
    isOpen: true,
    image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=800&q=80',
    offers: ['Complimentary Moth-Proof Garment Bags'],
    menu: [
      { id: 'm16', name: 'Pure Cashmere / Pashmina Wash', price: 399, unit: 'per piece', type: 'piece', icon: 'Crown' },
      { id: 'm17', name: 'Sherwani & Bridal Couture Care', price: 599, unit: 'per set', type: 'piece', icon: 'Crown' },
      { id: 'm18', name: 'Woolen Sweater Bio-conditioning', price: 149, unit: 'per piece', type: 'piece', icon: 'Sparkles' },
      { id: 'm19', name: 'Silk Shirt Italian Steam Press', price: 39, unit: 'per piece', type: 'piece', icon: 'Flame' }
    ]
  },
  {
    id: 'laundromat-5',
    name: 'SneakerHeads & Kicks Spa',
    rating: 4.85,
    reviewsCount: 1120,
    area: 'MG Road / Church Street',
    distance: '3.8 km away',
    pickupTime: '25 mins pickup',
    deliveryEstimate: '24-48 hrs',
    specialties: ['Jason Markk Products', 'Ozone Deodorize', 'Suede Restoration'],
    tags: ['Sneaker Specialists', 'Leather Care'],
    pricePerKg: 0,
    minOrder: 249,
    isPromoted: false,
    isOpen: true,
    image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80',
    offers: ['2nd Pair at 40% OFF with code SNEAKER40'],
    menu: [
      { id: 'm20', name: 'Standard Sneaker Deep Clean', price: 249, unit: 'per pair', type: 'piece', icon: 'Footprints' },
      { id: 'm21', name: 'Suede / Nubuck Gentle Spa', price: 349, unit: 'per pair', type: 'piece', icon: 'Footprints' },
      { id: 'm22', name: 'Leather Boots Nourish & Shine', price: 399, unit: 'per pair', type: 'piece', icon: 'Footprints' },
      { id: 'm23', name: 'Midsole Un-yellowing + Water Shield', price: 149, unit: 'add-on', type: 'piece', icon: 'Sparkles' }
    ]
  },
  {
    id: 'laundromat-6',
    name: 'AquaBreeze 24x7 Commercial Hub',
    rating: 4.6,
    reviewsCount: 3100,
    area: 'Whitefield Main Road',
    distance: '4.5 km away',
    pickupTime: '30 mins pickup',
    deliveryEstimate: '12-24 hrs',
    specialties: ['High Capacity Electrolux', 'Steam Tunnel Dryer', 'RFID Tagging'],
    tags: ['Hostel / Bulk Deals', '24/7 Service'],
    pricePerKg: 39,
    minOrder: 199,
    isPromoted: false,
    isOpen: true,
    image: 'https://images.unsplash.com/photo-1521656693074-0ef32e80a5d5?auto=format&fit=crop&w=800&q=80',
    offers: ['Bulk 10kg package at just ₹349'],
    menu: [
      { id: 'm24', name: 'Bulk Student Wash & Fold (5kg+)', price: 39, unit: 'per kg', type: 'weight', icon: 'Shirt' },
      { id: 'm25', name: 'Bed Sheets & Towel Spa (3kg)', price: 149, unit: 'bundle', type: 'piece', icon: 'Layers' },
      { id: 'm26', name: 'Curtains per kg steam clean', price: 65, unit: 'per kg', type: 'weight', icon: 'Layers' }
    ]
  }
];

export const CALCULATOR_GARMENTS = [
  { id: 'c1', name: 'T-Shirts & Polos', category: 'Dailywear', defaultPrice: 15, avgWeight: 0.2, icon: 'Shirt' },
  { id: 'c2', name: 'Formal Shirts', category: 'Workwear', defaultPrice: 18, avgWeight: 0.25, icon: 'Shirt' },
  { id: 'c3', name: 'Trousers & Chinos', category: 'Workwear', defaultPrice: 20, avgWeight: 0.4, icon: 'Flame' },
  { id: 'c4', name: 'Jeans & Denims', category: 'Dailywear', defaultPrice: 25, avgWeight: 0.6, icon: 'Sparkles' },
  { id: 'c5', name: 'Dresses / Kurtas', category: 'Ethnic', defaultPrice: 35, avgWeight: 0.35, icon: 'Crown' },
  { id: 'c6', name: '2-Piece Suit / Blazer', category: 'Dry Clean', defaultPrice: 249, avgWeight: 1.2, icon: 'Crown' },
  { id: 'c7', name: 'Silk Sarees', category: 'Ethnic', defaultPrice: 199, avgWeight: 0.5, icon: 'Sparkles' },
  { id: 'c8', name: 'Bedsheet + Pillow Covers', category: 'Home', defaultPrice: 89, avgWeight: 0.8, icon: 'Layers' },
  { id: 'c9', name: 'Heavy Blanket / Quilt', category: 'Home', defaultPrice: 199, avgWeight: 2.5, icon: 'Layers' },
  { id: 'c10', name: 'Sneakers / Sports Shoes', category: 'Footwear', defaultPrice: 249, avgWeight: 0.9, icon: 'Footprints' }
];

export const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Tap to Schedule Pickup',
    desc: 'Select your preferred laundromat, pick a 15-minute slot, or let Poshak Auto-Dispatch our nearest express captain.',
    icon: 'Smartphone',
    badge: '30 sec booking'
  },
  {
    step: '02',
    title: 'Bag It & Doorstep Handover',
    desc: 'Our rider arrives with a sanitized Poshak Hamper bag with digital tamper tags and weight sensor scale right at your door.',
    icon: 'Package',
    badge: 'Live weight sync'
  },
  {
    step: '03',
    title: 'Custom Fabric Spa & Sterilization',
    desc: 'Garments sorted by fabric and color tone. Washed in gentle RO water, bio-enzymes, conditioned and steam pressed.',
    icon: 'Sparkles',
    badge: 'Zero color bleed guarantee'
  },
  {
    step: '04',
    title: 'Delivered Fresh & Crisply Packed',
    desc: 'Delivered in crisp hangers or vacuum-pressed packs within 6 to 24 hours. Smelling like clean alpine breeze.',
    icon: 'Truck',
    badge: '6hr Blitz option'
  }
];

export const WHY_POSHAK_FEATURES = [
  {
    title: 'Live Order Tracking',
    subtitle: 'From soak to dry to doorstep',
    desc: 'Watch every milestone in real-time. Know exactly when your clothes are washing, drying, steam-ironing and dispatched on the map.',
    icon: 'MapPin',
    highlight: 'GPS Live Rider'
  },
  {
    title: 'Fabric Protection Guarantee',
    subtitle: '100% replacement insurance',
    desc: 'Zero missing sock anxiety. Every garment is photographed, tagged with QR barcoding, and backed by a ₹5,000 fabric guarantee.',
    icon: 'ShieldCheck',
    highlight: '₹5,000 Insurance'
  },
  {
    title: 'Eco & Hypoallergenic Care',
    subtitle: 'Skin & baby-safe botanical formulas',
    desc: 'No harsh caustic chemicals or sulfur bleaches. We use gentle coconut-derived enzymes and UV-C germicidal sterilization.',
    icon: 'Leaf',
    highlight: 'Baby Safe'
  },
  {
    title: 'Express 6-Hour Turnaround',
    subtitle: 'Meeting in the evening? Covered.',
    desc: 'When time is tight, our Blitz hubs prioritize your wash, iron, and pack sequence with lightning 6-hour delivery.',
    icon: 'Zap',
    highlight: 'Lightning Fast'
  },
  {
    title: 'Affordable Neighborhood Rates',
    subtitle: 'Starting at just ₹49/kg',
    desc: 'Top-tier laundromat quality at cheaper prices than your local dhobi with zero hassle of drying clothes during monsoons.',
    icon: 'BadgePercent',
    highlight: 'Under ₹49/kg'
  },
  {
    title: 'Free Pickup & Delivery',
    subtitle: 'Zero doorstep convenience fee',
    desc: 'Free doorstep pickup across all major pin codes on orders above ₹149. Transparent itemized digital billing.',
    icon: 'Truck',
    highlight: 'Free on ₹149+'
  }
];

export const TESTIMONIALS = [
  {
    id: 1,
    name: 'Aarav Malhotra',
    role: 'Product Lead, Koramangala',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    rating: 5,
    service: 'Wash & Steam Iron (6kg)',
    text: 'Poshak is literally the Zomato for laundry! I used to dread washing and ironing shirts every weekend. Scheduled a pickup at 8 AM, got them hanger-packed and smelling amazing by 4 PM. Unreal experience.',
    date: 'Yesterday'
  },
  {
    id: 2,
    name: 'Pooja Iyer',
    role: 'Design Director, Indiranagar',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    rating: 5,
    service: 'Silk Saree Dry Clean + Sneaker Spa',
    text: 'Sent two expensive Kanjeevarams and my muddy white Onitsuka Tigers. The sarees returned pristine with zero fabric stretch, and the sneakers look brand new out of the box. Absolutely top notch!',
    date: '3 days ago'
  },
  {
    id: 3,
    name: 'Rohan Deshmukh',
    role: 'Founder, HSR Layout',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    rating: 5,
    service: '6-Hour Blitz Wash (4kg)',
    text: 'Had an investor pitch dinner at 7 PM and spilled coffee on my only crisp blazer and shirt at 11 AM. The 6-hour blitz saved my life. Live GPS tracker showed the rider at my door with 30 mins to spare.',
    date: '5 days ago'
  }
];

export const MOCK_ACTIVE_ORDER = {
  orderId: 'PSK-89241',
  laundromatName: 'The White Collar & Co.',
  laundromatArea: 'Koramangala 4th Block',
  serviceType: 'Wash & Crisp Steam Iron',
  totalItems: '8 items (3.2 kg)',
  totalAmount: 268,
  placedTime: 'Today, 2:15 PM',
  estimatedDelivery: 'Today, 8:15 PM (6h Blitz)',
  currentStep: 3, // 0: Placed, 1: Picked Up, 2: Eco-Washing, 3: Steam Pressing, 4: Out for Delivery, 5: Delivered
  riderName: 'Vikram Singh',
  riderRating: '4.9 ★',
  riderPhone: '+91 98765 43210',
  riderVehicle: 'Poshak EV-12 (KA-01-EQ-9812)',
  steps: [
    { label: 'Order Confirmed', time: '02:15 PM', desc: 'Partner assigned and digital hamper generated', done: true },
    { label: 'Hamper Picked Up', time: '02:40 PM', desc: 'Rider Vikram weighed & secured tamper seal (3.2 kg)', done: true },
    { label: 'Eco Wash & Sterilization', time: '03:30 PM', desc: 'Hypoallergenic bio-wash in RO soft water cycle', done: true },
    { label: 'Italian Steam Press', time: 'In Progress', desc: 'Zero-shine boiler steam ironing & wooden hanger pack', done: true, active: true },
    { label: 'Out for Delivery', time: 'Est. 07:30 PM', desc: 'Captain on the way to your doorstep', done: false },
    { label: 'Delivered Clean & Crisp', time: 'Est. 08:15 PM', desc: 'Enjoy your fresh wardrobe!', done: false }
  ]
};

export const CITIES_SERVED = [
  'Bengaluru (50+ Hubs)',
  'Mumbai (40+ Hubs)',
  'Delhi NCR (60+ Hubs)',
  'Hyderabad (35+ Hubs)',
  'Pune (25+ Hubs)',
  'Chennai (30+ Hubs)'
];

export const FAQS = [
  {
    q: 'How does Poshak work like Zomato for laundry?',
    a: 'Just like browsing nearby restaurants and menus on Zomato, on Poshak you discover verified, high-rating neighborhood laundromats and specialty fabric studios. You can pick specific services (wash & fold, steam iron, dry cleaning, sneaker spa), customize laundry instructions, compare prices per kg, and track your clothes live step-by-step from pickup to delivery.'
  },
  {
    q: 'How is the weight calculated for per-kg services?',
    a: 'Our pickup captain carries a digital weighing scale. They weigh your hamper right in front of you at your doorstep before sealing it in a tamper-proof bag, and the exact weight syncs instantly to your app and bill.'
  },
  {
    q: 'Are my clothes washed separately from others?',
    a: '100% YES. At Poshak, strict hygiene is non-negotiable. Every customer’s laundry is washed in dedicated, isolated machine batches. We NEVER mix garments between customers.'
  },
  {
    q: 'What is the Express 6-Hour Blitz delivery?',
    a: 'When you choose Express Blitz, your order is routed to high-speed dedicated commercial machines with prioritized drying and instant steam pressing, returned to you in under 6 hours.'
  },
  {
    q: 'How does Google Sign-In work on Poshak?',
    a: 'You can log in with a single tap using your Gmail account via Google OAuth 2.0. Your addresses, orders, and saved preferences stay synchronized seamlessly.'
  }
];
