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
