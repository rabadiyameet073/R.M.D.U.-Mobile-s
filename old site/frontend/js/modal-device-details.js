// Device Details Database for Budget Best Phones (Under ₹20,000)

const deviceData = {
    'realme-p4x': {
        title: 'Realme P4x 5G',
        image: 'https://static1.pocketlintimages.com/wordpress/wp-content/uploads/wm/2024/03/realme-p-series-5g-promo.jpg',
        launchYear: 'December 2025',
        status: 'New Launch / High Demand',
        display: '6.72-inch FHD+ IPS LCD, 144Hz, 1000 nits Peak Brightness',
        performance: 'MediaTek Dimensity 7400 Ultra',
        battery: '7000 mAh',
        camera: 'Rear: 50MP (Main) + 2MP (Mono)',
        connectivity: '5G, Android 15, Vapor Chamber Cooling, IP54',
        price: '₹15,999',
        vfm: '9.5/10',
        justification: 'The P4x fits the "Budget Best" list as the definitive choice for young gamers on a strict budget. The combination of the Dimensity 7400 Ultra and a 7000mAh battery solves the two biggest pain points of budget devices: lag and battery anxiety.'
    },
    'moto-g67': {
        title: 'Moto G67 Power',
        image: 'https://i.gadgets360cdn.com/large/moto_g67_power_1_1735301516716.jpg',
        launchYear: '2025',
        status: 'Available / Best Seller',
        display: '6.7-inch IPS LCD, 120Hz, FHD+, 1050 nits',
        performance: 'Qualcomm Snapdragon 7s Gen 2',
        battery: '7000 mAh',
        camera: 'Rear: 50MP + 8MP (Ultrawide)',
        connectivity: '5G, Android 15 (Hello UI), Stereo Speakers, IP52',
        price: '₹15,629',
        vfm: '9.2/10',
        justification: 'This device is critical for customers prioritizing software cleanliness and battery life. The Hello UI offers a bloatware-free experience rare in this price bracket, and the 7000mAh battery ensures two full days of usage.'
    },
    'samsung-m14': {
        title: 'Samsung Galaxy M14 5G',
        image: 'https://m.media-amazon.com/images/I/81f43KRVFNL._SX679_.jpg',
        launchYear: '2024 (Retailing in 2025)',
        status: 'Available',
        display: '6.6-inch PLS LCD, 90Hz, FHD+',
        performance: 'Exynos 1330 (5nm)',
        battery: '6000 mAh',
        camera: 'Rear: 50MP + 2MP + 2MP',
        connectivity: '5G (13 Bands), OneUI Core, Plastic Build',
        price: '₹10,999',
        vfm: '8.5/10',
        justification: 'This unit is essential for brand-loyal customers transitioning from 4G to 5G. Its massive band support ensures future-proofing, and the 6000mAh battery aligns with the current market trend for endurance.'
    },
    'poco-m6': {
        title: 'POCO M6 Pro 5G',
        image: 'https://m.media-amazon.com/images/I/71RxOp16SQL._SX679_.jpg',
        launchYear: '2024',
        status: 'Available',
        display: '6.79-inch IPS LCD, 90Hz, FHD+',
        performance: 'Snapdragon 4 Gen 2 (4nm)',
        battery: '5000 mAh',
        camera: 'Rear: 50MP AI Dual Cam',
        connectivity: '5G, MIUI for POCO, Glass Back, IP53',
        price: '₹9,999',
        vfm: '10/10',
        justification: 'The absolute value king for entry-level buyers. The 4nm processor ensures thermal efficiency, and the glass build provides a tactile feel superior to plastic competitors.'
    },
    'iqoo-z9': {
        title: 'iQOO Z9 Lite 5G',
        image: 'https://m.media-amazon.com/images/I/71RMv+bfJnL._SX679_.jpg',
        launchYear: '2025',
        status: 'Available',
        display: '6.56-inch LCD, 90Hz, HD+',
        performance: 'MediaTek Dimensity 6300',
        battery: '5000 mAh',
        camera: 'Rear: 50MP Main + 2MP',
        connectivity: '5G, Funtouch OS 15, Plastic Build, IP54',
        price: '₹10,498',
        vfm: '8/10',
        justification: 'Essential inventory for the "first smartphone" demographic. It balances adequate performance with 5G capability at a price point just above ₹10,000.'
    },
    'realme-narzo70x': {
        title: 'Realme Narzo 70x 5G',
        image: 'https://m.media-amazon.com/images/I/81cGJKLDy9L._SX679_.jpg',
        launchYear: '2025',
        status: 'Available',
        display: '6.72-inch IPS LCD, 120Hz, FHD+',
        performance: 'MediaTek Dimensity 6100+',
        battery: '5000 mAh',
        camera: 'Rear: 50MP + 2MP',
        connectivity: '5G, Realme UI 5.0, IP54',
        price: '₹11,999',
        vfm: '9/10',
        justification: 'Fits the list for users who prioritize downtime reduction. The 120Hz display also makes it one of the smoothest experiences under ₹12k.'
    },
    'redmi-13c': {
        title: 'Redmi 13C 5G',
        image: 'https://m.media-amazon.com/images/I/71d1ytcCntL._SX679_.jpg',
        launchYear: '2024',
        status: 'Available',
        display: '6.74-inch LCD, 90Hz, HD+',
        performance: 'MediaTek Dimensity 6100+',
        battery: '5000 mAh',
        camera: 'Rear: 50MP AI Cam',
        connectivity: '5G, MIUI 14, Star Trail Design',
        price: '₹11,999',
        vfm: '8/10',
        justification: 'A volume driver for RMDU Mobiles. It captures the customer looking for style and 5G connectivity at a minimal entry cost.'
    },
    'moto-g34': {
        title: 'Moto G34 5G',
        image: 'https://m.media-amazon.com/images/I/71xAq-0bIYL._SX679_.jpg',
        launchYear: '2024',
        status: 'Available',
        display: '6.5-inch IPS LCD, 120Hz, HD+',
        performance: 'Snapdragon 695',
        battery: '5000 mAh',
        camera: 'Rear: 50MP + 2MP',
        connectivity: '5G, MyUX, Vegan Leather',
        price: '₹11,999',
        vfm: '9/10',
        justification: 'The performance-per-rupee leader in the ₹12k segment. The vegan leather back also offers a premium tactility usually absent in this class.'
    },
    'samsung-f15': {
        title: 'Samsung Galaxy F15 5G',
        image: 'https://m.media-amazon.com/images/I/81WJm07A0tL._SX679_.jpg',
        launchYear: '2025',
        status: 'Available',
        display: '6.5-inch Super AMOLED, 90Hz',
        performance: 'MediaTek Dimensity 6100+',
        battery: '6000 mAh',
        camera: 'Rear: 50MP + 5MP + 2MP',
        connectivity: '5G, OneUI',
        price: '₹12,599',
        vfm: '9/10',
        justification: 'The combination of an AMOLED screen and a 6000mAh battery makes this the default recommendation for users who stream content heavily.'
    },
    'lava-blaze': {
        title: 'Lava Blaze Amoled 2',
        image: 'https://m.media-amazon.com/images/I/71S5+xVqvQL._SX679_.jpg',
        launchYear: '2025',
        status: 'Available',
        display: '6.67-inch AMOLED, 120Hz',
        performance: 'MediaTek Dimensity 7020',
        battery: '5000 mAh',
        camera: 'Rear: 50MP + AI Lens',
        connectivity: '5G, Clean Android, Glass Back',
        price: '₹11,999',
        vfm: '9.5/10',
        justification: 'Represents the resurgence of Indian brands. It offers a cleaner UI than many Chinese counterparts and a premium display at a budget price.'
    },
    'moto-g57': {
        title: 'Moto G57 Power',
        image: 'https://m.media-amazon.com/images/I/71a49cULzIL._SX679_.jpg',
        launchYear: '2025',
        status: 'Available',
        display: '6.72-inch LCD, 120Hz',
        performance: 'Snapdragon 6s Gen 4',
        battery: '7000 mAh',
        camera: 'Rear: 50MP + 8MP',
        connectivity: '5G, Android 15',
        price: '₹15,328',
        vfm: '8.5/10',
        justification: 'A pure utility phone. It fits the list for users who need maximum battery capacity but cannot stretch their budget to the G67.'
    },
    'vivo-t4x': {
        title: 'Vivo T4x',
        image: 'https://m.media-amazon.com/images/I/81iogWYVvBL._SX679_.jpg',
        launchYear: '2025',
        status: 'Available',
        display: '6.72-inch LCD, 120Hz, FHD+',
        performance: 'MediaTek Dimensity 7300 | 6GB RAM | 128GB Storage',
        battery: '6500 mAh | 44W FlashCharge',
        camera: 'Rear: 50MP + 2MP | Front: 8MP',
        connectivity: '5G, Funtouch OS 15, IP64',
        price: '₹15,460',
        vfm: '8/10',
        justification: 'The 6500mAh battery offers a middle ground between standard 5000mAh phones and the heavier 7000mAh behemoths, offering great endurance without excessive bulk.'
    },
    'realme-c73': {
        title: 'Realme C73 5G',
        image: 'https://m.media-amazon.com/images/I/71vAbaklN+L._SX679_.jpg',
        launchYear: '2025',
        status: 'Available',
        display: '6.72-inch LCD, 90Hz',
        performance: 'Dimensity 6100+',
        battery: '5000 mAh',
        camera: 'Rear: 50MP AI Cam',
        connectivity: '5G, IP64 Rating',
        price: '₹9,999',
        vfm: '7.5/10',
        justification: 'Ideal for first-time smartphone users or field workers who need a device that can withstand dust and splashes without breaking the bank.'
    },
    'samsung-a07': {
        title: 'Samsung Galaxy A07 4G',
        image: 'https://images.samsung.com/is/image/samsung/p6pim/in/sm-a047fzbhins/gallery/in-galaxy-a04e-sm-a047-sm-a047fzbhins-534851088',
        launchYear: '2025',
        status: 'Available',
        display: '6.7-inch LCD, 60Hz',
        performance: 'Helio G85',
        battery: '5000 mAh',
        camera: 'Rear: 50MP Main',
        connectivity: '4G LTE, OneUI Core',
        price: '₹9,749',
        vfm: '7/10',
        justification: 'Included for RMDU\'s ultra-budget inventory. It appeals to senior citizens or secondary phone buyers who prioritize UI familiarity over speed.'
    },
    'redmi-note15': {
        title: 'Redmi Note 15 (Base)',
        image: 'https://akm-img-a-in.tosshub.com/indiatoday/images/story/202412/redmi-note-15-series-091530698-16x9_0.jpg',
        launchYear: 'Dec 2025',
        status: 'New Launch',
        display: '6.77-inch AMOLED, 120Hz',
        performance: 'Snapdragon 6 Gen 3',
        battery: '5800 mAh',
        camera: 'Rear: 50MP + 2MP',
        connectivity: '5G, HyperOS, Gorilla Glass 5',
        price: '₹15,999',
        vfm: '9/10',
        justification: 'A crucial SKU for December. The 5800mAh battery is a slight upgrade over the standard 5000mAh, offering better longevity without the weight penalty of 7000mAh phones.'
    },
    'infinix-hot60i': {
        title: 'Infinix Hot 60i 5G',
        image: 'https://m.media-amazon.com/images/I/71b6TqVOdML._SX679_.jpg',
        launchYear: '2025',
        status: 'Available',
        display: '6.75-inch HD+ LCD, 120Hz',
        performance: 'Dimensity 6400',
        battery: '6000 mAh',
        camera: 'Rear: 50MP',
        connectivity: '5G, XOS',
        price: '₹9,299',
        vfm: '8/10',
        justification: 'Perfect for users needing 5G and long battery life under ₹10,000. The trade-off is slower charging and an HD+ screen.'
    },
    'tecno-pova': {
        title: 'Tecno Pova Slim',
        image: 'https://m.media-amazon.com/images/I/71tPyVfiN4L._SX679_.jpg',
        launchYear: 'Dec 2025',
        status: 'Available',
        display: '6.78-inch AMOLED, 120Hz',
        performance: 'Dimensity 6400',
        battery: '5160 mAh',
        camera: 'Rear: 50MP',
        connectivity: '5G, HiOS, Slim Profile',
        price: '₹19,900',
        vfm: '7.5/10',
        justification: 'Fits the list as a lifestyle choice. It targets buyers who want decent endurance but refuse to carry a heavy brick in their pocket.'
    },
    'realme-15x': {
        title: 'Realme 15x 5G',
        image: 'https://m.media-amazon.com/images/I/71Rbz8CqUgL._SX679_.jpg',
        launchYear: '2025',
        status: 'Available',
        display: '6.8-inch LCD, 120Hz',
        performance: 'Dimensity 6300',
        battery: '7000 mAh',
        camera: 'Rear: 50MP',
        connectivity: '5G, Realme UI',
        price: '₹16,199',
        vfm: '8.5/10',
        justification: 'This phone is for power users on a budget. The combination of 7000mAh and 60W charging ensures minimal downtime.'
    },
    'oppo-k13': {
        title: 'OPPO K13 5G',
        image: 'https://m.media-amazon.com/images/I/61VbL42BqXL._SX679_.jpg',
        launchYear: '2025',
        status: 'Available',
        display: '6.67-inch AMOLED, 120Hz',
        performance: 'Snapdragon 6 Gen 4',
        battery: '7000 mAh',
        camera: 'Rear: 50MP + 2MP',
        connectivity: '5G, ColorOS 15',
        price: '₹17,000',
        vfm: '9.5/10',
        justification: 'The K13 stands out for its 80W charging speed, which is incredibly rare in the sub-₹20k price bracket, making it a top pick for fast-paced lifestyles.'
    },
    'realme-narzo80x': {
        title: 'Realme Narzo 80x 5G',
        image: 'https://m.media-amazon.com/images/I/71cGJKLDy9L._SX679_.jpg',
        launchYear: '2025',
        status: 'Available',
        display: '6.72-inch LCD, 120Hz',
        performance: 'Dimensity 6400',
        battery: '6000 mAh',
        camera: 'Rear: 50MP',
        connectivity: '5G, Realme UI',
        price: '₹12,930',
        vfm: '8/10',
        justification: 'A reliable all-rounder that fits perfectly into the ₹13k budget, offering good screen real estate and 5G speeds.'
    },
    // Budget phones (phone10k section)
    'redmi-13c-4g': {
        title: 'Redmi 13C (4G)',
        image: 'https://m.media-amazon.com/images/I/71d1ytcCntL._SX679_.jpg',
        launchYear: '2024',
        status: 'Available / Best Seller',
        display: '6.74-inch LCD, 90Hz, HD+',
        performance: 'MediaTek Helio G85',
        battery: '5000 mAh',
        camera: 'Rear: 50MP AI Camera',
        connectivity: '4G, MIUI 14, Side-mounted Fingerprint',
        price: '₹7,699',
        vfm: '9/10',
        justification: 'Perfect entry-level smartphone for budget-conscious buyers. Offers reliable performance for daily tasks and a large display for media consumption at an unbeatable price point.'
    },
    'poco-c65': {
        title: 'POCO C65',
        image: 'https://m.media-amazon.com/images/I/8195A49fZbL._SX679_.jpg',
        launchYear: '2024',
        status: 'Available',
        display: '6.74-inch LCD, 90Hz, HD+',
        performance: 'MediaTek Helio G85',
        battery: '5000 mAh | 18W Fast Charging',
        camera: 'Rear: 50MP + 2MP (Macro)',
        connectivity: '4G, MIUI for POCO, Glass Back Design',
        price: '₹7,499',
        vfm: '9.5/10',
        justification: 'The absolute value champion under ₹8000. Glass back provides premium feel, 90Hz display ensures smooth scrolling, and sufficient performance for everyday use makes it unbeatable in this price range.'
    },
    'samsung-m04': {
        title: 'Samsung Galaxy M04',
        image: 'https://m.media-amazon.com/images/I/61IiuWQcVjL._SX679_.jpg',
        launchYear: '2023 (Still selling)',
        status: 'Available',
        display: '6.5-inch PLS LCD, 60Hz, HD+',
        performance: 'MediaTek Helio P35',
        battery: '5000 mAh',
        camera: 'Rear: 13MP Dual Camera',
        connectivity: '4G, OneUI Core 5, Dolby Atmos',
        price: '₹8,499',
        vfm: '8/10',
        justification: 'The go-to choice for Samsung brand loyalists on a tight budget. OneUI Core provides clean interface and guaranteed software updates, making it reliable for long-term use. Perfect for seniors or first-time smartphone users who trust the Samsung brand.'
    },
    // Premium budget phones (phone30k section)
    'realme-narzo60pro': {
        title: 'Realme Narzo 60 Pro',
        image: 'https://m.media-amazon.com/images/I/61H72-ADh3L._SX679_.jpg',
        launchYear: '2024',
        status: 'Available',
        display: '6.7-inch AMOLED, 120Hz, FHD+',
        performance: 'MediaTek Dimensity 7050',
        battery: '5000 mAh | 67W SUPERVOOC',
        camera: 'Rear: 100MP OIS + 8MP Ultrawide + 2MP Macro',
        connectivity: '5G, Realme UI 4.0, Curved Display, IP54',
        price: '₹23,999',
        vfm: '9/10',
        justification: 'A true mid-range powerhouse offering flagship-level camera system with 100MP OIS at a competitive price. The curved AMOLED display and 67W fast charging make it stand out in the sub-₹25k segment. Perfect for photography enthusiasts and heavy users.'
    },
    'poco-x6pro': {
        title: 'POCO X6 Pro 5G',
        image: 'https://m.media-amazon.com/images/I/61VbL42BqXL._SX679_.jpg',
        launchYear: '2024',
        status: 'Available / Performance Beast',
        display: '6.67-inch AMOLED, 120Hz, FHD+, 1800 nits',
        performance: 'MediaTek Dimensity 8300 Ultra',
        battery: '5000 mAh | 67W Turbo Charging',
        camera: 'Rear: 64MP OIS + 8MP Ultrawide + 2MP Macro',
        connectivity: '5G, Xiaomi HyperOS, Dual Stereo Speakers, IR Blaster',
        price: '₹26,999',
        vfm: '9.5/10',
        justification: 'The performance king under ₹30k. Dimensity 8300 Ultra delivers flagship-level performance at mid-range price. With blazing-fast display, excellent build quality, and aggressive pricing, this is the ultimate choice for mobile gamers and power users who refuse to compromise on speed.'
    }
};

