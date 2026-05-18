export const BANK_LIST = [
  { id: 'MB', name: 'Ngân hàng Quân Đội', shortName: 'MB Bank' },
  { id: 'VCB', name: 'Ngân hàng Ngoại Thương', shortName: 'Vietcombank' },
  { id: 'TCB', name: 'Ngân hàng Kỹ Thương', shortName: 'Techcombank' },
  { id: 'ACB', name: 'Ngân hàng Á Châu', shortName: 'ACB' },
  { id: 'VPB', name: 'Ngân hàng Việt Nam Thịnh Vượng', shortName: 'VPBank' },
  { id: 'TPB', name: 'Ngân hàng Tiên Phong', shortName: 'TPBank' },
  { id: 'STB', name: 'Ngân hàng Sài Gòn Thương Tín', shortName: 'Sacombank' },
  { id: 'VIB', name: 'Ngân hàng Quốc Tế', shortName: 'VIB' },
  { id: 'MSB', name: 'Ngân hàng Hàng Hải', shortName: 'MSB' },
  { id: 'HDB', name: 'Ngân hàng Phát Triển TP.HCM', shortName: 'HDBank' },
  { id: 'OCB', name: 'Ngân hàng Phương Đông', shortName: 'OCB' },
  { id: 'BIDV', name: 'Ngân hàng Đầu Tư và Phát Triển', shortName: 'BIDV' },
  { id: 'CTG', name: 'Ngân hàng Công Thương', shortName: 'VietinBank' },
  { id: 'AGR', name: 'Ngân hàng Nông Nghiệp', shortName: 'Agribank' },
  { id: 'SHB', name: 'Ngân hàng Sài Gòn - Hà Nội', shortName: 'SHB' },
];

export function generateQRUrl({ bankId, account, accountName, amount, description }) {
  return `https://img.vietqr.io/image/${bankId}-${account}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(accountName)}`;
}

export function openBankingApp({ bankId, account, accountName, amount, description }) {
  const url = `https://dl.vietqr.io/pay?app=UNIVERSAL&amount=${amount}&description=${encodeURIComponent(description)}&account=${account}&bank=${bankId}`;

  window.open(url, '_blank');
}
