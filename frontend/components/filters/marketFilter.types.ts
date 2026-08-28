export interface MarketFilterValues {
  tradeType: string;
  propertyType: string;
  priceRange: string;
  rentDepositRange: string;
  rentMonthlyRange: string;
  sizeRange: string;
  buildingAge: string;
  roomsCount: string;
  province: string;
  city: string;
  region: string;
  district: string;
}

export interface ActiveMarketFilterTag {
  key: keyof MarketFilterValues;
  label: string;
  displayValue: string;
}

export const DEFAULT_MARKET_FILTER_VALUES: MarketFilterValues = {
  tradeType: "",
  propertyType: "none",
  priceRange: "none",
  rentDepositRange: "none",
  rentMonthlyRange: "none",
  sizeRange: "none",
  buildingAge: "none",
  roomsCount: "none",
  province: "",
  city: "",
  region: "همه",
  district: "none",
};

export const PROPERTY_TYPE_OPTIONS = [
  { value: "none", label: "همه" },
  { value: "apartment", label: "آپارتمان" },
  { value: "villa", label: "ویلایی" },
  { value: "land", label: "زمین" },
  { value: "commercial", label: "تجاری" },
];

export const PRICE_RANGE_OPTIONS = [
  { value: "none", label: "همه" },
  { value: "0-5", label: "تا ۵ میلیارد" },
  { value: "5-10", label: "۵-۱۰ میلیارد" },
  { value: "10-20", label: "۱۰-۲۰ میلیارد" },
  { value: "20+", label: "بالای ۲۰ میلیارد" },
];

export const RENT_DEPOSIT_RANGE_OPTIONS = [
  { value: "none", label: "همه" },
  { value: "0-500", label: "تا ۵۰۰ میلیون" },
  { value: "500-1000", label: "۵۰۰ تا ۱ میلیارد" },
  { value: "1000-2000", label: "۱ تا ۲ میلیارد" },
  { value: "2000+", label: "بالای ۲ میلیارد" },
];

export const RENT_MONTHLY_RANGE_OPTIONS = [
  { value: "none", label: "همه" },
  { value: "0-10", label: "تا ۱۰ میلیون" },
  { value: "10-20", label: "۱۰ تا ۲۰ میلیون" },
  { value: "20-50", label: "۲۰ تا ۵۰ میلیون" },
  { value: "50+", label: "بالای ۵۰ میلیون" },
];

export const SIZE_RANGE_OPTIONS = [
  { value: "none", label: "همه" },
  { value: "0-75", label: "زیر ۷۵ متر" },
  { value: "75-120", label: "۷۵-۱۲۰ متر" },
  { value: "120-200", label: "۱۲۰-۲۰۰ متر" },
  { value: "200+", label: "بالای ۲۰۰ متر" },
];

export const BUILDING_AGE_OPTIONS = [
  { value: "none", label: "همه" },
  { value: "0-5", label: "نوساز (۰-۵ سال)" },
  { value: "5-10", label: "۵-۱۰ سال" },
  { value: "10+", label: "۱۰ سال به بالا" },
];

export const ROOMS_COUNT_OPTIONS = [
  { value: "none", label: "همه" },
  { value: "1", label: "۱ خواب" },
  { value: "2", label: "۲ خواب" },
  { value: "3", label: "۳+ خواب" },
];

export const PROVINCE_NAMES = [
  "همه استان‌ها",
  "آذربایجان شرقی",
  "آذربایجان غربی",
  "اردبیل",
  "اصفهان",
  "البرز",
  "بوشهر",
  "تهران",
  "چهارمحال و بختیاری",
  "خراسان جنوبی",
  "خراسان رضوی",
  "خراسان شمالی",
  "خوزستان",
  "زنجان",
  "سمنان",
  "سیستان و بلوچستان",
  "فارس",
  "قزوین",
  "قم",
  "کردستان",
  "کرمان",
  "کرمانشاه",
  "کهگیلویه و بویراحمد",
  "گلستان",
  "گیلان",
  "لرستان",
  "مازندران",
  "مرکزی",
  "هرمزگان",
  "همدان",
  "یزد",
];