// Modal Functions
function openModal(deviceId) {
    const device = deviceData[deviceId];
    if (!device) return;

    // Populate modal with device data
    document.getElementById('modalImage').src = device.image;
    document.getElementById('modalTitle').textContent = device.title;
    document.getElementById('modalLaunchYear').textContent = device.launchYear;
    document.getElementById('modalStatus').textContent = device.status;
    document.getElementById('modalDisplay').textContent = device.display;
    document.getElementById('modalPerformance').textContent = device.performance;
    document.getElementById('modalBattery').textContent = device.battery;
    document.getElementById('modalCamera').textContent = device.camera;
    document.getElementById('modalConnectivity').textContent = device.connectivity;
    document.getElementById('modalPrice').textContent = device.price;
    document.getElementById('modalVFM').textContent = device.vfm;
    document.getElementById('modalJustification').textContent = device.justification;

    // Show modal
    const modal = document.getElementById('deviceModal');
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('deviceModal');
    modal.classList.remove('active');

    setTimeout(() => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }, 300);
}

// Close modal on Escape key
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});

// Prevent modal content click from closing modal
document.addEventListener('DOMContentLoaded', function () {
    const modalContent = document.querySelector('.modal-content');
    if (modalContent) {
        modalContent.addEventListener('click', function (event) {
            event.stopPropagation();
        });
    }
});
