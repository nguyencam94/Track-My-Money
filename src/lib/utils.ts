import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  // Directly use the number as 'thousands'
  return new Intl.NumberFormat('vi-VN').format(amount) + 'k';
}

export function numberToVietnameseWords(number: number): string {
  if (number === 0) return 'Không nghìn đồng';
  // Note: We treat the input number as 'thousands' of VND
  const actualValue = Math.abs(number) * 1000;
  
  if (actualValue > 1000000000000) return 'Số quá lớn';

  const units = ['', 'nghìn', 'triệu', 'tỷ'];
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  let result = '';
  let unitIndex = 0;

  let tempNumber = actualValue;

  while (tempNumber > 0) {
    const chunk = tempNumber % 1000;
    if (chunk > 0) {
      let chunkText = '';
      const hundred = Math.floor(chunk / 100);
      const ten = Math.floor((chunk % 100) / 10);
      const unit = chunk % 10;

      if (hundred > 0) {
        chunkText += digits[hundred] + ' trăm ';
      } else if (result !== '') {
        chunkText += 'không trăm ';
      }

      if (ten > 1) {
        chunkText += digits[ten] + ' mươi ';
        if (unit === 1) chunkText += 'mốt';
        else if (unit === 5) chunkText += 'lăm';
        else if (unit > 0) chunkText += digits[unit];
      } else if (ten === 1) {
        chunkText += 'mười ';
        if (unit === 5) chunkText += 'lăm';
        else if (unit > 0) chunkText += digits[unit];
      } else if (ten === 0 && unit > 0) {
        if (hundred > 0 || result !== '') chunkText += 'linh ';
        chunkText += digits[unit];
      }

      result = chunkText + ' ' + units[unitIndex] + ' ' + result;
    }
    tempNumber = Math.floor(tempNumber / 1000);
    unitIndex++;
  }

  return (number < 0 ? 'Âm ' : '') + result.trim().charAt(0).toUpperCase() + result.trim().slice(1) + ' đồng';
}

export function getCategoryColor(category: string) {
  const categories = [
    { bg: 'bg-blue-50', icon: 'bg-blue-100 text-blue-600', text: 'text-blue-900 border-blue-200' },
    { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', text: 'text-purple-900 border-purple-200' },
    { bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-600', text: 'text-amber-900 border-amber-200' },
    { bg: 'bg-rose-50', icon: 'bg-rose-100 text-rose-600', text: 'text-rose-900 border-rose-200' },
    { bg: 'bg-indigo-50', icon: 'bg-indigo-100 text-indigo-600', text: 'text-indigo-900 border-indigo-200' },
    { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', text: 'text-emerald-900 border-emerald-200' },
    { bg: 'bg-sky-50', icon: 'bg-sky-100 text-sky-600', text: 'text-sky-900 border-sky-200' },
    { bg: 'bg-pink-50', icon: 'bg-pink-100 text-pink-600', text: 'text-pink-900 border-pink-200' },
    { bg: 'bg-orange-50', icon: 'bg-orange-100 text-orange-600', text: 'text-orange-900 border-orange-200' },
    { bg: 'bg-teal-50', icon: 'bg-teal-100 text-teal-600', text: 'text-teal-900 border-teal-200' }
  ];
  
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % categories.length;
  return categories[index];
}
