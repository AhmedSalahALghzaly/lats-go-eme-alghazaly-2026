export const translations = {
  en: {
    // App
    appName: 'Al-Ghzaly',
    appTagline: 'Auto Parts Store',
    
    // Navigation
    home: 'Home',
    categories: 'Categories',
    cart: 'Cart',
    profile: 'Profile',
    search: 'Search',
    
    // Home
    welcome: 'Welcome to Al-Ghzaly',
    searchPlaceholder: 'Search for parts, brands, categories...',
    shopByCategory: 'Shop by Category',
    carBrands: 'Car Brands',
    productBrands: 'Product Brands',
    viewAll: 'View All',
    
    // Categories
    allCategories: 'All Categories',
    subcategories: 'Subcategories',
    
    // Products
    products: 'Products',
    noProducts: 'No products found',
    price: 'Price',
    addToCart: 'Add to Cart',
    outOfStock: 'Out of Stock',
    sku: 'SKU',
    description: 'Description',
    compatibleWith: 'Compatible with',
    
    // Cart
    myCart: 'My Cart',
    emptyCart: 'Your cart is empty',
    total: 'Total',
    checkout: 'Checkout',
    removeItem: 'Remove',
    quantity: 'Quantity',
    continueShopping: 'Continue Shopping',
    
    // Orders
    placeOrder: 'Place Order',
    shippingAddress: 'Shipping Address',
    phone: 'Phone Number',
    notes: 'Notes (Optional)',
    orderPlaced: 'Order Placed Successfully!',
    myOrders: 'My Orders',
    orderDate: 'Order Date',
    orderStatus: 'Status',
    orderTotal: 'Total',
    pending: 'Pending',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    
    // Auth
    login: 'Login',
    logout: 'Logout',
    loginWithGoogle: 'Sign in with Google',
    loginRequired: 'Please login to continue',
    welcomeBack: 'Welcome back',
    
    // Profile
    myProfile: 'My Profile',
    settings: 'Settings',
    darkMode: 'Dark Mode',
    language: 'Language',
    
    // Search
    advancedSearch: 'Advanced Search',
    filterByBrand: 'Filter by Car Brand',
    filterByCategory: 'Filter by Category',
    filterByProductBrand: 'Filter by Product Brand',
    priceRange: 'Price Range',
    applyFilters: 'Apply Filters',
    clearFilters: 'Clear Filters',
    searchResults: 'Search Results',
    
    // Common
    loading: 'Loading...',
    error: 'An error occurred',
    retry: 'Retry',
    cancel: 'Cancel',
    save: 'Save',
    confirm: 'Confirm',
    back: 'Back',
  },
  ar: {
    // App
    appName: 'الغزالي',
    appTagline: 'متجر قطع غيار السيارات',
    
    // Navigation
    home: 'الرئيسية',
    categories: 'الفئات',
    cart: 'السلة',
    profile: 'الملف الشخصي',
    search: 'بحث',
    
    // Home
    welcome: 'مرحباً بك في الغزالي',
    searchPlaceholder: 'ابحث عن قطع غيار، علامات تجارية...',
    shopByCategory: 'تسوق حسب الفئة',
    carBrands: 'ماركات السيارات',
    productBrands: 'علامات المنتجات',
    viewAll: 'عرض الكل',
    
    // Categories
    allCategories: 'جميع الفئات',
    subcategories: 'الفئات الفرعية',
    
    // Products
    products: 'المنتجات',
    noProducts: 'لا توجد منتجات',
    price: 'السعر',
    addToCart: 'أضف إلى السلة',
    outOfStock: 'غير متوفر',
    sku: 'رقم المنتج',
    description: 'الوصف',
    compatibleWith: 'متوافق مع',
    
    // Cart
    myCart: 'سلتي',
    emptyCart: 'سلتك فارغة',
    total: 'الإجمالي',
    checkout: 'إتمام الشراء',
    removeItem: 'حذف',
    quantity: 'الكمية',
    continueShopping: 'متابعة التسوق',
    
    // Orders
    placeOrder: 'تقديم الطلب',
    shippingAddress: 'عنوان الشحن',
    phone: 'رقم الهاتف',
    notes: 'ملاحظات (اختياري)',
    orderPlaced: 'تم تقديم الطلب بنجاح!',
    myOrders: 'طلباتي',
    orderDate: 'تاريخ الطلب',
    orderStatus: 'الحالة',
    orderTotal: 'الإجمالي',
    pending: 'قيد الانتظار',
    processing: 'قيد المعالجة',
    shipped: 'تم الشحن',
    delivered: 'تم التوصيل',
    
    // Auth
    login: 'تسجيل الدخول',
    logout: 'تسجيل الخروج',
    loginWithGoogle: 'تسجيل الدخول بجوجل',
    loginRequired: 'يرجى تسجيل الدخول للمتابعة',
    welcomeBack: 'مرحباً بعودتك',
    
    // Profile
    myProfile: 'ملفي الشخصي',
    settings: 'الإعدادات',
    darkMode: 'الوضع الداكن',
    language: 'اللغة',
    
    // Search
    advancedSearch: 'بحث متقدم',
    filterByBrand: 'فلتر حسب ماركة السيارة',
    filterByCategory: 'فلتر حسب الفئة',
    filterByProductBrand: 'فلتر حسب علامة المنتج',
    priceRange: 'نطاق السعر',
    applyFilters: 'تطبيق الفلاتر',
    clearFilters: 'مسح الفلاتر',
    searchResults: 'نتائج البحث',
    
    // Common
    loading: 'جاري التحميل...',
    error: 'حدث خطأ',
    retry: 'إعادة المحاولة',
    cancel: 'إلغاء',
    save: 'حفظ',
    confirm: 'تأكيد',
    back: 'رجوع',
  }
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;
